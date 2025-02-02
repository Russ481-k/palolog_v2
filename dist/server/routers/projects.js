import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

import { getColumnNames } from '@/features/monitoring/columns';
import { zEntaSysParams, zEntaSyss } from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';
import { OpenSearchClient } from '@/server/lib/opensearch';
import {
  buildOpenSearchQuery,
  parseWhereClause,
} from '@/server/lib/queryParser';
import { getCurrentVersion } from '@/utils/version';

dayjs.extend(utc);
dayjs.extend(timezone);
export async function searchOpenSearchWithScroll(
  searchBody,
  menu,
  page = 1,
  size = 100,
  onProgress
) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const client = OpenSearchClient.getInstance();
  try {
    const rangeQuery =
      (_d =
        (_c =
          (_b =
            (_a = searchBody.query.bool) === null || _a === void 0
              ? void 0
              : _a.must) === null || _b === void 0
            ? void 0
            : _b[0]) === null || _c === void 0
          ? void 0
          : _c.range) === null || _d === void 0
        ? void 0
        : _d['@timestamp'];
    const modifiedSearchBody = {
      track_total_hits: true,
      query: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  gte:
                    rangeQuery === null || rangeQuery === void 0
                      ? void 0
                      : rangeQuery.gte,
                  lte:
                    rangeQuery === null || rangeQuery === void 0
                      ? void 0
                      : rangeQuery.lte,
                  format: 'strict_date_time',
                  time_zone: '+09:00',
                },
              },
            },
            {
              match: {
                logType: menu !== null && menu !== void 0 ? menu : 'TRAFFIC',
              },
            },
            ...(((_f =
              (_e = searchBody.query.bool) === null || _e === void 0
                ? void 0
                : _e.must) === null || _f === void 0
              ? void 0
              : _f.slice(1)) || []),
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
                    gte:
                      rangeQuery === null || rangeQuery === void 0
                        ? void 0
                        : rangeQuery.gte,
                    lte:
                      rangeQuery === null || rangeQuery === void 0
                        ? void 0
                        : rangeQuery.lte,
                    format: 'strict_date_time',
                    time_zone: '+09:00',
                  },
                },
              },
              {
                match: {
                  logType: menu !== null && menu !== void 0 ? menu : 'TRAFFIC',
                },
              },
              ...(((_h =
                (_g = searchBody.query.bool) === null || _g === void 0
                  ? void 0
                  : _g.must) === null || _h === void 0
                ? void 0
                : _h.slice(1)) || []),
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
          hits: result.hits, // Ensure type compatibility
        },
        _scroll_id: result.scrollId || '',
      },
      scrollResponse: result.hits, // Ensure type compatibility
    };
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}
export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      zEntaSysParams().extend({
        menu: z.enum(['TRAFFIC', 'THREAT', 'SYSTEM']).optional(),
      })
    )
    .output(
      z.object({
        logs: z.array(zEntaSyss().nullish()),
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
      var _a, _b, _c;
      let loadingStatus = {
        current: 0,
        total: 0,
        status: 'loading',
      };
      try {
        const timeFrom = dayjs.tz(input.timeFrom, 'Asia/Seoul');
        const timeTo = dayjs.tz(input.timeTo, 'Asia/Seoul');
        const searchBody = {
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
              if (
                (_a = searchBody.query.bool) === null || _a === void 0
                  ? void 0
                  : _a.must
              ) {
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
              if (
                (_b = searchBody.query.bool) === null || _b === void 0
                  ? void 0
                  : _b.must
              ) {
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
            if (
              (_c = searchBody.query.bool) === null || _c === void 0
                ? void 0
                : _c.must
            ) {
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
              status: progress.status,
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
          logs: result.scrollResponse.map((hit) =>
            Object.assign(
              {},
              columnNames.reduce((acc, col) => {
                var _a;
                let value =
                  ((_a = hit._source) === null || _a === void 0
                    ? void 0
                    : _a[col]) || null;
                if (col === '@timestamp' && typeof value === 'string') {
                  value = dayjs(value)
                    .tz('Asia/Seoul')
                    .format('YYYY-MM-DD HH:mm:ss');
                }
                return Object.assign(Object.assign({}, acc), { [col]: value });
              }, {})
            )
          ),
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
