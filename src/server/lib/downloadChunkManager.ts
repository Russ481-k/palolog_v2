import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { join } from 'path';

import { getColumnNames } from '@/features/monitoring/columns';
import { ChunkProgress, DownloadStatus, SearchParams } from '@/types/download';
import { getCurrentVersion } from '@/utils/version';

import { downloadManager } from './downloadManager';
import { FileManager } from './fileManager';
import { OpenSearchClient } from './opensearch';

dayjs.extend(utc);
dayjs.extend(timezone);

const CHUNK_SIZE = 500000;

interface ChunkConfig {
  downloadId: string;
  fileId: string;
  searchParams: SearchParams;
}

interface OpenSearchSource {
  message?: string;
  [key: string]: unknown;
}

interface OpenSearchHit {
  _source: OpenSearchSource;
}

interface ScrollResponse {
  _scroll_id: string;
  hits: {
    hits: OpenSearchHit[];
  };
}

interface WebSocketMessage {
  type: 'connected' | 'progress';
  fileName?: string;
  clientFileName?: string;
  downloadId?: string;
  progress?: number;
  status?: DownloadStatus;
  message?: string;
  processedRows?: number;
  totalRows?: number;
  size?: number;
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
  timestamp?: string;
  searchParams?: {
    timeFrom: string;
    timeTo: string;
  };
  totalProgress?: {
    progress: number;
    status: DownloadStatus;
    processedRows: number;
    totalRows: number;
    processingSpeed: number;
    estimatedTimeRemaining: number;
    message: string;
  };
  chunks?: Array<{
    fileName: string;
    progress: number;
    status: DownloadStatus;
    message: string;
    processedRows: number;
    totalRows: number;
    size: number;
  }>;
}

class DownloadChunkManager {
  private chunks: Map<string, ChunkProgress> = new Map();
  private downloadId: string;
  private searchParams: SearchParams;
  private totalRows: number;
  private eventEmitter: EventEmitter;
  private fileManager: FileManager;

  constructor(downloadId: string, searchParams: SearchParams) {
    this.downloadId = downloadId;
    this.searchParams = searchParams;
    this.totalRows = 0;
    this.eventEmitter = new EventEmitter();
    this.fileManager = new FileManager();
  }

  public onFileReady(listener: (message: WebSocketMessage) => void): void {
    this.eventEmitter.on('file_ready', listener);
  }

  public offFileReady(listener: (message: WebSocketMessage) => void): void {
    this.eventEmitter.off('file_ready', listener);
  }

  public onGenerationProgress(
    listener: (message: WebSocketMessage) => void
  ): void {
    this.eventEmitter.on('generation_progress', listener);
  }

  public offGenerationProgress(
    listener: (message: WebSocketMessage) => void
  ): void {
    this.eventEmitter.off('generation_progress', listener);
  }

  public async createChunks(): Promise<void> {
    try {
      const totalCount = await this.getTotalCount();
      this.totalRows = totalCount;

      if (totalCount === 0) {
        throw new Error('No records found matching the search criteria');
      }

      const numChunks = Math.ceil(totalCount / CHUNK_SIZE);
      console.log(
        `[DownloadChunkManager] Creating ${numChunks} chunks for ${totalCount} records`
      );

      const timestamp = dayjs().format('YYYY-MM-DD_HH:mm:ss');

      for (let i = 0; i < numChunks; i++) {
        const fileInfo = this.fileManager.createFile(
          this.searchParams.menu,
          timestamp,
          i + 1,
          numChunks
        );

        const chunkProgress: ChunkProgress = {
          fileName: fileInfo.displayName,
          fileInfo,
          downloadId: this.downloadId,
          progress: 0,
          status: 'pending',
          processedRows: 0,
          totalRows: Math.min(CHUNK_SIZE, totalCount - i * CHUNK_SIZE),
          startTime: new Date(),
          searchParams: this.searchParams,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          message: 'Initializing...',
        };

        this.chunks.set(fileInfo.id, chunkProgress);
      }

      console.log(`[DownloadChunkManager] Created ${numChunks} chunks`, {
        downloadId: this.downloadId,
        totalRows: totalCount,
        timestamp: new Date().toISOString(),
      });

      const chunkConfigs = Array.from(this.chunks.entries()).map(
        ([fileId, chunk]) => ({
          downloadId: this.downloadId,
          fileId,
          searchParams: {
            ...this.searchParams,
            from: 0,
            size: chunk.totalRows,
          },
        })
      );

      await Promise.all(
        chunkConfigs.map((config) => this.downloadChunk(config))
      );
    } catch (error) {
      console.error('[DownloadChunkManager] Error creating chunks:', error);
      throw error;
    }
  }

  private async getTotalCount(): Promise<number> {
    const client = OpenSearchClient.getInstance();
    const timeFrom = dayjs(this.searchParams.timeFrom)
      .tz('Asia/Seoul')
      .format();
    const timeTo = dayjs(this.searchParams.timeTo).tz('Asia/Seoul').format();

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
                logType: this.searchParams.menu,
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

    console.log('[DownloadChunkManager] Executing OpenSearch count query:', {
      query: countQuery,
      searchParams: this.searchParams,
      downloadId: this.downloadId,
      timestamp: new Date().toISOString(),
    });

    try {
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

      console.log('[DownloadChunkManager] OpenSearch count response:', {
        response,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });

      if (!response.hits?.total?.value) {
        throw new Error(
          'Invalid response from OpenSearch: missing total hits value'
        );
      }

      return response.hits.total.value;
    } catch (error) {
      console.error(
        '[DownloadChunkManager] Failed to get total count from OpenSearch:',
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          query: countQuery,
          searchParams: this.searchParams,
          downloadId: this.downloadId,
          timestamp: new Date().toISOString(),
        }
      );
      throw error;
    }
  }

  private async downloadChunk(config: ChunkConfig): Promise<void> {
    const { fileId, searchParams } = config;
    if (!searchParams) throw new Error('Search parameters are required');

    const chunk = this.chunks.get(fileId);
    if (!chunk) throw new Error('Chunk not found');

    let writeStream: fs.WriteStream | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    try {
      console.log('[DownloadChunkManager] Starting chunk download:', {
        fileId,
        fileName: chunk.fileInfo.displayName,
        searchParams,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });

      // Update status to generating
      chunk.status = 'generating';
      this.updateProgress(chunk, 0);

      const client = OpenSearchClient.getInstance();
      const timeFrom = dayjs(searchParams.timeFrom).tz('Asia/Seoul').format();
      const timeTo = dayjs(searchParams.timeTo).tz('Asia/Seoul').format();

      // Get current version and column names
      const currentVersion = getCurrentVersion();
      const allColumnNames = getColumnNames(currentVersion);

      // Create write stream
      writeStream = this.fileManager.createWriteStream(chunk.fileInfo);

      let processedRows = 0;
      let scrollId: string | null = null;

      // Process data in batches with retry logic
      do {
        try {
          // Get batch of data
          const response: ScrollResponse = await client.request<ScrollResponse>(
            {
              path: scrollId ? '/_search/scroll' : '/*/_search?scroll=5m',
              method: 'POST',
              body: scrollId
                ? {
                    scroll: '5m',
                    scroll_id: scrollId,
                  }
                : {
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
                    _source: allColumnNames,
                    sort: [{ '@timestamp': 'asc' }],
                    size: 10000,
                    track_total_hits: true,
                  },
            }
          );

          scrollId = response._scroll_id;
          const hits = response.hits.hits;

          if (hits.length === 0) break;

          // Reset retry count on successful request
          retryCount = 0;

          // Process hits and write to file
          await new Promise<void>((resolve, reject) => {
            let buffer = '';
            hits.forEach((hit: OpenSearchHit) => {
              const row = allColumnNames
                .map((column) => {
                  const value = hit._source[column];
                  return value !== undefined
                    ? String(value).replace(/,/g, ';')
                    : '';
                })
                .join(',');
              buffer += row + '\n';
            });

            writeStream!.write(buffer, (error: Error | null | undefined) => {
              if (error) reject(error);
              else resolve();
            });
          });

          processedRows += hits.length;
          this.updateProgress(chunk, processedRows);
        } catch (error) {
          console.error('[DownloadChunkManager] Error in batch processing:', {
            error: error instanceof Error ? error.message : String(error),
            retryCount,
            scrollId,
            downloadId: this.downloadId,
            timestamp: new Date().toISOString(),
          });

          if (retryCount >= MAX_RETRIES) {
            throw new Error(
              `Failed after ${MAX_RETRIES} retries: ${error instanceof Error ? error.message : String(error)}`
            );
          }

          retryCount++;
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000)
          );
          continue;
        }
      } while (scrollId);

      // Clean up scroll if exists
      if (scrollId) {
        await client.request({
          path: `/_search/scroll/${scrollId}`,
          method: 'DELETE',
        });
      }

      // Close write stream
      await new Promise<void>((resolve, reject) => {
        writeStream!.end((error: Error | null | undefined) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // Update final status
      chunk.status = 'ready';
      chunk.progress = 100;
      chunk.processedRows = chunk.totalRows;
      this.updateProgress(chunk, chunk.totalRows);

      console.log('[DownloadChunkManager] File generation completed:', {
        fileId: chunk.fileInfo.id,
        fileName: chunk.fileInfo.displayName,
        status: chunk.status,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });

      // Update DownloadManager status and emit events
      try {
        const fileStatus = {
          fileName: chunk.fileInfo.displayName,
          status: 'ready' as const,
          progress: 100,
          processedRows: chunk.totalRows,
          totalRows: chunk.totalRows,
          message: 'File is ready for download',
          downloadId: this.downloadId,
          fileInfo: chunk.fileInfo,
        };

        console.log(
          '[DownloadChunkManager] Updating DownloadManager with status:',
          {
            fileStatus,
            downloadId: this.downloadId,
            timestamp: new Date().toISOString(),
          }
        );

        downloadManager.updateProgress(this.downloadId, fileStatus);

        console.log('[DownloadChunkManager] Emitting file_ready event:', {
          type: 'file_ready',
          fileName: chunk.fileInfo.displayName,
          status: 'ready',
          downloadId: this.downloadId,
          timestamp: new Date().toISOString(),
        });

        // Emit file_ready event
        this.eventEmitter.emit('file_ready', {
          type: 'file_ready',
          ...fileStatus,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(
          '[DownloadChunkManager] Failed to update download status:',
          {
            error: error instanceof Error ? error.message : String(error),
            fileName: chunk.fileInfo.displayName,
            downloadId: this.downloadId,
            timestamp: new Date().toISOString(),
          }
        );

        // Retry update after a short delay
        setTimeout(() => {
          try {
            downloadManager.updateProgress(this.downloadId, {
              fileName: chunk.fileInfo.displayName,
              status: 'ready',
              progress: 100,
              processedRows: chunk.totalRows,
              totalRows: chunk.totalRows,
              message: 'File is ready for download',
              downloadId: this.downloadId,
            });
          } catch (retryError) {
            console.error('[DownloadChunkManager] Retry failed:', {
              error:
                retryError instanceof Error
                  ? retryError.message
                  : String(retryError),
              fileName: chunk.fileInfo.displayName,
              downloadId: this.downloadId,
              timestamp: new Date().toISOString(),
            });
          }
        }, 1000);
      }
    } catch (error) {
      console.error('[DownloadChunkManager] Error downloading chunk:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileId,
        fileName: chunk.fileInfo.displayName,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });

      chunk.status = 'failed';
      chunk.message = error instanceof Error ? error.message : String(error);
      this.updateProgress(chunk, chunk.processedRows);

      throw error;
    } finally {
      // Ensure write stream is closed in case of error
      if (writeStream) {
        writeStream.end();
      }
    }
  }

  private getProgressMessage(
    status: DownloadStatus,
    processedRows: number,
    totalRows: number
  ): string {
    switch (status) {
      case 'completed':
        return 'File is ready for download';
      case 'failed':
        return 'File generation failed';
      case 'generating':
        return `Generating file... ${processedRows.toLocaleString()} of ${totalRows.toLocaleString()} rows`;
      case 'downloading':
        return `Processing ${processedRows.toLocaleString()} of ${totalRows.toLocaleString()} rows`;
      default:
        return 'Preparing file...';
    }
  }

  private updateProgress(chunk: ChunkProgress, processedRows: number): void {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - chunk.startTime.getTime()) / 1000;
    const speed = elapsedTime > 0 ? processedRows / elapsedTime : 0;
    const remainingRows = chunk.totalRows - processedRows;
    const estimatedTimeRemaining = speed > 0 ? remainingRows / speed : 0;
    const progress = (processedRows / chunk.totalRows) * 100;

    const updatedChunk: ChunkProgress = {
      fileName: chunk.fileInfo.displayName,
      fileInfo: chunk.fileInfo,
      downloadId: chunk.downloadId,
      progress,
      status: chunk.status,
      processedRows,
      totalRows: chunk.totalRows,
      startTime: chunk.startTime,
      searchParams: chunk.searchParams,
      processingSpeed: speed,
      estimatedTimeRemaining,
      message: this.getProgressMessage(
        chunk.status,
        processedRows,
        chunk.totalRows
      ),
    };

    this.chunks.set(chunk.fileInfo.id, updatedChunk);

    // Emit generation_progress event
    if (chunk.status === 'generating' || chunk.status === 'ready') {
      this.eventEmitter.emit('generation_progress', {
        type: 'generation_progress',
        downloadId: this.downloadId,
        fileName: chunk.fileInfo.displayName,
        status: chunk.status,
        progress,
        processedRows,
        totalRows: chunk.totalRows,
        message: updatedChunk.message,
        timestamp: new Date().toISOString(),
      });

      // Update DownloadManager with the same status
      downloadManager.updateProgress(this.downloadId, {
        fileName: chunk.fileInfo.displayName,
        status: chunk.status,
        progress,
        processedRows,
        totalRows: chunk.totalRows,
        message: updatedChunk.message,
      });
    }

    console.log('[DownloadChunkManager] Progress updated:', {
      fileName: chunk.fileInfo.displayName,
      processedRows,
      totalRows: chunk.totalRows,
      progress: `${progress.toFixed(1)}%`,
      speed: `${speed.toFixed(1)} rows/sec`,
      estimatedTimeRemaining: `${estimatedTimeRemaining.toFixed(1)} sec`,
      downloadId: this.downloadId,
      timestamp: new Date().toISOString(),
    });
  }

  public getProgress(): ChunkProgress[] {
    return Array.from(this.chunks.values());
  }

  public getChunk(fileName: string): ChunkProgress | undefined {
    return this.chunks.get(fileName);
  }

  public async cleanup(): Promise<void> {
    const downloadDir = join(process.cwd(), 'downloads');
    for (const [fileName] of this.chunks) {
      try {
        await fs.promises.unlink(join(downloadDir, fileName));
      } catch (error) {
        console.warn(`Failed to delete file ${fileName}:`, error);
      }
    }
  }

  public getCurrentProgress(): ChunkProgress {
    const chunks = Array.from(this.chunks.values());
    const totalProcessedRows = chunks.reduce(
      (sum, chunk) => sum + (chunk.processedRows || 0),
      0
    );
    const totalProgress = chunks.reduce(
      (sum, chunk) => sum + (chunk.progress || 0),
      0
    );
    const completedChunks = chunks.filter(
      (chunk) => chunk.status === 'completed'
    ).length;
    const failedChunks = chunks.filter(
      (chunk) => chunk.status === 'failed'
    ).length;
    const generatingChunks = chunks.filter(
      (chunk) => chunk.status === 'generating'
    ).length;
    const readyChunks = chunks.filter(
      (chunk) => chunk.status === 'ready'
    ).length;
    const processingChunks = chunks.filter(
      (chunk) => chunk.status === 'downloading'
    ).length;

    let status: DownloadStatus = 'pending';
    if (completedChunks === chunks.length) {
      status = 'completed';
    } else if (failedChunks > 0) {
      status = 'failed';
    } else if (generatingChunks > 0) {
      status = 'generating';
    } else if (readyChunks > 0) {
      status = 'ready';
    } else if (processingChunks > 0) {
      status = 'downloading';
    }

    const progress = chunks.length > 0 ? totalProgress / chunks.length : 0;

    // Use the first chunk's information if available
    const firstChunk = chunks[0];
    const chunkProgress: ChunkProgress = {
      fileName: firstChunk?.fileName || '',
      fileInfo: firstChunk?.fileInfo || {
        id: this.downloadId,
        displayName: '',
        path: '',
      },
      downloadId: this.downloadId,
      progress,
      status,
      processedRows: totalProcessedRows,
      totalRows: firstChunk?.totalRows || 0,
      startTime: firstChunk?.startTime || new Date(),
      searchParams: firstChunk?.searchParams || this.searchParams,
      processingSpeed: firstChunk?.processingSpeed || 0,
      estimatedTimeRemaining: firstChunk?.estimatedTimeRemaining || 0,
      message: this.getProgressMessage(
        status,
        totalProcessedRows,
        firstChunk?.totalRows || 0
      ),
    };

    return chunkProgress;
  }
}

class DownloadChunkManagerInstance {
  private managers: Map<string, DownloadChunkManager> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private cleanupInterval: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_AGE = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.cleanupInterval = setInterval(
      () => this.cleanupOldManagers(),
      this.CLEANUP_INTERVAL
    );
  }

  private cleanupOldManagers(): void {
    const now = Date.now();
    for (const [downloadId, manager] of this.managers.entries()) {
      const chunks = Array.from(manager['chunks'].values());
      const lastUpdated = Math.max(
        ...chunks.map((chunk) => chunk.startTime.getTime())
      );

      if (now - lastUpdated > this.MAX_AGE) {
        console.log('[DownloadChunkManagerInstance] Cleaning up old manager:', {
          downloadId,
          age: Math.round((now - lastUpdated) / 1000 / 60) + ' minutes',
          timestamp: new Date().toISOString(),
        });

        this.managers.delete(downloadId);
      }
    }
  }

  public cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.managers.clear();
    this.eventEmitter.removeAllListeners();
  }

  getManager(downloadId: string): DownloadChunkManager | undefined {
    return this.managers.get(downloadId);
  }

  createManager(
    downloadId: string,
    searchParams: SearchParams
  ): DownloadChunkManager {
    const manager = new DownloadChunkManager(downloadId, searchParams);
    this.managers.set(downloadId, manager);

    // Forward events from the manager to the instance's event emitter
    manager.onFileReady((message: WebSocketMessage) => {
      console.log(
        '[DownloadChunkManagerInstance] Forwarding file_ready event:',
        {
          downloadId: message.downloadId,
          fileName: message.fileName,
          status: message.status,
          timestamp: new Date().toISOString(),
        }
      );
      this.eventEmitter.emit('file_ready', message);
    });

    manager.onGenerationProgress((message: WebSocketMessage) => {
      console.log(
        '[DownloadChunkManagerInstance] Forwarding generation_progress event:',
        {
          downloadId: message.downloadId,
          fileName: message.fileName,
          status: message.status,
          progress: message.progress,
          timestamp: new Date().toISOString(),
        }
      );
      this.eventEmitter.emit('generation_progress', message);
    });

    return manager;
  }

  on(event: string, listener: (message: WebSocketMessage) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (message: WebSocketMessage) => void): void {
    this.eventEmitter.off(event, listener);
  }
}

export const downloadChunkManager = new DownloadChunkManagerInstance();
