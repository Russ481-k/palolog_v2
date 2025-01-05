import { EventEmitter } from 'events';

import { DownloadProgress } from '@/types/download';

// Simplified status types with clear progression
export type DownloadStatus = 'downloading' | 'completed' | 'failed' | 'paused';

export class DownloadManager {
  private downloads: Map<string, DownloadProgress> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  createDownload(downloadId: string, totalRows: number): { id: string } {
    // Remove duplicate 'download-' prefix
    const cleanId = downloadId.replace(/^download-/, '');
    const finalId = `download-${cleanId}`;

    const initialProgress: DownloadProgress = {
      fileName: `${finalId}.csv`,
      downloadId: finalId,
      processedRows: 0,
      totalRows,
      progress: 0,
      status: 'downloading',
      startTime: new Date(),
      lastUpdateTime: Date.now(),
      lastProcessedCount: 0,
      processingSpeed: 0,
      estimatedTimeRemaining: 0,
      totalChunks: Math.ceil(totalRows / 1000), // Assuming chunk size of 1000
      completedChunks: 0,
      failedChunks: 0,
      processingChunks: 0,
      chunks: [],
    };

    this.downloads.set(finalId, initialProgress);
    this.eventEmitter.emit(`progress:${finalId}`, finalId, initialProgress);

    return { id: finalId };
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

    // Update status based on chunks
    if (completedChunks === existingProgress.totalChunks) {
      updatedProgress.status = 'completed';
      updatedProgress.endTime = new Date();
    } else if (failedChunks > 0) {
      updatedProgress.status = 'failed';
    } else if (processingChunks > 0) {
      updatedProgress.status = 'downloading';
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
    this.downloads.delete(downloadId);
    this.eventEmitter.removeAllListeners(`progress:${downloadId}`);
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
}

export const downloadManager = new DownloadManager();
