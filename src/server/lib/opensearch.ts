import * as fs from 'fs';
import * as https from 'https';

import { env } from '@/env.mjs';

export interface OpenSearchOptions {
  path: string;
  method: string;
  body?: object;
}

export interface ScrollSearchOptions {
  index: string;
  body: object;
  scrollTime?: string;
  size?: number;
}

export interface PaginatedScrollOptions extends ScrollSearchOptions {
  page: number;
  pageSize: number;
}

export class OpenSearchClient {
  private static instance: OpenSearchClient;
  private readonly baseOptions: https.RequestOptions;

  private constructor() {
    this.baseOptions = {
      hostname: env.OPENSEARCH_URL.replace('https://', ''),
      port: Number(env.OPENSEARCH_PORT),
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' +
          Buffer.from(
            `${env.OPENSEARCH_USERNAME}:${env.OPENSEARCH_PASSWORD}`
          ).toString('base64'),
      },
      ca: fs.readFileSync('/home/vtek/palolog_v2/ca-cert.pem'),
      rejectUnauthorized: true,
    };
  }

  public static getInstance(): OpenSearchClient {
    if (!OpenSearchClient.instance) {
      OpenSearchClient.instance = new OpenSearchClient();
    }
    return OpenSearchClient.instance;
  }

  async request<T>({ path, method, body }: OpenSearchOptions): Promise<T> {
    const options: https.RequestOptions = {
      ...this.baseOptions,
      path,
      method,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`OpenSearch request failed with status ${res.statusCode}: ${data}`));
              return;
            }
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse OpenSearch response: ${e}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`OpenSearch request failed: ${e.message}`)));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // 스크롤 검색 초기화
  async initScroll({ index, body, scrollTime = '1m', size = 1000 }: ScrollSearchOptions) {
    const path = `/${index}/_search?scroll=${scrollTime}&size=${size}`;
    return this.request<any>({
      path,
      method: 'POST',
      body,
    });
  }

  // 스크롤 계속
  async scroll(scrollId: string, scrollTime = '1m') {
    return this.request<any>({
      path: '/_search/scroll',
      method: 'POST',
      body: {
        scroll: scrollTime,
        scroll_id: scrollId
      }
    });
  }

  // 스크롤 종료
  async clearScroll(scrollId: string) {
    return this.request<any>({
      path: '/_search/scroll',
      method: 'DELETE',
      body: {
        scroll_id: [scrollId]
      }
    });
  }

  // 전체 결과를 가져오는 헬퍼 메서드
  async scrollAll(options: ScrollSearchOptions): Promise<any[]> {
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
    scrollTime = '1m',
    size = 1000
  }: PaginatedScrollOptions): Promise<{
    hits: any[];
    total: number;
    scrollId?: string;
  }> {
    let currentScrollId: string | undefined;

    try {
      const start = (page - 1) * pageSize;
      const initialResponse = await this.initScroll({
        index,
        body: {
          ...body,
          size,
          track_total_hits: true
        },
        scrollTime,
        size
      });

      let results = [...initialResponse.hits.hits];
      currentScrollId = initialResponse._scroll_id;
      let currentPosition = 0;

      // 목표 위치까지 스크롤
      while (currentPosition + results.length < start && currentScrollId) {
        try {
          const response = await this.scroll(currentScrollId, scrollTime);
          if (!response?.hits?.hits?.length) break;

          currentPosition += results.length;
          results = response.hits.hits;
          currentScrollId = response._scroll_id;
        } catch (scrollError) {
          console.error('Scroll operation failed:', scrollError);
          break;
        }
      }

      // 현재 배치에서 필요한 부분만 추출
      const startInBatch = start - currentPosition;
      let pageResults = results.slice(startInBatch, startInBatch + pageSize);

      // 필요한 경우 추가 스크롤
      while (pageResults.length < pageSize && currentScrollId) {
        try {
          const response = await this.scroll(currentScrollId, scrollTime);
          if (!response?.hits?.hits?.length) break;

          const remaining = pageSize - pageResults.length;
          pageResults = [
            ...pageResults,
            ...response.hits.hits.slice(0, remaining)
          ];
          currentScrollId = response._scroll_id;
        } catch (scrollError) {
          console.error('Additional scroll operation failed:', scrollError);
          break;
        }
      }

      return {
        hits: pageResults,
        total: initialResponse.hits.total.value,
        scrollId: currentScrollId
      };

    } catch (error) {
      console.error('Paginated scroll search error:', error);
      throw error;
    } finally {
      // 스크롤 컨텍스트 정리
      if (currentScrollId) {
        try {
          await this.clearScroll(currentScrollId);
        } catch (clearError) {
          console.warn('Failed to clear scroll context:', clearError);
        }
      }
    }
  }
}
