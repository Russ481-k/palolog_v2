import { z } from "zod";
import { randomUUID } from "crypto";
import { createTRPCRouter } from "../config/trpc";
import { protectedProcedure } from "../config/trpc";
import { OpenSearchResponse, makeOpenSearchRequest } from '../lib/opensearch';
import { createCsvFile } from '../lib/csvWriter';
import { env } from "@/env.mjs";
import { downloadManager } from '../lib/downloadManager';
import { createReadStream } from 'fs';
import { join } from 'path';
import { OpenSearchHit } from "@/types/project";
import { retry } from '@/utils/retry';
import dayjs from 'dayjs';

interface SearchHit {
    _source: OpenSearchHit;
}

export const downloadRouter = createTRPCRouter({
    startDownload: protectedProcedure({ authorizations: ['ADMIN'] })
        .input(z.object({
            searchId: z.string(),
            totalRows: z.number(),
            searchParams: z.object({
                timeFrom: z.string(),
                timeTo: z.string(),
                menu: z.string(),
                searchTerm: z.string()
            })
        }))

        .mutation(async ({ ctx, input }) => {
            const downloadId = randomUUID();
            let processedRows = 0;
            let retryCount = 0;
            const MAX_RETRIES = 3;
            let currentScrollId: string | undefined;

            console.log('Starting download with:', {
                downloadId,
                totalRows: input.totalRows,
                searchParams: input.searchParams
            });

            downloadManager.createDownload(downloadId, input.totalRows);

            try {
                // 초기 검색 수행
                const initialSearch = await makeOpenSearchRequest<{
                    hits: { hits: Array<{ _source: OpenSearchHit }> };
                    _scroll_id: string;
                }>('/_search', 'POST', {
                    query: {
                        bool: {
                            must: [
                                {
                                    range: {
                                        '@timestamp': {
                                            gte: dayjs.tz(input.searchParams.timeFrom, 'Asia/Seoul').toISOString(),
                                            lte: dayjs.tz(input.searchParams.timeTo, 'Asia/Seoul').toISOString(),
                                            format: 'strict_date_time',
                                            time_zone: '+09:00'
                                        }
                                    }
                                },
                                {
                                    match: {
                                        logType: input.searchParams.menu
                                    }
                                },
                                ...(input.searchParams.searchTerm ? [{
                                    query_string: { query: input.searchParams.searchTerm }
                                }] : [])
                            ]
                        }
                    },
                    sort: [{ '@timestamp': { order: 'desc' } }],
                    size: 1000,
                });
                console.log("initialSearch", JSON.stringify(initialSearch, null, 2));
                console.log('Initial search request:', {
                    timeRange: {
                        gte: dayjs.tz(input.searchParams.timeFrom, 'Asia/Seoul').toISOString(),
                        lte: dayjs.tz(input.searchParams.timeTo, 'Asia/Seoul').toISOString(),
                    },
                    menu: input.searchParams.menu,
                    searchTerm: input.searchParams.searchTerm
                });

                console.log('Initial search response:', {
                    status: initialSearch ? 'success' : 'failed',
                    hits: initialSearch?.hits?.hits?.length,
                    scrollId: initialSearch?._scroll_id,
                    error: !initialSearch?.hits ? 'No hits object' : null
                });

                currentScrollId = initialSearch._scroll_id;
                console.log('Initial search completed:', {
                    scrollId: currentScrollId,
                    hitsLength: initialSearch.hits.hits.length
                });

                // 첫 번째 배치 처리
                if (initialSearch.hits.hits.length > 0) {
                    const logs = initialSearch.hits.hits.map((hit: { _source: OpenSearchHit }) => hit._source);
                    const chunkId = `${downloadId}_${processedRows}.csv`;
                    const filePath = await createCsvFile(logs, chunkId);
                    processedRows += logs.length;
                    downloadManager.updateProgress(downloadId, processedRows, filePath);
                }

                // 나머지 스크롤 검색 수행
                while (processedRows < input.totalRows) {
                    try {
                        console.log('Fetching next batch:', {
                            processedRows,
                            totalRows: input.totalRows,
                            scrollId: currentScrollId
                        });

                        const searchResult = await retry(
                            async () => {
                                const result = await makeOpenSearchRequest<{
                                    hits: { hits: OpenSearchHit[] };
                                    _scroll_id: string;
                                }>('/_search/scroll=1m', 'POST', {
                                    scroll_id: currentScrollId,
                                    size: 10000
                                });

                                console.log('Search result:', {
                                    hitsLength: result?.hits?.hits?.length,
                                    scrollId: result?._scroll_id,
                                    error: !result?.hits ? 'No hits object' : null
                                });

                                return result;
                            },
                            {
                                retries: MAX_RETRIES,
                                onRetry: (error: Error, attempt: number) => {
                                    console.error('Retry error:', {
                                        attempt,
                                        error: error.message,
                                        stack: error.stack
                                    });
                                }
                            }
                        );

                        if (!searchResult.hits.hits.length) break;

                        // CSV 파일 생성 재도 로직
                        const logs = searchResult.hits.hits.map((hit: OpenSearchHit) => hit._source);
                        const chunkId = `${downloadId}_${processedRows}.csv`;

                        const filePath = await retry(
                            () => createCsvFile(logs, chunkId),
                            {
                                retries: MAX_RETRIES,
                                onRetry: (error: Error, attempt: number) => {
                                    console.warn(`CSV creation retry ${attempt} due to: ${error.message}`);
                                }
                            }
                        );

                        processedRows += logs.length;
                        downloadManager.updateProgress(downloadId, processedRows, filePath);
                        currentScrollId = searchResult._scroll_id;

                        // 메모리 정리
                        searchResult.hits.hits.length = 0;

                        await new Promise(resolve => setTimeout(resolve, 100));
                        retryCount = 0;  // 공 시 재시도 카운트 리셋

                    } catch (chunkError: unknown) {
                        retryCount++;
                        if (retryCount > MAX_RETRIES) {
                            throw new Error(`Failed after ${MAX_RETRIES} retries: ${chunkError instanceof Error ? chunkError.message : String(chunkError)
                                }`);
                        }

                        downloadManager.updateProgress(
                            downloadId,
                            processedRows,
                            undefined,
                            `Error occurred. Retrying chunk... (${retryCount}/${MAX_RETRIES})`
                        );

                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        continue;
                    }
                }

                return { downloadId };

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                downloadManager.setError(downloadId, errorMessage);
                throw error;
            } finally {
                if (currentScrollId) {
                    await makeOpenSearchRequest('/_search/scroll', 'DELETE', {
                        scroll_id: currentScrollId
                    }).catch(console.warn);
                }
            }
        }),

    getProgress: protectedProcedure({ authorizations: ['ADMIN'] })
        .input(z.object({
            downloadId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            return downloadManager.getProgress(input.downloadId);
        }),

    getFiles: protectedProcedure({ authorizations: ['ADMIN'] })
        .input(z.object({
            downloadId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            return downloadManager.getFiles(input.downloadId);
        }),

    downloadFile: protectedProcedure({ authorizations: ['ADMIN'] })
        .input(z.object({
            fileName: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const filePath = join(process.cwd(), 'downloads', input.fileName);
            return { filePath };
        }),

    cleanup: protectedProcedure({ authorizations: ['ADMIN'] })
        .input(z.object({
            downloadId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            downloadManager.cleanup(input.downloadId);
        })
});       