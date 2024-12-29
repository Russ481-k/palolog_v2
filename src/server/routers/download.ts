import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { join } from 'path';
import { z } from 'zod';

import { OpenSearchHit } from '@/types/project';
import { retry } from '@/utils/retry';

import { createTRPCRouter } from '../config/trpc';
import { protectedProcedure } from '../config/trpc';
import { createCsvFile } from '../lib/csvWriter';
import { downloadManager } from '../lib/downloadManager';
import { makeOpenSearchRequest } from '../lib/opensearch';

export const downloadRouter = createTRPCRouter({
  startDownload: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      z.object({
        searchId: z.string(),
        totalRows: z.number(),
        searchParams: z.object({
          timeFrom: z.string(),
          timeTo: z.string(),
          menu: z.string(),
          searchTerm: z.string(),
        }),
      })
    )

    .mutation(async ({ input }) => {
      const downloadId = randomUUID();
      let processedRows = 0;
      let retryCount = 0;
      const MAX_RETRIES = 3;
      let currentScrollId: string | undefined;

      console.log('Starting download with:', {
        downloadId,
        totalRows: input.totalRows,
        searchParams: input.searchParams,
      });

      downloadManager.createDownload(downloadId, input.totalRows);

      try {
        const BATCH_SIZE = 10000; // 50만 건 단위로 조정

        // 초기 검색 수행
        const initialSearch = await makeOpenSearchRequest<{
          hits: { hits: OpenSearchHit[] };
          _scroll_id: string;
        }>('/_search', 'POST', {
          query: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: dayjs
                        .tz(input.searchParams.timeFrom, 'Asia/Seoul')
                        .toISOString(),
                      lte: dayjs
                        .tz(input.searchParams.timeTo, 'Asia/Seoul')
                        .toISOString(),
                      format: 'strict_date_time',
                      time_zone: '+09:00',
                    },
                  },
                },
                {
                  match: {
                    logType: input.searchParams.menu,
                  },
                },
                ...(input.searchParams.searchTerm
                  ? [
                      {
                        query_string: { query: input.searchParams.searchTerm },
                      },
                    ]
                  : []),
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: BATCH_SIZE,
        });
        console.log('initialSearch', JSON.stringify(initialSearch, null, 2));
        console.log('Initial search request:', {
          timeRange: {
            gte: dayjs
              .tz(input.searchParams.timeFrom, 'Asia/Seoul')
              .toISOString(),
            lte: dayjs
              .tz(input.searchParams.timeTo, 'Asia/Seoul')
              .toISOString(),
          },
          menu: input.searchParams.menu,
          searchTerm: input.searchParams.searchTerm,
        });

        console.log('Initial search response:', {
          status: initialSearch ? 'success' : 'failed',
          hits: initialSearch?.hits?.hits?.length,
          scrollId: initialSearch?._scroll_id,
          error: !initialSearch?.hits ? 'No hits object' : null,
        });

        console.log('Scroll ID check:', {
          initial: initialSearch._scroll_id,
          raw: initialSearch,
        });

        currentScrollId = initialSearch._scroll_id;
        console.log('Initial search completed:', {
          scrollId: currentScrollId,
          hitsLength: initialSearch.hits.hits.length,
        });

        // 첫 번째 배치 처리
        if (initialSearch.hits.hits.length > 0) {
          const logs = initialSearch.hits.hits.map((hit) => hit._source);
          const firstTimestamp = logs[0]?.[1] ?? '';
          const lastTimestamp = logs[logs.length - 1]?.[1] ?? '';
          const startDate = dayjs(lastTimestamp).format('YYYYMMDD_HHmmss');
          const endDate = dayjs(firstTimestamp).format('YYYYMMDD_HHmmss');
          const chunkId = `${startDate}_${endDate}_${downloadId}_part1.csv`;
          const filePath = await createCsvFile(logs, chunkId);
          processedRows += logs.length;
          downloadManager.updateProgress(downloadId, processedRows, filePath);
          console.log('First batch processed:', { processedRows, filePath }); // 로깅 추가
        }

        // 나머지 스크롤 검색 수행
        let partNumber = 2;
        while (processedRows < input.totalRows) {
          try {
            console.log('Fetching next batch:', {
              processedRows,
              totalRows: input.totalRows,
              scrollId: currentScrollId,
            });

            const searchResult = await retry(
              async () => {
                const result = await makeOpenSearchRequest<{
                  hits: { hits: OpenSearchHit[] };
                  _scroll_id: string;
                }>('/_search/scroll=5m', 'POST', {
                  scroll_id: currentScrollId,
                });

                console.log('Scroll search result:', {
                  scrollId: result._scroll_id,
                  hitsLength: result?.hits?.hits?.length,
                });

                if (!result?.hits?.hits) {
                  throw new Error('Invalid search response');
                }

                return result;
              },
              {
                retries: MAX_RETRIES,
                minTimeout: 2000,
                maxTimeout: 10000,
              }
            );

            if (!searchResult.hits.hits.length) break;

            // 각 배치 처리
            const logs = searchResult.hits.hits.map((hit) => hit._source);
            const firstTimestamp = logs[0]?.['@timestamp'] ?? '';
            const lastTimestamp = logs[logs.length - 1]?.['@timestamp'] ?? '';
            const startDate = dayjs(lastTimestamp).format('YYYYMMDD_HHmmss');
            const endDate = dayjs(firstTimestamp).format('YYYYMMDD_HHmmss');
            const chunkId = `${startDate}_${endDate}_${downloadId}_part${partNumber}.csv`;
            const filePath = await createCsvFile(logs, chunkId);

            processedRows += logs.length;
            downloadManager.updateProgress(downloadId, processedRows, filePath);
            console.log('Batch processed:', {
              partNumber,
              processedRows,
              filePath,
            }); // 로깅 추가

            currentScrollId = searchResult._scroll_id;
            partNumber++;

            // 메모리 정리
            searchResult.hits.hits.length = 0;
            await new Promise((resolve) => setTimeout(resolve, 100));
            retryCount = 0; // 공 시 재시도 카운트 리셋
          } catch (chunkError: unknown) {
            console.error('Chunk error:', chunkError); // 에러 로깅 추가
            retryCount++;
            if (retryCount > MAX_RETRIES) {
              throw new Error(
                `Failed after ${MAX_RETRIES} retries: ${
                  chunkError instanceof Error
                    ? chunkError.message
                    : String(chunkError)
                }`
              );
            }

            downloadManager.updateProgress(
              downloadId,
              processedRows,
              undefined,
              `Error occurred. Retrying chunk... (${retryCount}/${MAX_RETRIES})`
            );

            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            );
            continue;
          }
        }

        return { downloadId };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        downloadManager.setError(downloadId, errorMessage);
        throw error;
      } finally {
        if (currentScrollId) {
          await makeOpenSearchRequest('/_search/scroll', 'DELETE', {
            scroll_id: currentScrollId,
          }).catch(console.warn);
        }
      }
    }),

  getProgress: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      z.object({
        downloadId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return downloadManager.getProgress(input.downloadId);
    }),

  getFiles: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      z.object({
        downloadId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return downloadManager.getFiles(input.downloadId);
    }),

  downloadFile: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      z.object({
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const filePath = join(process.cwd(), 'downloads', input.fileName);
      return { filePath };
    }),

  cleanup: protectedProcedure({ authorizations: ['ADMIN'] })
    .input(
      z.object({
        downloadId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      downloadManager.cleanup(input.downloadId);
    }),
});
