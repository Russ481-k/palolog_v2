import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

import { columnNames } from '@/features/monitoring/colNameList';
import { zPaloLogs, zPaloLogsParams } from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';
import { OpenSearchClient } from '@/server/lib/opensearch';

dayjs.extend(utc);
dayjs.extend(timezone);

type OpenSearchHit = {
  _source: Record<string, string | number | null> | undefined;
  sort: [string | number | null];
};

type OpenSearchResponse = {
  hits: {
    total: {
      value: number;
    };
    hits: OpenSearchHit[];
  };
  _scroll_id: string;
};

type QueryCondition =
  | { match: Record<string, string | number> }
  | {
      range: Record<
        string,
        {
          gte?: string | number;
          lte?: string | number;
          format: string;
          time_zone: string;
        }
      >;
    }
  | { term: Record<string, string | number> }
  | { exists: { field: string } }
  | BoolQueryCondition;

interface BoolQueryCondition {
  bool: BoolQuery;
}

interface BoolQuery {
  must?: QueryCondition[];
  should?: QueryCondition[];
  must_not?: QueryCondition[];
  filter?: QueryCondition[];
}

interface SearchBody {
  size?: number;
  slice?: {
    id: string;
    max: number;
  };
  query: { bool?: BoolQuery; match_all?: object };
  sort?: Record<string, { order: 'asc' | 'desc' }>[];
  search_after?: [string | number | null];
}

export async function searchOpenSearchWithScroll(
  searchBody: SearchBody,
  menu?: string,
  page: number = 1,
  size: number = 100
): Promise<{
  initialResponse: OpenSearchResponse;
  scrollResponse: OpenSearchHit[];
}> {
  const client = OpenSearchClient.getInstance();
  const scrollSize = 1000;
  const start = (page - 1) * size;
  const scrollsNeeded = Math.floor(start / scrollSize);

  try {
    const searchPath = '/*vision-seoul-fw-seoulfw*/_search?scroll=1m';

    const modifiedSearchBody = {
      size: scrollSize,
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  ...(
                    searchBody.query.bool?.must?.[0] as {
                      range: {
                        '@timestamp': {
                          gte: string;
                          lte: string;
                          format: string;
                          time_zone: string;
                        };
                      };
                    }
                  )?.range?.['@timestamp'],
                },
              },
            },
            {
              match: {
                logType: menu,
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
    };

    // 초기 검색 요청
    const initialResponse = await client.request<OpenSearchResponse>({
      path: searchPath,
      method: 'POST',
      body: modifiedSearchBody,
    });

    if (!initialResponse?.hits?.hits) {
      console.error('Invalid response format:', initialResponse);
      throw new Error('Invalid response format from OpenSearch');
    }

    let scrollId = initialResponse._scroll_id;
    let currentScrolls = 0;
    let targetHits: OpenSearchHit[] = [];

    // 목표 페이지까지 스크롤
    while (currentScrolls < scrollsNeeded && scrollId) {
      const scrollResponse = await client.request<OpenSearchResponse>({
        path: `/_search/scroll?scroll=1m&scroll_id=${encodeURIComponent(scrollId)}`,
        method: 'GET',
      });

      if (!scrollResponse?.hits?.hits) {
        console.error('Invalid scroll response format:', scrollResponse);
        break;
      }

      if (scrollResponse.hits.hits.length === 0) break;

      scrollId = scrollResponse._scroll_id;
      currentScrolls++;
    }

    // 목표 페이지의 데이터 수집
    if (scrollId) {
      const finalScrollResponse = await client.request<OpenSearchResponse>({
        path: `/_search/scroll?scroll=1m&scroll_id=${encodeURIComponent(scrollId)}`,
        method: 'GET',
      });

      if (!finalScrollResponse?.hits?.hits) {
        console.error(
          'Invalid final scroll response format:',
          finalScrollResponse
        );
        throw new Error('Invalid response format from OpenSearch scroll');
      }

      const offsetInLastBatch = start % scrollSize;
      targetHits = finalScrollResponse.hits.hits.slice(
        offsetInLastBatch,
        offsetInLastBatch + size
      );
    } else {
      // 초기 응답에서 필요한 데이터 추출
      targetHits = initialResponse.hits.hits.slice(start, start + size);
    }

    // scroll 컨텍스트 정리
    if (scrollId) {
      try {
        await client.request({
          path: `/_search/scroll?scroll_id=${encodeURIComponent(scrollId)}`,
          method: 'DELETE',
        });
      } catch (clearError) {
        console.error('Error clearing scroll context:', clearError);
        // 스크롤 컨텍스트 정리 실패는 결과에 영향을 주지 않으므로 무시
      }
    }

    return {
      initialResponse: {
        ...initialResponse,
        hits: {
          ...initialResponse.hits,
          hits: targetHits,
        },
      },
      scrollResponse: targetHits,
    };
  } catch (error) {
    console.error('OpenSearch Error:', error);
    throw new Error('Failed to fetch data from OpenSearch');
  }
}

export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      zPaloLogsParams().extend({
        menu: z.enum(['TRAFFIC', 'THREAT', 'SYSTEM']).optional(),
      })
    )
    .output(
      z.object({
        logs: z.array(zPaloLogs().nullish()),
        pagination: z.object({
          currentPage: z.number().min(1).default(1),
          pageLength: z.number().min(0),
          totalCnt: z.number().min(0).default(0),
        }),
      })
    )
    .query(async ({ input }) => {
      try {
        const timeFrom = dayjs.tz(input.timeFrom, 'Asia/Seoul');
        const timeTo = dayjs.tz(input.timeTo, 'Asia/Seoul');

        console.log('Search Time Range (KST):', {
          from: timeFrom.format('YYYY-MM-DD HH:mm:ss'),
          to: timeTo.format('YYYY-MM-DD HH:mm:ss'),
        });

        const searchBody: SearchBody = {
          size: input.limit,
          query: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: timeFrom.toISOString(),
                      lte: timeTo.toISOString(),
                      format: 'strict_date_time',
                      time_zone: '+09:00',
                    },
                  },
                },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
        };

        const result = await searchOpenSearchWithScroll(
          searchBody,
          input.menu,
          input.currentPage,
          input.limit
        );

        return {
          logs: result.scrollResponse.map((hit) => ({
            ...columnNames.reduce((acc, col) => {
              let value = hit._source?.[col] || null;
              if (col === '@timestamp' && typeof value === 'string') {
                value = dayjs(value)
                  .tz('Asia/Seoul')
                  .format('YYYY-MM-DD HH:mm:ss');
              }
              return { ...acc, [col]: value };
            }, {}),
          })),
          pagination: {
            currentPage: input.currentPage,
            pageLength: Math.ceil(
              (result.initialResponse.hits.total.value || 0) / input.limit
            ),
            totalCnt: result.initialResponse.hits.total.value || 0,
          },
        };
      } catch (error) {
        console.error('Query Error:', error);
        throw new Error('Failed to fetch data');
      }
    }),
});
