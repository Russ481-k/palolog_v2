import dayjs from 'dayjs';
import { EventEmitter } from 'events';
import fs from 'fs';

import {
  ChunkProgress,
  DownloadProgress as ClientDownloadProgress,
  DownloadStatus,
  SearchParams,
} from '../../types/download';
import { OpenSearchClient } from '../lib/opensearch';

export interface TotalProgress {
  downloadId: string;
  files: (ClientDownloadProgress & { clientFileName?: string })[];
  timestamp: string;
  overallProgress: {
    progress: number;
    status: DownloadStatus;
    processedRows: number;
    totalRows: number;
    message: string;
  };
}

export class DownloadManager {
  private downloads: Map<string, ClientDownloadProgress> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private cleanupTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private downloadToFiles: Map<string, Set<string>> = new Map(); // Track files for each download ID

  initializeFiles(downloadId: string, files: ChunkProgress[]) {
    // Create a new set to track files for this download
    const fileSet = new Set<string>();
    this.downloadToFiles.set(downloadId, fileSet);

    files.forEach((file) => {
      const progress: ClientDownloadProgress = {
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
      fileSet.add(file.fileName);

      // Emit individual file progress
      this.eventEmitter.emit(
        `progress:${downloadId}:${file.fileName}`,
        downloadId,
        progress
      );

      // Also emit overall download progress
      this.emitDownloadProgress(downloadId);
    });
  }

  private emitDownloadProgress(downloadId: string) {
    const fileSet = this.downloadToFiles.get(downloadId);
    if (!fileSet) return;

    const files = Array.from(fileSet).map(
      (fileName) => this.downloads.get(fileName)!
    );
    const totalProgress = {
      downloadId,
      files,
      timestamp: new Date().toISOString(),
      overallProgress: this.calculateOverallProgress(files),
    };

    this.eventEmitter.emit(`progress:${downloadId}`, downloadId, totalProgress);
  }

  private calculateOverallProgress(files: ClientDownloadProgress[]) {
    const total = files.reduce((acc, file) => acc + file.totalRows, 0);
    const processed = files.reduce((acc, file) => acc + file.processedRows, 0);
    const progress = total > 0 ? (processed / total) * 100 : 0;

    const allCompleted = files.every((file) => file.status === 'completed');
    const anyFailed = files.some((file) => file.status === 'failed');
    const anyGenerating = files.some((file) => file.status === 'generating');
    const anyDownloading = files.some((file) => file.status === 'downloading');

    let status: DownloadStatus = 'pending';
    if (allCompleted) status = 'completed';
    else if (anyFailed) status = 'failed';
    else if (anyGenerating) status = 'generating';
    else if (anyDownloading) status = 'downloading';

    return {
      progress: Math.min(100, progress),
      status,
      processedRows: processed,
      totalRows: total,
      message: this.getProgressMessage(status, processed, total),
    };
  }

  private getProgressMessage(
    status: DownloadStatus,
    processed: number,
    total: number
  ): string {
    switch (status) {
      case 'completed':
        return 'All files are ready for download';
      case 'failed':
        return 'Some files failed to generate';
      case 'generating':
        return `Generating files... ${processed.toLocaleString()} of ${total.toLocaleString()} rows`;
      case 'downloading':
        return `Processing ${processed.toLocaleString()} of ${total.toLocaleString()} rows`;
      default:
        return 'Preparing files...';
    }
  }

  private generateInternalFileName(
    downloadId: string,
    index: number,
    total: number
  ): string {
    return `${downloadId}_${index + 1}of${total}.csv`;
  }

  private generateClientFileName(
    menu: string,
    index: number,
    total: number
  ): string {
    const timestamp = dayjs().format('YYYY-MM-DD_HH:mm:ss');
    return `${menu}_${timestamp}_${index + 1}of${total}.csv`;
  }

  async createDownload(
    downloadId: string,
    totalRows: number,
    searchParams: SearchParams
  ): Promise<{ id: string }> {
    const finalId = downloadId.startsWith('download-')
      ? downloadId
      : `download-${downloadId}`;

    try {
      const actualCount = await this.getActualCount(searchParams);
      console.log('[DownloadManager] Creating download:', {
        downloadId: finalId,
        expectedRows: totalRows,
        actualCount,
        timestamp: new Date().toISOString(),
      });

      const CHUNK_SIZE = 500000;
      const numFiles = Math.ceil(actualCount / CHUNK_SIZE);
      const files = Array.from({ length: numFiles }, (_, index) => {
        const internalFileName = this.generateInternalFileName(
          finalId,
          index,
          numFiles
        );
        const clientFileName = this.generateClientFileName(
          searchParams.menu,
          index,
          numFiles
        );

        const fileInfo = {
          id: internalFileName.replace('.csv', ''),
          displayName: clientFileName,
          path: `./downloads/${internalFileName}`,
        };

        return {
          fileName: internalFileName,
          clientFileName,
          downloadId: finalId,
          size: 0,
          status: 'pending' as const,
          progress: 0,
          processedRows: 0,
          totalRows: Math.min(CHUNK_SIZE, actualCount - index * CHUNK_SIZE),
          message: 'Initializing...',
          searchParams,
          startTime: new Date(),
          lastUpdateTime: Date.now(),
          lastProcessedCount: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          totalChunks: numFiles,
          completedChunks: 0,
          failedChunks: 0,
          processingChunks: 0,
          chunks: [],
          fileInfo,
        };
      });

      // Initialize all files
      const fileSet = new Set<string>();
      this.downloadToFiles.set(finalId, fileSet);

      files.forEach((file) => {
        this.downloads.set(file.fileName, file);
        fileSet.add(file.fileName);

        console.log('[DownloadManager] Initializing file:', {
          downloadId: finalId,
          internalFileName: file.fileName,
          clientFileName: file.clientFileName,
          fileIdentifier: this.getFileIdentifier(file.fileName),
          timestamp: new Date().toISOString(),
        });

        this.eventEmitter.emit(
          `progress:${finalId}:${file.fileName}`,
          finalId,
          file
        );
      });

      this.emitDownloadProgress(finalId);

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

  private getFileIdentifier(fileName: string): string {
    // 파일명에서 _1of1 패턴을 추출
    const match = fileName.match(/(\d+of\d+)\.csv$/);
    return match?.[1] || fileName;
  }

  private findMatchingFile(
    fileName: string
  ): ClientDownloadProgress | undefined {
    const fileIdentifier = this.getFileIdentifier(fileName);

    for (const [key, value] of this.downloads.entries()) {
      // 내부 파일명, 클라이언트 파일명, 식별자로 매칭
      if (
        key === fileName ||
        value.clientFileName === fileName ||
        this.getFileIdentifier(key) === fileIdentifier
      ) {
        return value;
      }
    }
    return undefined;
  }

  updateProgress(
    downloadId: string,
    progress: Partial<ClientDownloadProgress>
  ): void {
    if (!progress.fileName) {
      console.warn(
        `[DownloadManager] No fileName provided for progress update: ${downloadId}`
      );
      return;
    }

    console.log('[DownloadManager] Received progress update:', {
      downloadId,
      fileName: progress.fileName,
      clientFileName: progress.clientFileName,
      status: progress.status,
      progress: progress.progress,
      processedRows: progress.processedRows,
      totalRows: progress.totalRows,
      timestamp: new Date().toISOString(),
    });

    const existingProgress = this.findMatchingFile(progress.fileName);

    if (!existingProgress) {
      console.warn('[DownloadManager] No download found for file:', {
        requestedFileName: progress.fileName,
        fileIdentifier: this.getFileIdentifier(progress.fileName),
        availableFiles: Array.from(this.downloads.keys()),
        downloadId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 동일한 상태와 진행률인 경우 업데이트 스킵
    if (
      progress.status === existingProgress.status &&
      progress.processedRows === existingProgress.processedRows &&
      progress.progress === existingProgress.progress
    ) {
      console.log('[DownloadManager] Skipping duplicate progress update:', {
        downloadId,
        fileName: progress.fileName,
        status: existingProgress.status,
        progress: existingProgress.progress,
        processedRows: existingProgress.processedRows,
        totalRows: existingProgress.totalRows,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log('[DownloadManager] Updating progress:', {
      downloadId,
      fileName: progress.fileName,
      currentStatus: existingProgress.status,
      newStatus: progress.status,
      currentProgress: existingProgress.progress,
      newProgress: progress.progress,
      currentProcessedRows: existingProgress.processedRows,
      newProcessedRows: progress.processedRows,
      timestamp: new Date().toISOString(),
    });

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

    // Update progress percentage based on actual total rows
    const progressPercentage = Math.min(
      100,
      (processedRows / existingProgress.totalRows) * 100
    );

    const updatedProgress: ClientDownloadProgress = {
      ...existingProgress,
      ...progress,
      progress: progressPercentage,
      processingSpeed: speed,
      estimatedTimeRemaining: remaining,
      lastUpdateTime: currentTime,
      lastProcessedCount: processedRows,
      clientFileName:
        existingProgress.clientFileName || progress.clientFileName,
      message: this.getProgressMessage(
        progress.status ?? existingProgress.status,
        processedRows,
        existingProgress.totalRows
      ),
    };

    // Update status based on progress
    if (progressPercentage >= 100 && updatedProgress.status === 'generating') {
      console.log('[DownloadManager] Updating status to ready:', {
        downloadId,
        fileName: progress.fileName,
        previousStatus: updatedProgress.status,
        timestamp: new Date().toISOString(),
      });
      updatedProgress.status = 'ready';
      updatedProgress.message = 'File is ready for download';
    }

    this.downloads.set(existingProgress.fileName, updatedProgress);

    // Emit progress update event
    this.eventEmitter.emit(
      `progress:${downloadId}:${existingProgress.fileName}`,
      downloadId,
      updatedProgress
    );

    // Also emit overall download progress
    this.emitDownloadProgress(downloadId);

    // If status is ready, emit file_ready event
    if (updatedProgress.status === 'ready') {
      console.log('[DownloadManager] Emitting file_ready event:', {
        downloadId,
        fileName: existingProgress.fileName,
        status: updatedProgress.status,
        timestamp: new Date().toISOString(),
      });
      this.eventEmitter.emit(
        `file_ready:${downloadId}:${existingProgress.fileName}`,
        downloadId,
        updatedProgress
      );
    }
  }

  getProgress(downloadId: string): ClientDownloadProgress | undefined {
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
    callback: (downloadId: string, progress: TotalProgress) => void
  ): () => void {
    const eventName = `progress:${downloadId}`;
    this.eventEmitter.on(
      eventName,
      (downloadId: string, progress: TotalProgress) => {
        callback(downloadId, progress);
      }
    );

    // Send initial progress if available
    const fileSet = this.downloadToFiles.get(downloadId);
    if (fileSet) {
      const files = Array.from(fileSet).map((fileName) => {
        const progress = this.downloads.get(fileName)!;
        return {
          ...progress,
          clientFileName: progress.clientFileName || fileName,
        };
      });
      const totalProgress = {
        downloadId,
        files,
        timestamp: new Date().toISOString(),
        overallProgress: this.calculateOverallProgress(files),
      };
      callback(downloadId, totalProgress);
    }

    return () => {
      this.eventEmitter.removeListener(eventName, callback);
    };
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
    const fileSet = this.downloadToFiles.get(downloadId);
    if (!fileSet) return;

    // Clean up all files for this download
    for (const fileName of fileSet) {
      const progress = this.downloads.get(fileName);
      if (!progress) continue;

      // Remove from downloads map
      this.downloads.delete(fileName);

      // Cancel any pending cleanup
      const timeout = this.cleanupTimeouts.get(fileName);
      if (timeout) {
        clearTimeout(timeout);
        this.cleanupTimeouts.delete(fileName);
      }

      // Delete the physical file
      try {
        const filePath = `./downloads/${fileName}`;
        fs.unlinkSync(filePath);
        console.log(`[DownloadManager] Deleted file ${filePath}`);
      } catch (error) {
        console.error(`[DownloadManager] Error deleting file:`, error);
      }
    }

    // Clean up the file set
    this.downloadToFiles.delete(downloadId);

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

  getDownload(downloadId: string): ClientDownloadProgress | undefined {
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

  pauseDownload(downloadId: string): void {
    const fileSet = this.downloadToFiles.get(downloadId);
    if (fileSet) {
      for (const fileName of fileSet) {
        const progress = this.downloads.get(fileName);
        if (progress && progress.status === 'downloading') {
          this.updateProgress(downloadId, {
            fileName,
            status: 'pending',
            message: 'Download paused',
          });
        }
      }
    }
  }
}

// Create and export singleton instance
export const downloadManager = new DownloadManager();
