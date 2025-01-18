import { TRPCError } from '@trpc/server';
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

const generateDownloadId = () => uuidv4();

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
      const downloadId = generateDownloadId();

      console.log('[Download Router] Starting download:', {
        searchId,
        downloadId,
        totalRows,
        timestamp: new Date().toISOString(),
      });

      // Create download in downloadManager first
      const { files } = await downloadManager.createDownload(
        downloadId,
        totalRows,
        searchParams
      );

      // Create and initialize DownloadChunkManager
      const manager = downloadChunkManager.createManager(
        downloadId,
        searchParams
      );

      // Create chunks for the download
      await manager.createChunks().catch((error) => {
        console.error('[Download Router] Failed to create chunks:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          downloadId,
          timestamp: new Date().toISOString(),
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create download chunks',
        });
      });

      console.log('[Download Router] Created download managers:', {
        downloadId,
        files: files.map((f) => ({
          fileName: f.fileName,
          clientFileName: f.clientFileName,
        })),
        timestamp: new Date().toISOString(),
      });

      return {
        downloadId,
        files,
      };
    }),

  downloadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        downloadId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { downloadId, fileName } = input;

      console.log('[Download Router] Attempting to download file:', {
        downloadId,
        fileName,
        timestamp: new Date().toISOString(),
      });

      // Get all active managers for debugging
      const activeManagers = downloadChunkManager.getActiveManagers();
      console.log('[Download Router] Active download managers:', {
        downloadId,
        activeManagers: activeManagers.map((m) => ({
          id: m.downloadId,
          files: m.getProgress().map((p) => p.fileName),
        })),
        timestamp: new Date().toISOString(),
      });

      // Get the manager for this download
      const manager = downloadChunkManager.getManager(downloadId);
      if (!manager) {
        console.log('[Download Router] Download manager not found:', {
          downloadId,
          fileName,
          activeManagerIds: activeManagers.map((m) => m.downloadId),
          timestamp: new Date().toISOString(),
        });
        throw new TRPCError({
          code: 'NOT_FOUND',
          message:
            'Download manager not found. Please try starting the download again.',
        });
      }

      // Get the chunk progress
      const chunk = manager.getChunk(fileName);
      if (!chunk) {
        console.log('[Download Router] Chunk not found:', {
          downloadId,
          fileName,
          availableChunks: manager.getProgress().map((p) => p.fileName),
          timestamp: new Date().toISOString(),
        });
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found. Please try starting the download again.',
        });
      }

      if (chunk.status !== 'ready') {
        console.log('[Download Router] File not ready:', {
          downloadId,
          fileName,
          status: chunk.status,
          progress: chunk.progress,
          timestamp: new Date().toISOString(),
        });
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File is not ready for download. Current status: ${chunk.status}`,
        });
      }

      return {
        downloadId,
        fileName,
        status: 'success',
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
