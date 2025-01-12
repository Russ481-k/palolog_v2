import dayjs from 'dayjs';
import { Observable, Subscriber } from 'rxjs';
import { z } from 'zod';

import { ChunkProgress, DownloadProgress } from '@/types/download';

import { downloadChunkManager } from '../lib/downloadChunkManager';
import { downloadManager } from '../lib/downloadManager';
import { protectedProcedure, router } from '../trpc';

const searchParamsSchema = z
  .object({
    menu: z.enum(['TRAFFIC', 'THREAT', 'SYSTEM'] as const),
    timeFrom: z.string(),
    timeTo: z.string(),
    searchTerm: z.string(),
  })
  .required();

export const downloadRouter = router({
  onProgress: protectedProcedure
    .input(z.object({ downloadId: z.string() }))
    .subscription(({ input }) => {
      return new Observable<DownloadProgress>(
        (emit: Subscriber<DownloadProgress>) => {
          const interval = setInterval(() => {
            const progress = downloadManager.getProgress(input.downloadId);
            if (progress) {
              emit.next(progress);
            }
          }, 200);

          return () => {
            clearInterval(interval);
          };
        }
      );
    }),
  startDownload: protectedProcedure
    .input(
      z.object({
        searchId: z.string(),
        totalRows: z.number(),
        searchParams: searchParamsSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { searchId, totalRows, searchParams } = input;
      try {
        console.log('[Download Router] Starting download with params:', {
          searchId,
          totalRows,
          searchParams,
          timestamp: new Date().toISOString(),
        });

        const download = await downloadManager.createDownload(
          searchId,
          totalRows,
          searchParams
        );

        // 파일 크기 계산 (500,000 rows per file)
        const CHUNK_SIZE = 500000;
        const numFiles = Math.ceil(totalRows / CHUNK_SIZE);
        const timestamp = dayjs().format('YYYY-MM-DD_HH:mm:ss');

        // 초기 파일 목록 생성
        const initialFiles: ChunkProgress[] = Array.from(
          { length: numFiles },
          (_, index) => {
            const fileName = `${searchParams.menu}_${timestamp}_${index + 1}of${numFiles}.csv`;
            return {
              fileName,
              downloadId: download.id,
              size: 0,
              status: 'pending' as const,
              progress: 0,
              processedRows: 0,
              totalRows: Math.min(CHUNK_SIZE, totalRows - index * CHUNK_SIZE),
              message: 'Initializing...',
              searchParams,
              startTime: new Date(),
              processingSpeed: 0,
              estimatedTimeRemaining: 0,
            };
          }
        );

        // 다운로드 매니저에 초기 상태 설정
        downloadManager.initializeFiles(download.id, initialFiles);

        return {
          downloadId: download.id,
          files: initialFiles,
          totalFiles: numFiles,
          searchParams,
        };
      } catch (error) {
        console.error('[Download Router] Failed to start download:', {
          error: error instanceof Error ? error.message : String(error),
          searchId,
          searchParams,
          totalRows,
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }),

  downloadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        downloadId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { fileName, downloadId } = input;
      const manager = downloadChunkManager.getManager(downloadId);
      if (!manager) throw new Error('Download manager not found');

      const chunk = manager.getChunk(fileName);
      if (!chunk) throw new Error('File not found');
      return { filePath: fileName };
    }),

  pauseDownload: protectedProcedure
    .input(z.object({ downloadId: z.string() }))
    .mutation(({ input }) => {
      const { downloadId } = input;
      downloadManager.pauseDownload(downloadId);
      return { success: true };
    }),

  resumeDownload: protectedProcedure
    .input(z.object({ downloadId: z.string() }))
    .mutation(({ input }) => {
      const { downloadId } = input;
      downloadManager.resumeDownload(downloadId);
      return { success: true };
    }),

  cancelDownload: protectedProcedure
    .input(z.object({ downloadId: z.string() }))
    .mutation(({ input }) => {
      const { downloadId } = input;
      downloadManager.cancelDownload(downloadId);
      return { success: true };
    }),

  cleanup: protectedProcedure
    .input(z.object({ downloadId: z.string() }))
    .mutation(({ input }) => {
      const { downloadId } = input;
      downloadManager.cleanup(downloadId);
      return { success: true };
    }),
});
