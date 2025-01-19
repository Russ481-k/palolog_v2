import { TRPCError } from '@trpc/server';
import * as fs from 'fs';
import { join } from 'path';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { downloadManager } from '../lib/downloadManager';
import { protectedProcedure, publicProcedure, router } from '../trpc';

const searchParamsSchema = z
  .object({
    menu: z.enum(['TRAFFIC', 'THREAT', 'SYSTEM']),
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
      return new Observable((emit) => {
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
      });
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
      // Create empty files in downloadManager first
      const { files } = await downloadManager.createDownload(
        downloadId,
        totalRows,
        searchParams
      );
      console.log('[Download Router] Created empty files:', {
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
  downloadFile: publicProcedure
    .input(z.object({ fileName: z.string() }))
    .mutation(async ({ input }) => {
      const { fileName } = input;
      const filePath = join(process.cwd(), 'downloads', fileName);
      try {
        // Check if file exists
        await fs.promises.access(filePath);
        // Mark file as downloaded
        downloadManager.markAsDownloaded(fileName);
        return { success: true };
      } catch (error) {
        console.error('[downloadRouter] Error downloading file:', {
          error: error instanceof Error ? error.message : String(error),
          fileName,
          timestamp: new Date().toISOString(),
        });
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Download manager not found',
        });
      }
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
