import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as https from 'https';

import { env } from '@/env.mjs';
import { SearchSessionService } from '@/server/services/search-session.service';

const prisma = new PrismaClient();
export class OpenSearchClient {
  constructor() {
    const opensearchUrl = env.OPENSEARCH_URL.replace('https://', '');
    const opensearchPort = Number(env.OPENSEARCH_PORT);
    const opensearchUsername = env.OPENSEARCH_USERNAME;
    const opensearchPassword = env.OPENSEARCH_PASSWORD;
    this.baseOptions = {
      hostname: opensearchUrl,
      port: opensearchPort,
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' +
          Buffer.from(`${opensearchUsername}:${opensearchPassword}`).toString(
            'base64'
          ),
      },
      ca: fs.existsSync(env.CA_CERT_PATH)
        ? fs.readFileSync(env.CA_CERT_PATH)
        : undefined,
      rejectUnauthorized: false,
    };
    this.searchSessionService = new SearchSessionService();
  }
  static getInstance() {
    if (!OpenSearchClient.instance) {
      OpenSearchClient.instance = new OpenSearchClient();
    }
    return OpenSearchClient.instance;
  }
  async count(params) {
    return this.request({
      path: `/${params.index}/_count`,
      method: 'POST',
      body: params.body,
    });
  }
  async request({ path, method, body }) {
    const options = Object.assign(Object.assign({}, this.baseOptions), {
      path,
      method,
    });
    return new Promise((resolve, reject) => {
      console.log('Making OpenSearch request:', {
        path,
        method,
        hostname: options.hostname,
        port: options.port,
      });
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              console.error('OpenSearch request failed:', {
                statusCode: res.statusCode,
                data,
              });
              reject(
                new Error(
                  `OpenSearch request failed with status ${res.statusCode}: ${data}`
                )
              );
              return;
            }
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (e) {
            console.error('Failed to parse OpenSearch response:', e);
            reject(new Error(`Failed to parse OpenSearch response: ${e}`));
          }
        });
      });
      req.on('error', (e) => {
        console.error('OpenSearch request error:', e);
        reject(new Error(`OpenSearch request failed: ${e.message}`));
      });
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
  // 스크롤 검색 초기화
  async initScroll({ index, body, scrollTime = '1m', size = 1000 }) {
    const path = `/${index}/_search?scroll=${scrollTime}&size=${size}`;
    return this.request({
      path,
      method: 'POST',
      body,
    });
  }
  // 스크롤 계속
  async scroll(scrollId, scrollTime = '1m') {
    return this.request({
      path: '/_search/scroll',
      method: 'POST',
      body: {
        scroll: scrollTime,
        scroll_id: scrollId,
      },
    });
  }
  // 스크롤 종료
  async clearScroll(scrollId) {
    try {
      if (!scrollId) {
        return { succeeded: false };
      }
      await this.request({
        path: `/_search/scroll/${scrollId}`,
        method: 'DELETE',
      });
      return { succeeded: true };
    } catch (error) {
      console.error('Failed to clear scroll context:', error);
      return { succeeded: false };
    }
  }
  // 전체 결과를 가져오는 헬퍼 메서드
  async scrollAll(options) {
    try {
      const initialResponse = await this.initScroll(options);
      let results = [...initialResponse.hits.hits];
      let scrollId = initialResponse._scroll_id;
      while (true) {
        const response = await this.scroll(scrollId);
        if (!response.hits.hits.length) break;
        results = [...results, ...response.hits.hits];
        scrollId = response._scroll_id;
      }
      await this.clearScroll(scrollId);
      return results;
    } catch (error) {
      console.error('Scroll search error:', error);
      throw error;
    }
  }
  // 페이지네이션된 스크롤 검색
  async scrollWithPagination({
    index,
    body,
    page,
    pageSize,
    scrollTime = '2m',
    size = 1000,
    searchId,
  }) {
    let currentScrollId;
    let shouldStop = false;
    try {
      console.log(
        `[ScrollSearch] Starting search with searchId: ${searchId}, page: ${page}`
      );
      const checkSessionStatus = async () => {
        if (!searchId) return true;
        console.log(
          `[ScrollSearch] Checking session status for searchId: ${searchId}`
        );
        try {
          // 세션 서비스를 통해 상태 체크
          const session = await prisma.$transaction(
            async (tx) => {
              return tx.searchSession.findUnique({
                where: { searchId },
                select: {
                  id: true,
                  status: true,
                  searchId: true,
                },
              });
            },
            {
              isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
              timeout: 3000, // 3초 타임아웃
            }
          );
          console.log(`[ScrollSearch] Session lookup result:`, session);
          if (!session) {
            console.log(`[ScrollSearch] Session not found, stopping search`);
            shouldStop = true;
            return false;
          }
          const isCancelled = session.status !== 'ACTIVE';
          if (isCancelled) {
            console.log(
              `[ScrollSearch] Search cancelled or completed - SessionId: ${session.id}, Status: ${session.status}`
            );
            shouldStop = true;
            if (currentScrollId) {
              console.log(
                `[ScrollSearch] Clearing scroll ID: ${currentScrollId}`
              );
              try {
                await this.clearScroll(currentScrollId);
                console.log('[ScrollSearch] Successfully cleared scroll');
              } catch (error) {
                console.error('[ScrollSearch] Error clearing scroll:', error);
              } finally {
                currentScrollId = undefined;
              }
            }
            return false;
          }
          return true;
        } catch (error) {
          console.error('[ScrollSearch] Error checking session status:', error);
          shouldStop = true;
          return false;
        }
      };
      // 초기 세션 상태 확인
      if (!(await checkSessionStatus())) {
        console.log(
          '[ScrollSearch] Initial session check failed, stopping search'
        );
        return { hits: [], total: 0, scrollId: undefined };
      }
      // 초기 검색
      console.log('[ScrollSearch] Initiating initial scroll search');
      const response = await this.initScroll({
        index,
        body,
        scrollTime,
        size,
      });
      currentScrollId = response._scroll_id;
      let hits = response.hits.hits;
      const total = response.hits.total.value;
      // 검색이 취소된 경우 즉시 리소스 정리 후 반환
      if (!(await checkSessionStatus())) {
        return { hits: [], total: 0, scrollId: undefined };
      }
      // 현재 페이지에 도달할 때까지 스크롤
      const targetPage = page;
      let currentPage = 1;
      let allHits = [...hits];
      while (currentPage < targetPage && hits.length > 0 && !shouldStop) {
        // 매 스크롤 요청 전에 상태 확인
        if (!(await checkSessionStatus())) {
          console.log('[ScrollSearch] Session is not active, stopping scroll');
          return { hits: [], total: 0, scrollId: undefined };
        }
        try {
          if (!currentScrollId) {
            console.log('[ScrollSearch] No scroll ID available, stopping');
            break;
          }
          const scrollResponse = await this.scroll(currentScrollId, scrollTime);
          hits = scrollResponse.hits.hits;
          currentScrollId = scrollResponse._scroll_id;
          // 스크롤 응답 후에도 상태 확인
          if (!(await checkSessionStatus())) {
            console.log(
              '[ScrollSearch] Session cancelled after scroll response'
            );
            return { hits: [], total: 0, scrollId: undefined };
          }
          if (!scrollResponse.hits.hits.length) {
            console.log('[ScrollSearch] No more hits, stopping scroll');
            break;
          }
          allHits = [...allHits, ...hits];
          currentPage++;
        } catch (error) {
          console.error('[ScrollSearch] Scroll request failed:', error);
          shouldStop = true;
          throw error;
        }
      }
      if (shouldStop) {
        console.log('[ScrollSearch] Search stopped or cancelled');
        return { hits: [], total: 0, scrollId: undefined };
      }
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedHits = allHits.slice(start, Math.min(end, allHits.length));
      return {
        hits: paginatedHits,
        total,
        scrollId: currentScrollId,
      };
    } catch (error) {
      console.error('[ScrollSearch] Search error:', error);
      throw error;
    } finally {
      if (currentScrollId) {
        try {
          await this.clearScroll(currentScrollId);
        } catch (error) {
          console.error('[ScrollSearch] Error in final cleanup:', error);
        }
      }
    }
  }
}
// 로그 수집 관련 함수
export async function makeOpenSearchRequest(path, method, body) {
  const options = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: Number(env.OPENSEARCH_PORT),
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
    },
    rejectUnauthorized: false,
    timeout: 30000,
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            console.error('OpenSearch request failed:', {
              statusCode: res.statusCode,
              data,
              path,
              method,
            });
            reject(
              new Error(
                `OpenSearch request failed with status ${res.statusCode}: ${data}`
              )
            );
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          console.error('Failed to parse OpenSearch response:', e);
          reject(e);
        }
      });
    });
    req.on('error', (e) => {
      console.error('OpenSearch request error:', {
        error: e,
        path,
        method,
      });
      reject(e);
    });
    // 타임아웃 처리
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
