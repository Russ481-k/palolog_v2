import * as fs from 'fs';
import * as https from 'https';
import { z } from 'zod';

import { env } from '@/env.mjs';
import { zPaloLogs, zPaloLogsParams } from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

// OpenSearch의 응답 타입 정의
interface SearchResultHit {
  _source: Record<string, string>;
}

interface SearchResult {
  took: number;
  timed_out: boolean;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: SearchResultHit[];
  };
  scrollId?: string;
}

interface CountResult {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: null | number;
    hits: string[]; // 실제 데이터는 빈 배열로 반환되므로 이 부분은 any[]로 설정
  };
  aggregations: {
    totalCount: {
      value: number;
    };
  };
}

async function searchOpenSearchWithSQL(
  sqlQuery: string,
  responseFormat: string = 'json',
  scroll: string = '1m' // 기본 scroll 시간을 1분으로 설정
) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: env.OPENSEARCH_URL.replace('https://', ''),
      port: env.OPENSEARCH_PORT,
      path: `/_plugins/_sql?format=${responseFormat}`,
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
        try {
          const parsedData =
            responseFormat === 'json' ? JSON.parse(data) : data;

          // scroll_id와 데이터 반환
          if (parsedData?.scroll_id) {
            resolve({
              scrollId: parsedData.scroll_id,
              data: parsedData,
            });
          } else {
            resolve(parsedData); // 마지막 페이지면 데이터를 반환
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            reject(new Error('Failed to parse the response: ' + error.message));
          } else {
            reject(new Error('An unknown error occurred'));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    const requestBody = {
      query: sqlQuery,
      scroll: scroll, // scroll 시간 설정
    };

    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

async function getNextPageWithScroll(
  scrollId: string,
  scroll: string = '10m'
): Promise<SearchResult> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: env.OPENSEARCH_URL.replace('https://', ''),
      port: env.OPENSEARCH_PORT,
      path: '/_search/scroll=10m',
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
        try {
          const parsedData: SearchResult = JSON.parse(data);
          resolve(parsedData);
        } catch (error: unknown) {
          if (error instanceof Error) {
            reject(new Error('Failed to parse the response: ' + error.message));
          } else {
            reject(new Error('An unknown error occurred'));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    const requestBody = {
      scroll: scroll, // scroll 시간 설정
      scroll_id: scrollId, // 이전에 받은 scroll_id 사용
    };

    console.log('requestBody : ', requestBody);
    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

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
      const currentPage = input.currentPage || 1;
      const limit = input.limit;
      const offset = (currentPage - 1) * input.limit;

      const sqlQuery = `
        SELECT *
        FROM logstash-logs-*
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countQuery = `
        SELECT COUNT(*) as totalCount
        FROM logstash-logs-*
      `;

      console.log('SQL Query:', sqlQuery);
      console.log('Count Query:', countQuery);

      try {
        // 비동기 작업을 await로 처리
        const [data, countData] = await Promise.all([
          searchOpenSearchWithSQL(sqlQuery, 'json') as Promise<SearchResult>,
          searchOpenSearchWithSQL(countQuery, 'json') as Promise<CountResult>,
        ]);

        // 처음 받은 scroll_id를 기반으로 더 많은 데이터를 요청할 수 있도록 추가 처리

        console.log('logsArray : ', data);
        let logsArray = data.hits.hits.map((hit) => hit._source);
        const totalCnt = countData.aggregations.totalCount.value;

        // 페이지네이션 처리
        const pageLength =
          totalCnt === 0 ? 1 : Math.ceil(totalCnt / input.limit);

        // scroll_id가 있을 경우, 추가 페이지 요청
        if (data.scrollId) {
          const nextPageData = await getNextPageWithScroll(data.scrollId);
          logsArray = [
            ...logsArray,
            ...nextPageData.hits.hits.map((hit) => hit._source),
          ];
        }

        return {
          logs: logsArray,
          pagination: {
            currentPage,
            pageLength,
            totalCnt,
          },
        };
      } catch (error) {
        console.error('Error:', error);
        throw error; // 에러를 다시 던져서 클라이언트에서 처리하게 함
      }
    }),
});
