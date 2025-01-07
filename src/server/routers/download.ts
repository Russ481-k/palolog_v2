import { z } from 'zod';

import { downloadChunkManager } from '../lib/downloadChunkManager';
import { downloadManager } from '../lib/downloadManager';
import { protectedProcedure, router } from '../trpc';

const searchParamsSchema = z
  .object({
    menu: z.enum(['TRAFFIC']),
    timeFrom: z.string(),
    timeTo: z.string(),
    searchTerm: z.string(),
  })
  .required();

export const downloadRouter = router({
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
      const download = downloadManager.createDownload(searchId, totalRows);
      const manager = downloadChunkManager.createManager(
        searchId,
        searchParams
      );
      await manager.createChunks();
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
