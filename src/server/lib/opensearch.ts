import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as https from 'https';

import { env } from '@/env.mjs';

interface BoolQuery {
  must?: QueryCondition[];
  should?: QueryCondition[];
  must_not?: QueryCondition[];
  filter?: QueryCondition[];
}

interface QueryCondition {
  match?: Record<string, string | number>;
  range?: Record<
    string,
    {
      gte?: string | number;
      lte?: string | number;
      format?: string;
      time_zone?: string;
    }
  >;
  term?: Record<string, string | number>;
  exists?: { field: string };
  bool?: BoolQuery;
}

export interface SearchBody {
  size?: number;
  slice?: {
    id: string;
    max: number;
  };
  query: { bool?: BoolQuery; match_all?: object };
  sort?: Record<string, { order: 'asc' | 'desc' }>[];
  search_after?: [string | number | null];
}

export interface OpenSearchOptions {
  path: string;
  method: string;
  body?: object;
}

type OpenSearchHit = {
  _source: Record<string, string | number | null> | undefined;
  sort: [string | number | null];
};

// 전역 상태 관리를 위한 이벤트 이미터
export const progressEmitter = new EventEmitter();
export const PROGRESS_EVENT = 'progress'; // 기존 'progress' 이벤트명 사용

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
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // 편의 메서드 추가
  async search<T>(index: string, body: object): Promise<T> {
    return this.request<T>({
      path: `/${index}/_search`,
      method: 'POST',
      body,
    });
  }

  async count<T>(index: string, body?: object): Promise<T> {
    return this.request<T>({
      path: `/${index}/_count`,
      method: 'POST',
      body,
    });
  }

  async scroll<T>(scrollId: string, scrollTime: string = '1m'): Promise<T> {
    return this.request<T>({
      path: '/_search/scroll',
      method: 'POST',
      body: {
        scroll: scrollTime,
        scroll_id: scrollId,
      },
    });
  }

  private emitProgress(
    progress: number,
    total: number,
    status: 'loading' | 'complete' | 'error',
    processedCount: number
  ) {
    const progressData = {
      progress,
      current: processedCount,
      total,
      status,
    };
    console.log('Emitting progress event:', progressData);
    progressEmitter.emit(PROGRESS_EVENT, progressData);
  }

  async searchWithPagination<
    T extends { hits: { hits: OpenSearchHit[]; total: { value: number } } },
  >({
    path,
    body,
    page = 1,
    size = 100,
  }: {
    path: string;
    body: SearchBody | Record<string, unknown>;
    page?: number;
    size?: number;
    onProgress?: (progress: number) => void;
  }): Promise<T> {
    try {
      const targetStart = (page - 1) * size;
      const batchSize = 1000;
      let processedCount = 0;

      // 초기 상태
      this.emitProgress(0, 0, 'loading', processedCount);

      // count 요청 수정
      const countResponse = await this.request<{
        count?: number;
        _count?: number;
      }>({
        path: path.replace('_search', '_count'),
        method: 'POST',
        body: {
          query: body.query || { match_all: {} }, // query�� 없는 경우 처리
        },
      });

      // count 값 확인 로직 개선
      const totalHits = countResponse.count || countResponse._count;
      if (typeof totalHits !== 'number') {
        console.error('Invalid count response:', countResponse);
        throw new Error('Invalid count response from OpenSearch');
      }

      const totalPages = Math.ceil(totalHits / size);
      console.log(`Total hits: ${totalHits}, Pages: ${totalPages}`); // 디버깅용

      // 일반 페이징
      if (totalPages <= 100) {
        const result = await this.request<T>({
          path,
          method: 'POST',
          body: {
            ...body,
            from: targetStart,
            size,
          },
        });
        this.emitProgress(100, totalHits, 'complete', processedCount);
        return result;
      }

      // 스크롤 검색
      const initialResponse = await this.request<T & { _scroll_id: string }>({
        path: `${path}?scroll=5m`,
        method: 'POST',
        body: {
          ...body,
          size: batchSize,
        },
      });

      if (!initialResponse?._scroll_id || !initialResponse?.hits?.hits) {
        throw new Error('Invalid scroll response');
      }

      let scrollId = initialResponse._scroll_id;
      let allHits: T['hits']['hits'] = initialResponse.hits.hits;
      const targetEnd = targetStart + size;

      // 초기 진행률 전송
      this.emitProgress(0, 0, 'loading', processedCount);

      while (allHits.length < targetEnd) {
        const scrollResponse = await this.request<T & { _scroll_id: string }>({
          path: '/_search/scroll',
          method: 'POST',
          body: { scroll: '5m', scroll_id: scrollId },
        });

        if (!scrollResponse.hits?.hits?.length) break;

        scrollId = scrollResponse._scroll_id;
        allHits = [...allHits, ...scrollResponse.hits.hits];

        processedCount = allHits.length;
        const progress = Math.floor((processedCount / targetEnd) * 100);

        // 진행률 업데이트
        this.emitProgress(
          Math.min(progress, 95),
          targetEnd,
          'loading',
          processedCount
        );

        // 디버깅
        await new Promise((resolve) => setTimeout(resolve, 100)); // 진행률 업데이트 간격 조절
      }

      // 완료
      this.emitProgress(100, targetEnd, 'complete', processedCount);

      // 비동기로 스크롤 정리
      this.request({
        path: '/_search/scroll',
        method: 'DELETE',
        body: { scroll_id: scrollId },
      }).catch(console.error);

      return {
        ...initialResponse,
        hits: {
          ...initialResponse.hits,
          total: { value: totalHits }, // count에서 얻은 값 사용
          hits: allHits.slice(
            targetStart % batchSize,
            (targetStart % batchSize) + size
          ),
        },
      } as T;
    } catch (error) {
      this.emitProgress(0, 0, 'error', 0);
      throw error;
    }
  }
}
