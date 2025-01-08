import { Observable, Subscriber } from 'rxjs';
import { z } from 'zod';

import { DownloadProgress } from '@/types/download';

import { downloadChunkManager } from '../lib/downloadChunkManager';
import { downloadManager } from '../lib/downloadManager';
import { protectedProcedure, router } from '../trpc';

const searchParamsSchema = z
  .object({
    menu: z.enum(['TRAFFIC', 'THREAT', 'SYSTEM']),
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
      console.log('Starting download with searchId:', searchId);
      const download = downloadManager.createDownload(searchId, totalRows);
      console.log('Download created with id:', download.id);
      const manager = downloadChunkManager.createManager(
        searchId,
        searchParams
      );
      console.log('Manager created for searchId:', searchId);
      await manager.createChunks();
      console.log('Chunks created for searchId:', searchId);
      return { downloadId: download.id };
    }),

  downloadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        searchId: z.string(),
        searchParams: searchParamsSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { fileName, searchId, searchParams } = input;
      const manager = downloadChunkManager.createManager(
        searchId,
        searchParams
      );
      const chunk = manager['chunks'].get(fileName);
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
