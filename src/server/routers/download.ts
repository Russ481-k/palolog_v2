import { z } from "zod";
import { randomUUID } from "crypto";
import { createTRPCRouter } from "../config/trpc";
import { protectedProcedure } from "../config/trpc";
import { makeOpenSearchRequest } from '../lib/opensearch';
import { createCsvFile } from '../lib/csvWriter';
import { env } from "@/env.mjs";

export const downloadRouter = createTRPCRouter({
    startDownload: protectedProcedure()
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
            let currentScrollId = input.searchId;
            let processedRows = 0;

            try {
                while (processedRows < input.totalRows) {
                    // 스크롤 API로 다음 배치 데이터 가져오기
                    const searchResult = await makeOpenSearchRequest<{
                        hits: { hits: Array<{ _source: any }> };
                        _scroll_id: string;
                    }>('/_search/scroll', 'POST', {
                        scroll: '1m',
                        scroll_id: currentScrollId,
                        size: env.DOWNLOAD_CHUNK_SIZE
                    });

                    if (!searchResult.hits.hits.length) break;

                    // CSV 파일 생성
                    const logs = searchResult.hits.hits.map(hit => hit._source);
                    const chunkId = `${downloadId}_${processedRows}`;
                    await createCsvFile(logs, chunkId);

                    processedRows += logs.length;
                    currentScrollId = searchResult._scroll_id;

                    // 메모리 해제를 위해 참조 제거
                    searchResult.hits.hits.length = 0;

                    // 시스템 부하 방지를 위한 지연
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                return {
                    downloadId,
                    totalProcessed: processedRows
                };

            } catch (error) {
                console.error('Download error:', error);
                throw error;
            } finally {
                // 스크롤 컨텍스트 정리
                if (currentScrollId) {
                    try {
                        await makeOpenSearchRequest('/_search/scroll', 'DELETE', {
                            scroll_id: currentScrollId
                        });
                    } catch (clearError) {
                        console.warn('Failed to clear scroll:', clearError);
                    }
                }
            }
        })
});       