import dayjs from 'dayjs';
import * as fs from 'fs';
import * as https from 'https';
import { z } from 'zod';

import { env } from '@/env.mjs';
import { columnNames } from '@/features/monitoring/colNameList';
import {
  zLogs,
  zPaloLogs,
  zPaloLogsParams,
} from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

// OpenSearchHit 타입 정의
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
  date: string = '*'
) {
  const options = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: env.OPENSEARCH_PORT,
    path: `/logstash-logs-${date}/_search?scroll=10m`,
    method: 'POST',
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

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error) {
            console.error('OpenSearch Error:', parsedData.error);
            reject(parsedData.error);
          } else if (!parsedData._scroll_id) {
            reject(new Error('Scroll ID is missing from the response'));
          } else {
            // Handle scroll API
            try {
              const scrollResponse = await handleScroll(parsedData._scroll_id);
              resolve({ initialResponse: parsedData, scrollResponse });
            } catch (scrollError) {
              console.error('Scroll API Error:', scrollError);
              reject(scrollError);
            }
          }
        } catch (e) {
          console.error('Invalid JSON response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTPS request error:', error);
      reject(error);
    });

    req.write(JSON.stringify(searchBody));
    req.end();
  });
}

async function handleScroll(scrollId: string) {
  const options = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: env.OPENSEARCH_PORT,
    path: '/_search/scroll',
    method: 'POST',
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

  const scrollBody = {
    scroll: '10m',
    scroll_id: scrollId,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error) {
            console.error('OpenSearch Scroll Error:', parsedData.error);
            reject(parsedData.error);
          } else {
            resolve(parsedData);
            // Correctly delete the scroll context
            if (parsedData.hits.hits.length < 10000 && !scrollId) {
              const deleteOptions = {
                ...options,
                path: '/_search/scroll',
                method: 'DELETE',
              };

              const deleteReq = https.request(deleteOptions, (deleteRes) => {
                let deleteData = '';

                deleteRes.on('data', (deleteChunk) => {
                  deleteData += deleteChunk;
                });

                deleteRes.on('end', () => {
                  try {
                    const deleteParsedData = JSON.parse(deleteData);
                    if (deleteParsedData.error) {
                      console.error(
                        'OpenSearch Scroll Delete Error:',
                        deleteParsedData.error
                      );
                      reject(deleteParsedData.error);
                    } else {
                      console.log('Scroll context deleted successfully.');
                    }
                  } catch (deleteError) {
                    console.error(
                      'Invalid JSON response for delete:',
                      deleteData
                    );
                    reject(deleteError);
                  }
                });
              });

              deleteReq.on('error', (deleteError) => {
                console.error('HTTPS request error for delete:', deleteError);
                reject(deleteError);
              });

              deleteReq.write(JSON.stringify({ scroll_id: scrollId }));
              deleteReq.end();
            }
          }
        } catch (e) {
          console.error('Invalid JSON response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTPS request error:', error);
      reject(error);
    });

    req.write(JSON.stringify(scrollBody));
    req.end();
  });
}

function parseSearchTerm(searchTerm: string): QueryCondition[] {
  const regex = /(\w+)\s*(==|!=|=)\s*(['"])(.*?)\3(?:\s+(AND|OR))?/g;
  const conditions: QueryCondition[] = [];
  let match;
  let currentCondition: BoolQueryCondition | null = null;
  let isFirstCondition = true;

  while ((match = regex.exec(searchTerm)) !== null) {
    const [, field, operator, , value, logicalOperator] = match;

    const condition: QueryCondition = {
      match: {
        [field?.trim() ?? '']: value?.trim() ?? '',
      },
    };

    if (isFirstCondition) {
      // Handle the first condition based on logical operator
      const boolQuery: BoolQuery = {};

      if (logicalOperator === 'OR') {
        boolQuery.should = [condition];
      } else {
        boolQuery[operator === '!=' ? 'must_not' : 'must'] = [condition];
      }

      conditions.push({ bool: boolQuery });
      isFirstCondition = false;
    } else {
      // For subsequent conditions, add based on the logical operator
      if (logicalOperator === 'AND') {
        currentCondition!.bool.must?.push(condition);
      } else if (logicalOperator === 'OR') {
        currentCondition!.bool.should?.push(condition);
      }
    }

    currentCondition = conditions[conditions.length - 1] as BoolQueryCondition;
  }

  return conditions;
}

export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      zPaloLogsParams().extend({
        menu: z.enum(['TRAFFIC', 'THREAT', 'SYSLOG']).optional(),
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
      const logsArray: zLogs[] = [];
      const size = input.limit;
      const formattedTimeFrom = dayjs(input.timeFrom).toISOString();
      const formattedTimeTo = dayjs(input.timeTo).toISOString();

      const searchBody: SearchBody = {
        size, // 페이지당 데이터 수
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: formattedTimeFrom,
                    lte: formattedTimeTo,
                    format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                    time_zone: '+09:00',
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      match: {
                        logType: input.menu ?? 'TRAFFIC',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
      };

      if (input.searchTerm) {
        const conditions = parseSearchTerm(input.searchTerm);
        searchBody.query.bool?.must?.push(...conditions);
      }

      try {
        const { initialResponse, scrollResponse } =
          (await searchOpenSearchWithScroll(searchBody)) as {
            initialResponse: OpenSearchResponse;
            scrollResponse: OpenSearchResponse;
          };

        const totalCnt = initialResponse.hits.total.value || 0;
        const pageLength = Math.ceil(totalCnt / size);

        // 스크롤된 데이터를 매핑하여 logsArray에 추가
        logsArray.push(
          ...initialResponse.hits.hits.map((hit) => ({
            ...columnNames.reduce(
              (acc, col) => ({ ...acc, [col]: hit._source?.[col] || null }),
              {}
            ),
          })),
          ...scrollResponse.hits.hits.map((hit) => ({
            ...columnNames.reduce(
              (acc, col) => ({ ...acc, [col]: hit._source?.[col] || null }),
              {}
            ),
          }))
        );

        return {
          logs: logsArray,
          pagination: { currentPage: input.currentPage, pageLength, totalCnt },
        };
      } catch (error) {
        console.error('Error querying OpenSearch:', error);
        throw new Error('Failed to fetch data');
      }
    }),
});
