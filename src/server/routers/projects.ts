import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

import { getColumnNames } from '@/features/monitoring/columns';
import { zPaloLogs, zPaloLogsParams } from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';
import { OpenSearchClient, OpenSearchResponse } from '@/server/lib/opensearch';
import {
  buildOpenSearchQuery,
  parseWhereClause,
} from '@/server/lib/queryParser';
import { OpenSearchHit } from '@/types/project';
import { getCurrentVersion } from '@/utils/version';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  query: { bool?: BoolQuery; match_all?: Record<string, unknown> };
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

  try {
    const rangeQuery = (
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
    )?.range?.['@timestamp'];

    const modifiedSearchBody = {
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  gte: rangeQuery?.gte,
                  lte: rangeQuery?.lte,
                  format: 'strict_date_time',
                  time_zone: '+09:00',
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

    // 모든 인덱스의 총 문서 수를 가져오는 쿼리
    const countQuery = {
      index: '*', // 모든 인덱스 대상
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: rangeQuery?.gte,
                    lte: rangeQuery?.lte,
                    format: 'strict_date_time',
                    time_zone: '+09:00',
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
      },
    };

    // 전체 문서 수 조회
    const countResult = await client.count(countQuery);
    const totalCount = countResult.count || 0;

    const result = await client.scrollWithPagination({
      index: '*',
      body: modifiedSearchBody,
      page,
      pageSize: size,
      scrollTime: '2m',
      size: 1000,
    });

    if (onProgress) {
      onProgress({
        current: result.total,
        total: totalCount,
        status: 'complete',
      });
    }

    return {
      initialResponse: {
        hits: {
          total: { value: totalCount },
          hits: result.hits as OpenSearchHit[], // Ensure type compatibility
        },
        _scroll_id: result.scrollId || '',
      },
      scrollResponse: result.hits as OpenSearchHit[], // Ensure type compatibility
    };
  } catch (error) {
    console.error('Search error:', error);
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
        scrollId: z.string(),
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
          menu: input.menu,
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

              console.log(
                'Parsed OpenSearch queries:',
                JSON.stringify(opensearchQueries, null, 2)
              );

              if (searchBody.query.bool?.must) {
                searchBody.query.bool.must.push(...opensearchQueries);
              }
            } else {
              // 기존 multi_match 쿼리 사용
              const searchTermQuery = {
                multi_match: {
                  query: input.searchTerm,
                  fields: ['*'],
                  type: 'phrase',
                },
              };

              console.log(
                'Using multi_match query:',
                JSON.stringify(searchTermQuery, null, 2)
              );

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
                type: 'phrase',
              },
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

        loadingStatus.status = 'complete';

        const currentVersion = getCurrentVersion();
        const columnNames = getColumnNames(currentVersion);

        return {
          pagination: {
            currentPage: input.currentPage,
            pageLength: Math.ceil(
              (result.initialResponse.hits.total.value || 0) / input.limit
            ),
            totalCnt: result.initialResponse.hits.total.value || 0,
          },
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
          loadingStatus,
          scrollId: result.initialResponse._scroll_id,
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
          scrollId: '',
        };
      }
    }),
});
