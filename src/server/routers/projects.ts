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

interface OpenSearchOptions {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers: {
    'Content-Type': string;
    Authorization: string;
  };
  ca: Buffer;
  rejectUnauthorized: boolean;
}

export async function searchOpenSearchWithScroll(
  searchBody: SearchBody,
  indices: string
): Promise<{
  initialResponse: OpenSearchResponse;
  scrollResponse: OpenSearchResponse;
}> {
  const options = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: Number(env.OPENSEARCH_PORT),
    path: `/${indices}/_search?scroll=10m`,
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

async function handleScroll(scrollId: string): Promise<OpenSearchResponse> {
  const options = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: Number(env.OPENSEARCH_PORT),
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

  return new Promise<OpenSearchResponse>((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error) {
            reject(parsedData.error);
          } else {
            resolve(parsedData);

            // 스크롤이 완료되면 컨텍스트 삭제
            if (parsedData.hits.hits.length === 0) {
              try {
                await makeOpenSearchRequest('/_search/scroll', 'DELETE', {
                  scroll_id: scrollId,
                });
              } catch (error) {
                console.warn('Failed to delete scroll context:', error);
              }
            }
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(
      JSON.stringify({
        scroll: '1m',
        scroll_id: scrollId,
      })
    );
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

async function makeOpenSearchRequest<T>(
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

// 인덱스 범위 체크 함수 추가
async function getIndexTimeRange(): Promise<{
  earliest: dayjs.Dayjs;
  latest: dayjs.Dayjs;
}> {
  try {
    const indices = await makeOpenSearchRequest<{ [key: string]: string }>(
      '/_cat/indices/20*?format=json&s=index:asc',
      'GET'
    );

    if (!Array.isArray(indices) || indices.length === 0) {
      return {
        earliest: dayjs(),
        latest: dayjs(),
      };
    }

    // 인덱스 이름에서 날짜 추출 (YYYY.MM.DD.HH 형식)
    const dateRegex = /\d{4}\.\d{2}\.\d{2}\.\d{2}/;
    const dates = indices
      .map((index) => index.index.match(dateRegex)?.[0])
      .filter(Boolean);

    if (dates.length === 0) {
      return {
        earliest: dayjs(),
        latest: dayjs(),
      };
    }

    return {
      earliest: dayjs(dates[0].replace(/\./g, '-')),
      latest: dayjs(dates[dates.length - 1].replace(/\./g, '-')),
    };
  } catch (error) {
    console.error('Error getting index range:', error);
    return {
      earliest: dayjs(),
      latest: dayjs(),
    };
  }
}

// 시간 범위에 해당하는 인덱스 패턴 생성
function createIndexPattern(
  timeFrom: dayjs.Dayjs,
  timeTo: dayjs.Dayjs
): string {
  const domains = env.DOMAINS?.split(',').filter(Boolean) ?? [];
  const patterns = domains.map((domain) => {
    const domainPattern = domain
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/[^a-z0-9\-]/g, '_');
    return `20*_${domainPattern.slice(0, -1)}*`;
  });

  return patterns.join(',');
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
      let formattedTimeFrom = dayjs(input.timeFrom);
      let formattedTimeTo = dayjs(input.timeTo);

      // 인덱스 범위 체크
      const { earliest, latest } = await getIndexTimeRange();

      // 조회 범위 조정
      if (formattedTimeFrom.isBefore(earliest)) {
        formattedTimeFrom = earliest;
      }
      if (formattedTimeTo.isAfter(latest)) {
        formattedTimeTo = latest;
      }

      const searchBody: SearchBody = {
        size,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: formattedTimeFrom.toISOString(),
                    lte: formattedTimeTo.toISOString(),
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
        const indexPattern = createIndexPattern(
          formattedTimeFrom,
          formattedTimeTo
        );
        const { initialResponse, scrollResponse } =
          await searchOpenSearchWithScroll(searchBody, indexPattern);

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
