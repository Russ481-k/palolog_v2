import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

import { columnNames } from '@/features/monitoring/colNameList';
import { zPaloLogs, zPaloLogsParams } from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';
import { OpenSearchClient } from '@/server/lib/opensearch';
import { parseWhereClause, buildOpenSearchQuery } from '@/server/lib/queryParser';

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

export type QueryCondition =
  | { match: Record<string, string | number> }
  | { multi_match: { query: string; fields: string[]; type: string } }
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
  minimum_should_match?: number;
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
  size: number = 100,
  onProgress?: (progress: {
    current: number;
    total: number;
    status: string;
  }) => void
): Promise<{
  initialResponse: OpenSearchResponse;
  scrollResponse: OpenSearchHit[];
}> {
  const client = OpenSearchClient.getInstance();
  const scrollSize = 10000;
  const start = (page - 1) * size;
  const scrollsNeeded = Math.floor(start / scrollSize);

  console.log('Search parameters:', {
    page,
    size,
    start,
    scrollsNeeded,
    scrollSize,
  });

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
                logType: menu ?? 'TRAFFIC',
              },
            },
            ...(searchBody.query.bool?.must?.slice(1) || []),
          ],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
    };

    console.log('Initial search body:', JSON.stringify(modifiedSearchBody, null, 2));
    console.log('Modified search body with search term:', JSON.stringify(modifiedSearchBody, null, 2));

    // 초기 검색 요청
    const initialResponse = await client.request<OpenSearchResponse>({
      path: searchPath,
      method: 'POST',
      body: modifiedSearchBody,
    });

    console.log('Initial response total hits:', initialResponse.hits.total.value);
    console.log('Initial response hits length:', initialResponse.hits.hits.length);

    if (!initialResponse?.hits?.hits) {
      console.error('Invalid response format:', initialResponse);
      throw new Error('Invalid response format from OpenSearch');
    }

    let scrollId = initialResponse._scroll_id;
    let currentScrolls = 0;
    let targetHits: OpenSearchHit[] = [];
    let allScrollResponses: OpenSearchHit[] = [...initialResponse.hits.hits];

    console.log('Starting scroll operations. ScrollId:', scrollId);

    // 목표 페이지까지 스크롤
    while (currentScrolls < scrollsNeeded && scrollId) {
      console.log(`Executing scroll ${currentScrolls + 1}/${scrollsNeeded}`);

      const scrollResponse = await client.request<OpenSearchResponse>({
        path: `/_search/scroll?scroll=1m&scroll_id=${encodeURIComponent(scrollId)}`,
        method: 'GET',
      });

      console.log(`Scroll ${currentScrolls + 1} response hits:`, scrollResponse.hits.hits.length);

      if (!scrollResponse?.hits?.hits) {
        console.error('Invalid scroll response format:', scrollResponse);
        break;
      }

      if (scrollResponse.hits.hits.length === 0) {
        console.log('No more hits in scroll response, breaking loop');
        break;
      }

      // 스크롤 응답 데이터 누적
      allScrollResponses = [...allScrollResponses, ...scrollResponse.hits.hits];

      scrollId = scrollResponse._scroll_id;
      currentScrolls++;

      if (onProgress) {
        onProgress({
          current: (currentScrolls + 1) * scrollSize,
          total: initialResponse.hits.total.value,
          status: 'loading',
        });
      }
    }

    // 목표 페이지의 데이터 수집
    if (scrollId && scrollsNeeded > 0) {
      console.log('Fetching final page data with scroll');
      const finalScrollResponse = await client.request<OpenSearchResponse>({
        path: `/_search/scroll?scroll=1m&scroll_id=${encodeURIComponent(scrollId)}`,
        method: 'GET',
      });
      // 목표 페이지의 데이터 수집 부분 수정
      console.log('Total accumulated hits:', allScrollResponses.length);
      console.log('Final scroll response hits:', finalScrollResponse.hits.hits.length);

      if (!finalScrollResponse?.hits?.hits) {
        console.error('Invalid final scroll response format:', finalScrollResponse);
        throw new Error('Invalid response format from OpenSearch scroll');
      }

      const offsetInLastBatch = start % scrollSize;
      console.log('Calculating final slice:', {
        offsetInLastBatch,
        sliceStart: offsetInLastBatch,
        sliceEnd: offsetInLastBatch + size,
      });

      targetHits = finalScrollResponse.hits.hits.slice(
        offsetInLastBatch,
        offsetInLastBatch + size
      );
    } else {
      console.log('Using initial response for data');
      const sliceStart = start % scrollSize;
      const sliceEnd = Math.min(sliceStart + size, initialResponse.hits.hits.length);
      console.log('Calculating initial slice:', {
        sliceStart,
        sliceEnd,
        totalHits: initialResponse.hits.hits.length
      });

      targetHits = initialResponse.hits.hits.slice(sliceStart, sliceEnd);
      console.log('Calculating final slice:', {
        sliceStart,
        sliceEnd,
        totalAccumulatedHits: allScrollResponses.length
      });
    }

    console.log('Final target hits length:', targetHits.length);

    // 데이터 조회 완료 후 상태 업데이트
    if (onProgress) {
      onProgress({
        current: initialResponse.hits.total.value,
        total: initialResponse.hits.total.value,
        status: 'complete',
      });
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
    console.error('Detailed OpenSearch Error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    throw error;
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
        loadingStatus: z.object({
          current: z.number(),
          total: z.number(),
          status: z.enum(['ready', 'loading', 'complete', 'error']),
        }),
      })
    )
    .query(async ({ input }) => {
      let loadingStatus = {
        current: 0,
        total: 0,
        status: 'loading' as 'ready' | 'loading' | 'complete' | 'error',
      };

      try {
        const timeFrom = dayjs.tz(input.timeFrom, 'Asia/Seoul');
        const timeTo = dayjs.tz(input.timeTo, 'Asia/Seoul');

        console.log('Search Time Range (KST):', {
          from: timeFrom.format('YYYY-MM-DD HH:mm:ss'),
          to: timeTo.format('YYYY-MM-DD HH:mm:ss'),
        });
        console.log('Search input:', {
          timeFrom: timeFrom.format(),
          timeTo: timeTo.format(),
          searchTerm: input.searchTerm,
          menu: input.menu
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

        // searchTerm이 있을 경우 쿼리 조건 추가
        if (input.searchTerm) {
          try {
            // WHERE 절 형식인지 확인 (trim()으로 앞뒤 공백 제거 후 검사)
            const trimmedSearchTerm = input.searchTerm.trim();
            if (trimmedSearchTerm.toUpperCase().startsWith('AND')) {
              // AND로 시작하는 경우 WHERE 절 파싱
              const whereClause = trimmedSearchTerm.substring(3).trim(); // 'AND ' 제거
              console.log('Parsing where clause:', whereClause);

              const parsedQuery = parseWhereClause(whereClause);
              const opensearchQueries = buildOpenSearchQuery(parsedQuery);

              console.log('Parsed OpenSearch queries:', JSON.stringify(opensearchQueries, null, 2));

              if (searchBody.query.bool?.must) {
                searchBody.query.bool.must.push(...opensearchQueries);
              }
            } else {
              // 기존 multi_match 쿼리 사용
              const searchTermQuery = {
                multi_match: {
                  query: input.searchTerm,
                  fields: ['*'],
                  type: 'phrase'
                }
              };

              console.log('Using multi_match query:', JSON.stringify(searchTermQuery, null, 2));

              if (searchBody.query.bool?.must) {
                searchBody.query.bool.must.push(searchTermQuery);
              }
            }
          } catch (parseError) {
            console.error('Error parsing search term:', parseError);
            // 파싱 에러 시 기본 multi_match 쿼리로 폴백
            const searchTermQuery = {
              multi_match: {
                query: input.searchTerm,
                fields: ['*'],
                type: 'phrase'
              }
            };
            if (searchBody.query.bool?.must) {
              searchBody.query.bool.must.push(searchTermQuery);
            }
          }
        }
        const result = await searchOpenSearchWithScroll(
          searchBody,
          input.menu,
          input.currentPage,
          input.limit,
          (progress) => {
            loadingStatus = {
              current: progress.current,
              total: progress.total,
              status: progress.status as
                | 'ready'
                | 'loading'
                | 'complete'
                | 'error',
            };
          }
        );

        console.log('Search results:', {
          totalHits: result.initialResponse.hits.total.value,
          returnedHits: result.scrollResponse.length
        });

        loadingStatus.status = 'complete';

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
          loadingStatus,
        };
      } catch (error) {
        console.error('Query Error:', error);
        loadingStatus = {
          current: 0,
          total: 0,
          status: 'error',
        };
        return {
          logs: [],
          pagination: {
            currentPage: input.currentPage,
            pageLength: 0,
            totalCnt: 0,
          },
          loadingStatus,
        };
      }
    }),
});

