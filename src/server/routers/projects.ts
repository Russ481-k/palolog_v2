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
  | { bool: BoolQuery };

type BoolQuery = {
  must?: QueryCondition[]; // 반드시 만족해야 하는 조건들
  should?: QueryCondition[]; // 하나 이상 만족하면 점수를 증가시키는 조건들
  must_not?: QueryCondition[]; // 만족하지 않아야 하는 조건들
  filter?: QueryCondition[]; // 점수에 영향을 미치지 않고 필터링하는 조건들
};

interface SearchBody {
  size: number;
  query: { bool: BoolQuery };
  sort?: Record<string, { order: 'asc' | 'desc' }>[];
  search_after?: [string | number | null];
}

async function searchOpenSearch(searchBody: SearchBody) {
  const options = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: env.OPENSEARCH_PORT,
    path: '/logstash-logs-*/_search',
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

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error) {
            console.error('OpenSearch Error:', parsedData.error);
            reject(parsedData.error);
          } else {
            resolve(parsedData);
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

function parseSearchTerm(searchTerm: string): QueryCondition[] {
  const regex = /(\w+)\s*(=|!=)\s*([^\s]+)(?:\s+(AND|OR))?/g;
  const conditions: QueryCondition[] = [];
  let match;

  console.log(searchTerm);
  while ((match = regex.exec(searchTerm)) !== null) {
    const [_, field, operator, value] = match;

    console.log('1 :', _, '2 :', field, '3 :', operator, '4 :', value);

    const condition: QueryCondition = {
      match: {
        [field?.trim() ?? '']: value?.trim() ?? '',
      },
    };

    if (operator === '!=') {
      conditions.push({ bool: { must_not: [condition] } });
    } else {
      conditions.push({ bool: { should: [condition] } }); // 배열로 변경
    }
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

      const searchBody: SearchBody = {
        size,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: input.timeFrom,
                    lte: input.timeTo,
                    format: 'yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis',
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
        searchBody.query.bool.must?.push(...conditions);
      }
      try {
        const response = (await searchOpenSearch(
          searchBody
        )) as OpenSearchResponse;
        if (!response?.hits) throw new Error('Invalid OpenSearch response');

        const totalCnt = response.hits.total.value || 0;
        const pageLength = Math.ceil(totalCnt / size);

        logsArray.push(
          ...response.hits.hits.map((hit) => ({
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
