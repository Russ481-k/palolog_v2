import dayjs from 'dayjs';
import { Observable, Subscriber } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { downloadChunkManager } from '../lib/downloadChunkManager';
import { TotalProgress, downloadManager } from '../lib/downloadManager';
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
      return new Observable<TotalProgress>(
        (emit: Subscriber<TotalProgress>) => {
          const interval = setInterval(() => {
            const progress = downloadManager.getProgress(input.downloadId);
            if (progress) {
              emit.next({
                downloadId: input.downloadId,
                files: [progress],
                timestamp: new Date().toISOString(),
                overallProgress: {
                  progress: progress.progress,
                  status: progress.status,
                  processedRows: progress.processedRows,
                  totalRows: progress.totalRows,
                  message: progress.message,
                },
              });
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
      const downloadId = uuidv4();
      try {
        console.log('[Download Router] Starting download with params:', {
          searchId,
          totalRows,
          searchParams,
          timestamp: new Date().toISOString(),
        });

        const download = await downloadManager.createDownload(
          downloadId,
          totalRows,
          searchParams
        );

        // 파일 크기 계산 (500,000 rows per file)
        const CHUNK_SIZE = 500000;
        const numFiles = Math.ceil(totalRows / CHUNK_SIZE);
        const timestamp = dayjs().format('YYYY-MM-DD_HH:mm:ss');

        // 초기 파일 목록 생성
        const initialFiles = Array.from({ length: numFiles }, (_, index) => {
          const clientFileName = `${searchParams.menu}_${timestamp}_${index + 1}of${numFiles}.csv`;
          return {
            downloadId,
            fileName: `${downloadId}.csv`,
            clientFileName,
            status: 'generating' as const,
            progress: 0,
            processedRows: 0,
            totalRows: Math.min(CHUNK_SIZE, totalRows - index * CHUNK_SIZE),
            message: 'Generating file...',
            startTime: new Date(),
            lastUpdateTime: Date.now(),
            lastProcessedCount: 0,
            processingSpeed: 0,
            estimatedTimeRemaining: 0,
          };
        });

        // 다운로드 매니저에 초기 상태 설정
        downloadManager.initializeFiles(
          download.servedDownloadId,
          initialFiles
        );

        return {
          downloadId: download.servedDownloadId,
          files: initialFiles.map((file) => ({
            ...file,
            fileName: file.clientFileName || file.fileName,
          })),
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
      console.log('[Download Router] Attempting to download file:', {
        downloadId,
        fileName,
        timestamp: new Date().toISOString(),
      });
      console.log(downloadId, downloadChunkManager.getManager(downloadId));
      const manager = downloadChunkManager.getManager(downloadId);
      if (!manager) {
        console.error('[Download Router] Download manager not found:', {
          downloadId,
          fileName,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Download manager not found');
      }

      // Get all chunks and find the one with matching file name
      const chunks = manager.getProgress();
      console.log('[Download Router] Available chunks:', {
        downloadId,
        chunks: chunks.map((c) => ({
          fileName: c.fileName,
          clientFileName: c.clientFileName,
        })),
        requestedFile: fileName,
        timestamp: new Date().toISOString(),
      });

      // Try to find the chunk by either server file name or client file name
      const chunk = chunks.find(
        (c) => c.fileName === fileName || c.clientFileName === fileName
      );

      if (!chunk) {
        console.error('[Download Router] File not found:', {
          downloadId,
          fileName,
          availableFiles: chunks.map((c) => ({
            fileName: c.fileName,
            clientFileName: c.clientFileName,
          })),
          timestamp: new Date().toISOString(),
        });
        throw new Error('File not found');
      }

      if (chunk.status !== 'ready') {
        console.error('[Download Router] File not ready:', {
          downloadId,
          fileName,
          clientFileName: chunk.clientFileName,
          status: chunk.status,
          timestamp: new Date().toISOString(),
        });
        throw new Error('File not ready for download');
      }

      // Return both server and client file names
      return {
        filePath: chunk.fileName,
        downloadFileName: chunk.clientFileName || chunk.fileName,
      };
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
