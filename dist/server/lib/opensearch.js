import * as fs from 'fs';
import * as https from 'https';

import { env } from '@/env.mjs';
import { prisma } from '@/server/config/prisma';
// 공유 Prisma 인스턴스 사용
import { SearchSessionService } from '@/server/services/search-session.service';

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
    this.searchSessionService = new SearchSessionService(prisma);
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
    const checkSessionStatus = async () => {
      var _a;
      if (!searchId) return true;
      try {
        const session =
          await this.searchSessionService.findBySearchId(searchId);
        console.log('[ScrollSearch] Session check result:', {
          searchId,
          status:
            session === null || session === void 0 ? void 0 : session.status,
          exists: !!session,
          lastActivityAt:
            session === null || session === void 0
              ? void 0
              : session.lastActivityAt,
          currentTime: new Date().toISOString(),
          checkPoint:
            (_a = new Error().stack) === null || _a === void 0
              ? void 0
              : _a.split('\n')[2],
        });
        if (!session || session.status !== 'ACTIVE') {
          console.log(`[ScrollSearch] Session ${searchId} is not active:`, {
            status:
              session === null || session === void 0 ? void 0 : session.status,
            lastCheck: new Date().toISOString(),
            reason: !session ? 'Session not found' : 'Status not active',
          });
          shouldStop = true;
          return false;
        }
        return true;
      } catch (error) {
        console.error('[ScrollSearch] Error checking session status:', {
          error,
          searchId,
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined,
        });
        shouldStop = true;
        return false;
      }
    };
    try {
      // 초기 세션 상태 확인
      if (!(await checkSessionStatus())) {
        console.log('[ScrollSearch] Initial session check failed');
        return { hits: [], total: 0, scrollId: undefined };
      }
      console.log('[ScrollSearch] Search request:', {
        index,
        body: JSON.stringify(body, null, 2),
        page,
        pageSize,
      });
      // 초기 검색
      console.log('[ScrollSearch] Initiating initial scroll search');
      const response = await this.request({
        path: `/${index}/_search?scroll=${scrollTime}&size=${size}`,
        method: 'POST',
        body,
      });
      // 초기 응답 후 즉시 세션 상태 재확인
      if (!(await checkSessionStatus())) {
        console.log('[ScrollSearch] Session cancelled after initial response');
        return { hits: [], total: 0, scrollId: undefined };
      }
      console.log('[ScrollSearch] Initial response:', {
        total: response.hits.total.value,
        hitsLength: response.hits.hits.length,
        scrollId: response._scroll_id,
      });
      currentScrollId = response._scroll_id;
      let hits = response.hits.hits;
      const total = response.hits.total.value;
      // 현재 페이지에 도달할 때까지 스크롤
      const targetPage = page;
      let currentPage = 1;
      let allHits = [...hits];
      while (currentPage < targetPage && hits.length > 0 && !shouldStop) {
        // 매 스크롤 전 세션 상태 확인
        if (!(await checkSessionStatus())) {
          console.log('[ScrollSearch] Session check failed during scroll');
          return { hits: [], total: 0, scrollId: undefined };
        }
        try {
          if (!currentScrollId) {
            console.log('[ScrollSearch] No scroll ID available, stopping');
            break;
          }
          const scrollResponse = await this.scroll(currentScrollId, scrollTime);
          // 스크롤 응답 후 즉시 세션 상태 재확인
          if (!(await checkSessionStatus())) {
            console.log('[ScrollSearch] Session cancelled during scroll');
            return { hits: [], total: 0, scrollId: undefined };
          }
          console.log('[ScrollSearch] Scroll response:', {
            page: currentPage + 1,
            hitsLength: scrollResponse.hits.hits.length,
            scrollId: scrollResponse._scroll_id,
          });
          hits = scrollResponse.hits.hits;
          currentScrollId = scrollResponse._scroll_id;
          if (!scrollResponse.hits.hits.length) {
            console.log('[ScrollSearch] No more hits, stopping scroll');
            break;
          }
          allHits = [...allHits, ...hits];
          currentPage++;
          // 매 50건마다 세션 상태 재확인 (더 자주 체크)
          if (allHits.length % 5 === 0 && !(await checkSessionStatus())) {
            console.log('[ScrollSearch] Session cancelled during batch check');
            return { hits: [], total: 0, scrollId: undefined };
          }
        } catch (error) {
          console.error('[ScrollSearch] Scroll request failed:', error);
          shouldStop = true;
          throw error;
        }
      }
      if (shouldStop) {
        console.log('[ScrollSearch] Search was cancelled');
        return { hits: [], total: 0, scrollId: undefined };
      }
      // 최종 결과 반환 전 마지막 상태 체크
      if (!(await checkSessionStatus())) {
        console.log(
          '[ScrollSearch] Session cancelled before returning results'
        );
        return { hits: [], total: 0, scrollId: undefined };
      }
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedHits = allHits.slice(start, Math.min(end, allHits.length));
      console.log('[ScrollSearch] Final result:', {
        totalHits: allHits.length,
        paginatedHitsLength: paginatedHits.length,
        start,
        end,
      });
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
