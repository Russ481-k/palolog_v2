import { z } from 'zod';

import { downloadChunkManager } from '../lib/downloadChunkManager';
import { downloadManager } from '../lib/downloadManager';
import { protectedProcedure, router } from '../trpc';

const searchParamsSchema = z.object({
  menu: z.string(),
  timeFrom: z.string(),
  timeTo: z.string(),
  searchTerm: z.string(),
});

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
      await downloadChunkManager.createChunks(searchId, searchParams);
      return { downloadId: download.id };
    }),

  downloadFile: protectedProcedure
    .input(z.object({ fileName: z.string() }))
    .mutation(async ({ input }) => {
      const { fileName } = input;
      const filePath = await downloadChunkManager.getFilePath(fileName);
      return { filePath };
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
