import * as fs from 'fs';
import * as https from 'https';

import { env } from '@/env.mjs';
import { OpenSearchHit } from '@/types/project';

export interface OpenSearchOptions {
  hostname?: string;
  port?: number;
  path: string;
  method: string;
  body?: object;
  headers?: {
    'Content-Type': string;
    Authorization: string;
  };
  ca?: Buffer;
  rejectUnauthorized?: boolean;
}

export interface OpenSearchCountResponse {
  count?: number;
  index?: string;
  [key: string]: string | number | undefined;
}

export interface OpenSearchIndicesResponse {
  index: string;
  health: string;
  status: string;
  [key: string]: string | number | undefined;
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

export interface OpenSearchResponse {
  data?: string | null;
  firstReceiveTime?: string;
  lastReceiveTime?: string;
  searchAfter?: string[];
  hits: {
    total: {
      value: number;
      relation?: string;
    };
    hits: OpenSearchHit[];
  };
  _scroll_id: string;
  took?: number;
  timed_out?: boolean;
}

export interface ScrollResponse {
  hits: OpenSearchHit[];
  total: number;
  scrollId?: string;
}

export class OpenSearchClient {
  private static instance: OpenSearchClient;
  private readonly baseOptions: https.RequestOptions;

  private constructor() {
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
  }

  public static getInstance(): OpenSearchClient {
    if (!OpenSearchClient.instance) {
      OpenSearchClient.instance = new OpenSearchClient();
    }
    return OpenSearchClient.instance;
  }

  public async count(params: {
    index: string;
    body: object;
  }): Promise<{ count: number }> {
    return this.request<{ count: number }>({
      path: `/${params.index}/_count`,
      method: 'POST',
      body: params.body,
    });
  }

  async request<T>({ path, method, body }: OpenSearchOptions): Promise<T> {
    const options: https.RequestOptions = {
      ...this.baseOptions,
      path,
      method,
    };

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
  async initScroll({
    index,
    body,
    scrollTime = '1m',
    size = 1000,
  }: ScrollSearchOptions): Promise<OpenSearchResponse> {
    const path = `/${index}/_search?scroll=${scrollTime}&size=${size}`;
    return this.request<OpenSearchResponse>({
      path,
      method: 'POST',
      body,
    });
  }

  // 스크롤 계속
  async scroll(
    scrollId: string,
    scrollTime = '1m'
  ): Promise<OpenSearchResponse> {
    return this.request<OpenSearchResponse>({
      path: '/_search/scroll',
      method: 'POST',
      body: {
        scroll: scrollTime,
        scroll_id: scrollId,
      },
    });
  }

  // 스크롤 종료
  async clearScroll(scrollId: string): Promise<{ succeeded: boolean }> {
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
  async scrollAll(options: ScrollSearchOptions): Promise<OpenSearchHit[]> {
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
    size = 1000,
  }: PaginatedScrollOptions): Promise<ScrollResponse> {
    let currentScrollId: string | undefined;

    try {
      const start = (page - 1) * pageSize;
      const batchesNeeded = Math.floor(start / size);

      const initialResponse = await this.initScroll({
        index,
        body: {
          ...body,
          size,
          track_total_hits: true,
        },
        scrollTime,
        size,
      });

      let results = [...initialResponse.hits.hits];
      currentScrollId = initialResponse._scroll_id;

      // 필요한 배치만큼 스크롤
      for (let i = 0; i < batchesNeeded && currentScrollId; i++) {
        try {
          const response = await this.scroll(currentScrollId, scrollTime);
          if (!response?.hits?.hits?.length) break;

          results = response.hits.hits;
          currentScrollId = response._scroll_id;
        } catch (scrollError) {
          console.error('Scroll operation failed:', scrollError);
          break;
        }
      }

      // 현재 배치에서 필요한 부분 추출
      const offsetInBatch = start % size;
      let pageResults = results.slice(offsetInBatch, offsetInBatch + pageSize);

      // 현재 배치에서 부족한 경우 다음 배치 가져오기
      if (pageResults.length < pageSize && currentScrollId) {
        try {
          const response = await this.scroll(currentScrollId, scrollTime);
          if (response?.hits?.hits?.length) {
            const remaining = pageSize - pageResults.length;
            pageResults = [
              ...pageResults,
              ...response.hits.hits.slice(0, remaining),
            ];
          }
        } catch (scrollError) {
          console.error('Additional scroll operation failed:', scrollError);
        }
      }

      return {
        hits: pageResults,
        total: initialResponse.hits.total.value,
        scrollId: currentScrollId,
      };
    } catch (error) {
      console.error('Paginated scroll search error:', error);
      throw error;
    } finally {
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

// 로그 수집 관련 함수
export async function makeOpenSearchRequest<T>(
  path: string,
  method: string,
  body?: object
): Promise<T> {
  const options: OpenSearchOptions = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: Number(env.OPENSEARCH_PORT),
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
    },
    ca: fs.readFileSync('./ca-cert.pem'),
    rejectUnauthorized: true,
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
