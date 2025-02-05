import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
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

export async function searchOpenSearchWithScroll({
  searchBody,
  menu,
  currentPage,
  limit,
  searchId,
  onProgress,
}: {
  searchBody: SearchBody;
  menu?: string;
  currentPage: number;
  limit: number;
  searchId?: string;
  onProgress?: (progress: {
    current: number;
    total: number;
    status: string;
  }) => void;
}): Promise<{
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
      page: currentPage,
      pageSize: limit,
      scrollTime: '2m',
      size: 1000,
      searchId,
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
          hits: result.hits as OpenSearchHit[],
        },
        _scroll_id: result.scrollId || '',
      },
      scrollResponse: result.hits as OpenSearchHit[],
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
    .query(async ({ ctx, input }) => {
      let loadingStatus = {
        current: 0,
        total: 0,
        status: 'loading' as 'ready' | 'loading' | 'complete' | 'error',
      };

      try {
        // 검색 세션 생성을 가장 먼저 수행
        const sessionId = randomUUID();
        console.log('[Search] Creating new search session with ID:', sessionId);

        const searchSession = await ctx.db.$transaction(async (tx) => {
          // 기존 활성 세션이 있다면 취소
          const activeSessions = await tx.searchSession.findMany({
            where: {
              userId: ctx.user.id,
              status: 'ACTIVE',
            },
          });

          if (activeSessions.length > 0) {
            console.log(
              '[Search] Cancelling existing active sessions:',
              activeSessions.map((s) => s.searchId)
            );
            await tx.searchSession.updateMany({
              where: {
                id: {
                  in: activeSessions.map((s) => s.id),
                },
              },
              data: {
                status: 'CANCELLED',
                cancelReason: '새로운 검색 시작으로 인한 취소',
                lastActivityAt: new Date(),
              },
            });
          }

          // 새 세션 생성
          return tx.searchSession.create({
            data: {
              userId: ctx.user.id,
              clientIp: ctx.clientIp,
              userAgent: ctx.userAgent,
              searchId: sessionId,
              status: 'ACTIVE',
              searchParams: input as unknown as Prisma.InputJsonValue,
              lastActivityAt: new Date(),
            },
          });
        });

        console.log('[Search] Created new search session:', {
          id: searchSession.id,
          searchId: searchSession.searchId,
          status: searchSession.status,
        });

        const timeFrom = dayjs.tz(input.timeFrom, 'Asia/Seoul');
        const timeTo = dayjs.tz(input.timeTo, 'Asia/Seoul');
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

        // 이후 검색 수행
        const searchResult = await searchOpenSearchWithScroll({
          searchBody,
          menu: input.menu,
          currentPage: input.currentPage,
          limit: input.limit,
          searchId: sessionId, // 생성된 세션 ID 전달
          onProgress: (progress) => {
            loadingStatus = {
              current: progress.current,
              total: progress.total,
              status: progress.status as
                | 'ready'
                | 'loading'
                | 'complete'
                | 'error',
            };
          },
        });

        // 검색 결과가 있는 경우에만 COMPLETED로 상태 변경
        const updatedSession = await ctx.db.$transaction(async (tx) => {
          const session = await tx.searchSession.findUnique({
            where: { id: searchSession.id },
            select: { id: true, searchId: true, status: true },
          });

          if (!session) {
            console.log('[Search] Session not found after search');
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: '검색 세션을 찾을 수 없습니다.',
            });
          }

          return tx.searchSession.update({
            where: { id: session.id },
            data: {
              status:
                searchResult.scrollResponse.length > 0 ? 'COMPLETED' : 'ERROR',
              lastActivityAt: new Date(),
            },
          });
        });

        console.log('[Search] Search completed:', {
          sessionId: updatedSession.id,
          status: updatedSession.status,
          hitsCount: searchResult.scrollResponse.length,
        });

        const currentVersion = getCurrentVersion();
        const columnNames = getColumnNames(currentVersion);

        // 검색 결과가 있는 경우에만 매핑 수행
        const logs =
          searchResult.scrollResponse.length > 0
            ? searchResult.scrollResponse.map((hit) =>
                columnNames.reduce((acc, col) => {
                  let value = hit._source?.[col] || null;
                  if (col === '@timestamp' && typeof value === 'string') {
                    value = dayjs(value)
                      .tz('Asia/Seoul')
                      .format('YYYY-MM-DD HH:mm:ss');
                  }
                  return { ...acc, [col]: value };
                }, {})
              )
            : [];

        return {
          pagination: {
            currentPage: input.currentPage,
            pageLength: Math.ceil(
              (searchResult.initialResponse.hits.total.value || 0) / input.limit
            ),
            totalCnt: searchResult.initialResponse.hits.total.value || 0,
          },
          logs,
          loadingStatus,
          scrollId: searchSession.searchId,
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

  cancelSearch: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(z.object({ searchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.log('[CancelSearch] Attempting to cancel search:', {
        searchId: input.searchId,
        userId: ctx.user.id,
        timestamp: new Date().toISOString(),
      });

      const session = await ctx.db.$transaction(
        async (tx) => {
          const currentSession = await tx.searchSession.findUnique({
            where: { searchId: input.searchId },
            select: {
              id: true,
              userId: true,
              status: true,
              searchId: true,
              lastActivityAt: true,
            },
          });

          console.log('[CancelSearch] Found session:', {
            session: currentSession,
            timestamp: new Date().toISOString(),
          });

          if (!currentSession) {
            console.log('[CancelSearch] Session not found:', input.searchId);
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: '검색 세션을 찾을 수 없습니다.',
            });
          }

          if (currentSession.userId !== ctx.user.id) {
            console.log('[CancelSearch] Unauthorized cancel attempt:', {
              sessionUserId: currentSession.userId,
              requestUserId: ctx.user.id,
            });
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: '권한이 없습니다.',
            });
          }

          if (currentSession.status !== 'ACTIVE') {
            console.log(
              `[CancelSearch] Session ${input.searchId} is already ${currentSession.status}`,
              {
                currentStatus: currentSession.status,
                lastActivityAt: currentSession.lastActivityAt,
                timestamp: new Date().toISOString(),
              }
            );
            return currentSession;
          }

          const updatedSession = await tx.searchSession.update({
            where: { id: currentSession.id },
            data: {
              status: 'CANCELLED',
              lastActivityAt: new Date(),
              cancelReason: '사용자에 의한 검색 취소',
            },
          });

          console.log('[CancelSearch] Session cancelled successfully:', {
            id: updatedSession.id,
            status: updatedSession.status,
            lastActivityAt: updatedSession.lastActivityAt,
            timestamp: new Date().toISOString(),
          });

          return updatedSession;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      return session;
    }),
});
