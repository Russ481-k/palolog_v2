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
  const from = (page - 1) * size;

  try {
    const searchPath = '/*vision-seoul-fw-seoulfw*/_search';

    const modifiedSearchBody = {
      from,
      size,
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

    console.log('Search Query:', JSON.stringify(modifiedSearchBody, null, 2));

    const response = await client.request<OpenSearchResponse>({
      path: searchPath,
      method: 'POST',
      body: modifiedSearchBody,
    });

    return {
      initialResponse: response,
      scrollResponse: response.hits.hits,
    };
  } catch (error) {
    console.error('OpenSearch Error:', error);
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
