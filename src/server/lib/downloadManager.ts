import dayjs from 'dayjs';
import { EventEmitter } from 'events';
import fs from 'fs';

import {
  ChunkProgress,
  DownloadProgress,
  SearchParams,
} from '../../types/download';
import { OpenSearchClient } from '../lib/opensearch';

// Simplified status types with clear progression
export type DownloadStatus =
  | 'generating'
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'paused';

export class DownloadManager {
  private downloads: Map<string, DownloadProgress> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private cleanupTimeouts: Map<string, NodeJS.Timeout> = new Map();

  initializeFiles(downloadId: string, files: ChunkProgress[]) {
    files.forEach((file) => {
      const progress: DownloadProgress = {
        fileName: file.fileName,
        downloadId,
        processedRows: file.processedRows,
        totalRows: file.totalRows,
        progress: file.progress,
        status: 'generating',
        message: 'Generating file...',
        startTime: new Date(),
        lastUpdateTime: Date.now(),
        lastProcessedCount: 0,
        processingSpeed: 0,
        estimatedTimeRemaining: 0,
        totalChunks: Math.ceil(file.totalRows / 1000),
        completedChunks: 0,
        failedChunks: 0,
        processingChunks: 0,
        chunks: [],
      };
      this.downloads.set(file.fileName, progress);
      this.eventEmitter.emit(`progress:${downloadId}`, downloadId, progress);
    });
  }

  async createDownload(
    downloadId: string,
    totalRows: number,
    searchParams: SearchParams
  ): Promise<{ id: string }> {
    // Only add 'download-' prefix if it's not already present
    const finalId = downloadId.startsWith('download-')
      ? downloadId
      : `download-${downloadId}`;

    try {
      // Get actual count from OpenSearch
      const client = OpenSearchClient.getInstance();
      const timeFrom = dayjs(searchParams.timeFrom).tz('Asia/Seoul').format();
      const timeTo = dayjs(searchParams.timeTo).tz('Asia/Seoul').format();

      const countQuery = {
        track_total_hits: true,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: timeFrom,
                    lte: timeTo,
                    format: 'strict_date_time',
                    time_zone: '+09:00',
                  },
                },
              },
              {
                match: {
                  logType: searchParams.menu,
                },
              },
              {
                exists: {
                  field: 'message',
                },
              },
            ],
          },
        },
        _source: false,
        size: 0,
      };

      console.log('[DownloadManager] Getting actual count from OpenSearch:', {
        query: countQuery,
        downloadId: finalId,
        expectedRows: totalRows,
        timestamp: new Date().toISOString(),
      });

      const response = await client.request<{
        hits: {
          total: {
            value: number;
            relation?: string;
          };
        };
      }>({
        path: '/_search',
        method: 'POST',
        body: countQuery,
      });

      const actualCount = response.hits?.total?.value || 0;

      if (actualCount !== totalRows) {
        console.warn('[DownloadManager] Total rows mismatch:', {
          expectedRows: totalRows,
          actualCount,
          downloadId: finalId,
          timestamp: new Date().toISOString(),
        });
      }

      // Calculate number of chunks based on total rows
      const CHUNK_SIZE = 500000;
      const numChunks = Math.ceil(actualCount / CHUNK_SIZE);
      const timestamp = dayjs().format('YYYY-MM-DD_HH:mm:ss');

      // Create an array of initial progress objects for each chunk
      const files = Array.from({ length: numChunks }, (_, index) => {
        const chunkFileName = `${searchParams.menu}_${timestamp}_${index + 1}of${numChunks}.csv`;
        return {
          fileName: chunkFileName,
          downloadId: finalId,
          processedRows: 0,
          totalRows: Math.min(CHUNK_SIZE, actualCount - index * CHUNK_SIZE),
          progress: 0,
          status: 'downloading' as const,
          startTime: new Date(),
          lastUpdateTime: Date.now(),
          lastProcessedCount: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          totalChunks: numChunks,
          completedChunks: 0,
          failedChunks: 0,
          processingChunks: 0,
          chunks: [],
        };
      });

      // Initialize all files
      files.forEach((file) => {
        this.downloads.set(file.fileName, file);
        this.eventEmitter.emit(`progress:${finalId}`, finalId, file);
      });

      return { id: finalId };
    } catch (error) {
      console.error('[DownloadManager] Failed to create download:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        downloadId: finalId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  updateProgress(
    downloadId: string,
    progress: Partial<DownloadProgress>
  ): void {
    const existingProgress = this.downloads.get(downloadId);
    if (!existingProgress) {
      console.warn(`No download found for ID: ${downloadId}`);
      return;
    }

    const currentTime = Date.now();
    const timeDiff = (currentTime - existingProgress.lastUpdateTime) / 1000;
    const processedRows =
      progress.processedRows ?? existingProgress.processedRows;
    const processedDiff = processedRows - existingProgress.lastProcessedCount;

    // Calculate processing speed (rows per second)
    const speed =
      timeDiff > 0
        ? processedDiff / timeDiff
        : existingProgress.processingSpeed;

    // Calculate estimated time remaining (in seconds)
    const remaining =
      speed > 0
        ? (existingProgress.totalRows - processedRows) / speed
        : existingProgress.estimatedTimeRemaining;

    // Update chunks information
    const chunks = progress.chunks || existingProgress.chunks || [];
    const completedChunks = chunks.filter(
      (c) => c.status === 'completed'
    ).length;
    const failedChunks = chunks.filter((c) => c.status === 'failed').length;
    const processingChunks = chunks.filter(
      (c) => c.status === 'downloading'
    ).length;

    // Calculate overall progress based on chunk progress
    const totalProgress = chunks.reduce(
      (sum, chunk) => sum + (chunk.progress || 0),
      0
    );
    const progressValue =
      chunks.length > 0
        ? totalProgress / chunks.length
        : (processedRows / existingProgress.totalRows) * 100;

    const updatedProgress: DownloadProgress = {
      ...existingProgress,
      ...progress,
      processingSpeed: speed,
      estimatedTimeRemaining: remaining,
      lastUpdateTime: currentTime,
      lastProcessedCount: processedRows,
      progress: Math.min(100, progressValue),
      completedChunks,
      failedChunks,
      processingChunks,
      chunks,
    };

    // Update status based on chunks and generation state
    if (existingProgress.status === 'generating' && progressValue >= 100) {
      updatedProgress.status = 'ready';
      updatedProgress.message = 'File is ready for download';
    } else if (
      completedChunks === existingProgress.totalChunks &&
      existingProgress.status === 'downloading'
    ) {
      updatedProgress.status = 'completed';
      updatedProgress.endTime = new Date();
      updatedProgress.processedRows = existingProgress.totalRows;
      updatedProgress.progress = 100;
    } else if (failedChunks > 0) {
      updatedProgress.status = 'failed';
    } else if (
      processingChunks > 0 &&
      existingProgress.status !== 'generating'
    ) {
      updatedProgress.status = 'downloading';
    }

    // Schedule cleanup when download is completed
    if (updatedProgress.status === 'completed') {
      this.scheduleCleanup(downloadId, updatedProgress.fileName);
    }

    this.downloads.set(downloadId, updatedProgress);
    this.eventEmitter.emit(
      `progress:${downloadId}`,
      downloadId,
      updatedProgress
    );
  }

  getProgress(downloadId: string): DownloadProgress | undefined {
    return this.downloads.get(downloadId);
  }

  setError(downloadId: string, error: string): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      progress.error = error?.toString() || 'Download failed';
      progress.status = 'failed';
      this.downloads.set(downloadId, progress);
      this.eventEmitter.emit(`progress:${downloadId}`, downloadId, progress);
    }
  }

  onProgressUpdate(
    downloadId: string,
    callback: (downloadId: string, progress: DownloadProgress) => void
  ): () => void {
    const eventName = `progress:${downloadId}`;
    this.eventEmitter.on(eventName, callback);

    // Send initial progress if available
    const initialProgress = this.downloads.get(downloadId);
    if (initialProgress) {
      callback(downloadId, initialProgress);
    }

    return () => {
      this.eventEmitter.removeListener(eventName, callback);
    };
  }

  pauseDownload(downloadId: string): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      this.updateProgress(downloadId, { status: 'paused' });
    }
  }

  resumeDownload(downloadId: string): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      this.updateProgress(downloadId, { status: 'downloading' });
    }
  }

  cancelDownload(downloadId: string): void {
    const progress = this.downloads.get(downloadId);
    if (progress) {
      this.updateProgress(downloadId, {
        status: 'failed',
        error: 'Download cancelled',
      });
      this.downloads.delete(downloadId);
    }
  }

  cleanup(downloadId: string): void {
    const progress = this.downloads.get(downloadId);
    if (!progress) {
      return;
    }

    // Remove from downloads map
    this.downloads.delete(downloadId);

    // Cancel any pending cleanup
    const timeout = this.cleanupTimeouts.get(progress.fileName);
    if (timeout) {
      clearTimeout(timeout);
      this.cleanupTimeouts.delete(progress.fileName);
    }

    // Delete the physical file
    try {
      const filePath = `./downloads/${progress.fileName}`;
      fs.unlinkSync(filePath);
      console.log(`[DownloadManager] Deleted file ${filePath}`);
    } catch (error) {
      console.error(`[DownloadManager] Error deleting file:`, error);
    }

    // Notify clients
    this.eventEmitter.emit(`cleanup:${downloadId}`, downloadId);
  }

  private handleError(downloadId: string, error: unknown) {
    try {
      const progress = this.downloads.get(downloadId);
      if (progress) {
        progress.error = error
          ? (error as Error).message || String(error)
          : 'Download failed';
        progress.status = 'failed';
        this.downloads.set(downloadId, progress);
      }
    } catch (e) {
      console.error('Failed to handle error:', e);
    }
  }

  getDownload(downloadId: string): DownloadProgress | undefined {
    return this.downloads.get(downloadId);
  }

  async getActualCount(searchParams: SearchParams): Promise<number> {
    try {
      const client = OpenSearchClient.getInstance();
      const timeFrom = dayjs(searchParams.timeFrom).tz('Asia/Seoul').format();
      const timeTo = dayjs(searchParams.timeTo).tz('Asia/Seoul').format();

      const countQuery = {
        track_total_hits: true,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: timeFrom,
                    lte: timeTo,
                    format: 'strict_date_time',
                    time_zone: '+09:00',
                  },
                },
              },
              {
                match: {
                  logType: searchParams.menu,
                },
              },
              {
                exists: {
                  field: 'message',
                },
              },
            ],
          },
        },
        _source: false,
        size: 0,
      };

      const response = await client.request<{
        hits: {
          total: {
            value: number;
            relation?: string;
          };
        };
      }>({
        path: '/_search',
        method: 'POST',
        body: countQuery,
      });

      return response.hits?.total?.value || 0;
    } catch (error) {
      console.error('[DownloadManager] Failed to get actual count:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        searchParams,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  private scheduleCleanup(downloadId: string, fileName: string) {
    // Cancel any existing cleanup timeout for this file
    const existingTimeout = this.cleanupTimeouts.get(fileName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new cleanup after 5 minutes
    const timeout = setTimeout(
      () => {
        console.log(`[DownloadManager] Cleaning up file ${fileName}`);
        this.cleanup(downloadId);
        this.cleanupTimeouts.delete(fileName);
      },
      5 * 60 * 1000
    ); // 5 minutes

    this.cleanupTimeouts.set(fileName, timeout);
  }
}

// Create and export singleton instance
export const downloadManager = new DownloadManager();
