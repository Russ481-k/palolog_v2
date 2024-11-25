import * as fs from 'fs';
import * as https from 'https';
import { z } from 'zod';

import { env } from '@/env.mjs';
import {
  zLogs,
  zPaloLogs,
  zPaloLogsParams,
} from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

// OpenSearchHit 타입에 인덱스 서명 추가
type OpenSearchHit = {
  _source: Record<string, string | number | null> | undefined;
  [key: string]: Record<string, string | number | null> | undefined | unknown;
};

type OpenSearchResponse = {
  hits: {
    total: {
      value: number;
    };
    hits: OpenSearchHit[];
  };
};

type SearchBody = {
  from?: number;
  size?: number;
  query: {
    bool: {
      must: Array<Record<string, unknown>>;
      filter: Array<Record<string, unknown>>;
    };
  };
  sort?: Array<Record<string, unknown>>;
};

// OpenSearch에 요청을 보내는 함수 생성
async function searchOpenSearch(searchBody: SearchBody) {
  return new Promise((resolve, reject) => {
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

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify(searchBody));
    req.end();
  });
}

// 연결 테스트 함수 수정
async function testConnection() {
  try {
    const options = {
      hostname: env.OPENSEARCH_URL.replace('https://', ''),
      port: env.OPENSEARCH_PORT,
      path: '/_cluster/health',
      method: 'GET',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            `${env.OPENSEARCH_USERNAME}:${env.OPENSEARCH_PASSWORD}`
          ).toString('base64'),
      },
      ca: fs.readFileSync('/home/vtek/palolog_v2/ca-cert.pem'),
      rejectUnauthorized: true,
    };

    const response: SearchBody = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(JSON.parse(data));
        });
      });
      req.on('error', reject);
      req.end();
    });

    console.log('OpenSearch 클러스터 상태:', response);
  } catch (error) {
    console.error('OpenSearch 연결 실패:', error);
  }
}

testConnection();

export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure({ authorizations: ['ADMIN'] })
    .meta({
      openapi: {
        method: 'GET',
        path: '/projects',
        protect: true,
        tags: ['projects'],
      },
    })
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
      const logsArray: Array<zLogs> = [];
      const from = (input.currentPage - 1) * input.limit;
      const size = input.limit;
      const fields = Array.from(
        { length: 120 },
        (_, i) => `d${i.toString().padStart(3, '0')}`
      );

      const searchBody = {
        from,
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
                    time_zone: '+09:00', // 한국 시간대 설정 (UTC+9)
                  },
                },
              },
              ...(input.searchTerm
                ? fields.map((field) => ({
                    match: { [field]: input.searchTerm },
                  }))
                : []),
            ],
            filter: input.searchTerm
              ? [{ query_string: { query: input.searchTerm } }]
              : [],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
      };

      let totalCnt = 0;
      let pageLength = 1;

      try {
        const response = (await searchOpenSearch(
          searchBody
        )) as OpenSearchResponse;

        console.log('OpenSearch response:', JSON.stringify(response, null, 2));

        // Check if response has the expected structure
        if (!response?.hits?.total) {
          console.error('Unexpected OpenSearch response structure:', response);
          throw new Error('Invalid OpenSearch response structure');
        }

        // total 값 처리
        totalCnt = response.hits.total.value ?? 0;
        pageLength = Math.ceil(totalCnt / input.limit);

        // 데이터 매핑
        logsArray.push(
          ...response.hits.hits.map((hit: OpenSearchHit) => {
            const source = hit._source;
            if (!source) {
              return {};
            }
            return Object.fromEntries(
              Array.from({ length: 120 }, (_, i) => {
                const key = `d${i.toString().padStart(3, '0')}`;
                return [key, source[key]?.toString() ?? null];
              })
            );
          })
        );
      } catch (error) {
        console.error('OpenSearch query failed:', error);
        throw new Error('Failed to fetch data from OpenSearch.');
      }

      return {
        logs: logsArray,
        pagination: {
          currentPage: input.currentPage,
          pageLength,
          totalCnt,
        },
      };
    }),
});
