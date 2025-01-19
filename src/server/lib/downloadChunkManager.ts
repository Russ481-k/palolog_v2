import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';

import { DOWNLOAD_CONFIG } from '@/config/constants';
import { getColumnNames } from '@/features/monitoring/columns';
import {
  ChunkProgress,
  DownloadStatus,
  SearchParams,
  WebSocketMessage,
} from '@/types/download';
import { getCurrentVersion } from '@/utils/version';

import { downloadManager } from './downloadManager';
import { OpenSearchClient } from './opensearch';

dayjs.extend(utc);
dayjs.extend(timezone);

interface ChunkConfig {
  downloadId: string;
  fileName: string;
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

export class DownloadChunkManager {
  public downloadId: string;
  private searchParams: SearchParams;
  private chunks: Map<string, ChunkProgress> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private totalRows: number;

  constructor(downloadId: string, searchParams: SearchParams) {
    this.downloadId = downloadId;
    this.searchParams = searchParams;
    this.totalRows = 0;
  }

  public onFileReady(listener: (message: WebSocketMessage) => void): void {
    this.eventEmitter.on('file_ready', listener);
  }

  public onProgressUpdate(listener: (message: WebSocketMessage) => void): void {
    this.eventEmitter.on('progress_update', listener);
  }

  public offProgressUpdate(
    listener: (message: WebSocketMessage) => void
  ): void {
    this.eventEmitter.off('progress_update', listener);
  }

  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  public async createChunks(): Promise<void> {
    try {
      const totalCount = await this.getTotalCount();
      this.totalRows = totalCount;

      if (totalCount === 0) {
        throw new Error('No records found matching the search criteria');
      }

      const CHUNK_SIZE = 500000;
      const numChunks = Math.ceil(totalCount / CHUNK_SIZE);
      console.log(
        `[DownloadChunkManager] Creating ${numChunks} chunks for ${totalCount} records`
      );

      for (let i = 0; i < numChunks; i++) {
        const startRow = i * CHUNK_SIZE;
        const chunkSize = Math.min(CHUNK_SIZE, totalCount - startRow);
        const serverFileName = `${this.downloadId}_${i + 1}.csv`;

        // Get the file info from downloadManager
        const fileInfo = downloadManager.getDownload(serverFileName);
        if (!fileInfo) {
          console.error('[DownloadChunkManager] File info not found:', {
            downloadId: this.downloadId,
            serverFileName,
            timestamp: new Date().toISOString(),
          });
          throw new Error(`File information not found for ${serverFileName}`);
        }

        const chunkProgress: ChunkProgress = {
          fileName: serverFileName,
          clientFileName: fileInfo.clientFileName,
          downloadId: this.downloadId,
          progress: 0,
          status: 'generating',
          processedRows: 0,
          totalRows: chunkSize,
          startTime: new Date(),
          searchParams: this.searchParams,
          message: 'Initializing...',
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          size: 0,
          firstReceiveTime: undefined,
          lastReceiveTime: undefined,
        };

        this.chunks.set(serverFileName, chunkProgress);

        console.log(
          `[DownloadChunkManager] Created chunk ${i + 1} of ${numChunks}`,
          {
            downloadId: this.downloadId,
            fileName: serverFileName,
            clientFileName: fileInfo.clientFileName,
            status: 'generating',
            startRow,
            chunkSize,
            timestamp: new Date().toISOString(),
          }
        );

        // Process each chunk serially
        await this.downloadChunk({
          downloadId: this.downloadId,
          fileName: serverFileName,
          searchParams: this.searchParams,
        });
      }
    } catch (error) {
      console.error('[DownloadChunkManager] Error creating chunks:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });
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
    const { fileName, searchParams } = config;
    if (!searchParams) throw new Error('Search parameters are required');

    const chunk = this.chunks.get(fileName);
    if (!chunk) throw new Error('Chunk not found');

    try {
      console.log('[DownloadChunkManager] Starting chunk download:', {
        fileName,
        searchParams,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
        chunkDetails: {
          totalRows: chunk.totalRows,
          processedRows: chunk.processedRows,
          status: chunk.status,
        },
      });

      // Update status to generating
      chunk.status = 'generating';
      console.log('[DownloadChunkManager] Updated updateProgress 1:', {
        fileName: chunk.fileName,
        timestamp: new Date().toISOString(),
      });
      this.updateProgress(chunk, 0);

      const downloadDir = join(process.cwd(), 'downloads');
      await fs.promises.mkdir(downloadDir, { recursive: true }).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to create download directory: ${errorMessage}`);
      });

      const client = OpenSearchClient.getInstance();
      const timeFrom = dayjs(searchParams.timeFrom).tz('Asia/Seoul').format();
      const timeTo = dayjs(searchParams.timeTo).tz('Asia/Seoul').format();

      // Get current version and column names
      const currentVersion = getCurrentVersion();
      const allColumnNames = getColumnNames(currentVersion);
      const versionColumnNames = allColumnNames.filter(
        (column) => column !== 'message'
      );

      console.log('[DownloadChunkManager] OpenSearch query parameters:', {
        timeFrom,
        timeTo,
        menu: searchParams.menu,
        searchTerm: searchParams.searchTerm,
        downloadId: this.downloadId,
        fileName,
        chunkSize: chunk.totalRows,
        timestamp: new Date().toISOString(),
      });

      // Initialize scroll with chunk-specific parameters
      const response = await client
        .request<ScrollResponse>({
          path: '/*/_search?scroll=5m',
          method: 'POST',
          body: {
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
            _source: versionColumnNames,
            sort: [{ '@timestamp': 'asc' }],
            size: Math.min(10000, chunk.totalRows - chunk.processedRows),
            from: chunk.processedRows,
            track_total_hits: true,
          },
        })
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          throw new Error(`OpenSearch query failed: ${errorMessage}`);
        });

      // Process the response and write to file
      const filePath = join(downloadDir, fileName);
      const writeStream = createWriteStream(filePath);

      // Write headers only if this is the first chunk
      const headers = versionColumnNames.join(',') + '\n';
      writeStream.write(headers);

      let scrollId = response._scroll_id;
      let processedRows = 0;
      let hits = response.hits.hits;

      while (hits.length > 0 && processedRows < chunk.totalRows) {
        // Process hits
        for (const hit of hits) {
          if (processedRows >= chunk.totalRows) break;

          // Track first and last receiveTime
          const row = versionColumnNames
            .map((column) => {
              const value = hit._source[column];
              return value !== undefined
                ? String(value).replace(/,/g, ';')
                : '';
            })
            .join(',');

          // Get receiveTime from the first column of the row
          const rowData = row.split(',');
          const receiveTime = rowData[0]; // First column is receiveTime

          if (processedRows === 0) {
            chunk.firstReceiveTime = receiveTime;
            console.log('[DownloadChunkManager] Set firstReceiveTime:', {
              fileName: chunk.fileName,
              firstReceiveTime: chunk.firstReceiveTime,
              receiveTime,
              timestamp: new Date().toISOString(),
            });
          }

          // Always update lastReceiveTime as we process each row
          chunk.lastReceiveTime = receiveTime;

          if (processedRows === chunk.totalRows - 1) {
            console.log('[DownloadChunkManager] Set lastReceiveTime:', {
              fileName: chunk.fileName,
              lastReceiveTime: chunk.lastReceiveTime,
              receiveTime,
              timestamp: new Date().toISOString(),
            });
          }

          writeStream.write(row + '\n');
          processedRows++;

          // Update file size every 1000 rows
          if (processedRows % 10000 === 0) {
            try {
              const stats = fs.statSync(filePath);
              chunk.size = stats.size; // Store size in bytes
            } catch (error) {
              console.error('[DownloadChunkManager] Error getting file size:', {
                error: error instanceof Error ? error.message : String(error),
                filePath,
                downloadId: this.downloadId,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
        console.log('[DownloadChunkManager] Updated updateProgress 2:', {
          fileName: chunk.fileName,
          timestamp: new Date().toISOString(),
        });
        // Update progress
        this.updateProgress(chunk, processedRows);

        // Break if we've reached the chunk's limit
        if (processedRows >= chunk.totalRows) break;

        const scrollResponse = await client.request<ScrollResponse>({
          path: '/_search/scroll',
          method: 'POST',
          body: {
            scroll: '5m',
            scroll_id: scrollId,
          },
        });

        scrollId = scrollResponse._scroll_id;
        hits = scrollResponse.hits.hits;
      }

      // Clean up scroll
      await client.request({
        path: `/_search/scroll/${scrollId}`,
        method: 'DELETE',
      });

      // Close write stream
      writeStream.end();

      // Update final status
      chunk.status = 'ready';
      chunk.progress = 100;
      chunk.processedRows = chunk.totalRows;

      console.log('[DownloadChunkManager] Updated updateProgress 3:', {
        fileName: chunk.fileName,
        timestamp: new Date().toISOString(),
      });
      this.updateProgress(chunk, chunk.totalRows);

      console.log('[DownloadChunkManager] File ready:', {
        fileName,
        downloadId: this.downloadId,
        processedRows,
        totalRows: chunk.totalRows,
        timestamp: new Date().toISOString(),
      });

      // Emit file_ready event
      this.eventEmitter.emit('file_ready', {
        type: 'file_ready',
        downloadId: this.downloadId,
        fileName: chunk.fileName,
        clientFileName: chunk.clientFileName,
        status: 'ready',
        progress: 100,
        processedRows: chunk.totalRows,
        totalRows: chunk.totalRows,
        processingSpeed: chunk.processingSpeed,
        estimatedTimeRemaining: 0,
        size: chunk.size,
        firstReceiveTime: chunk.firstReceiveTime,
        lastReceiveTime: chunk.lastReceiveTime,
        message: 'File is ready for download',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DownloadChunkManager] Error downloading chunk:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileName,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });

      const chunk = this.chunks.get(fileName);
      if (chunk) {
        chunk.status = 'failed';
        chunk.message = error instanceof Error ? error.message : String(error);
        console.log('[DownloadChunkManager] Updated updateProgress 4:', {
          fileName: chunk.fileName,
          timestamp: new Date().toISOString(),
        });
        this.updateProgress(chunk, chunk.processedRows);
      }

      throw error;
    }
  }

  private updateProgress(chunk: ChunkProgress, processedRows: number): void {
    // console.log('======[DownloadChunkManager] updateProgress======:', {
    //   chunk,
    //   fileName: chunk.fileName,
    //   processedRows,
    //   timestamp: new Date().toISOString(),
    // });
    const now = new Date();
    const elapsedTime = (now.getTime() - chunk.startTime.getTime()) / 1000; // in seconds
    const processingSpeed = processedRows / elapsedTime; // rows per second

    chunk.processedRows = processedRows;
    chunk.progress = Math.min(100, (processedRows / chunk.totalRows) * 100);

    // Calculate estimated time remaining
    const remainingRows = chunk.totalRows - processedRows;
    const estimatedTimeRemaining = remainingRows / processingSpeed; // in seconds

    chunk.processingSpeed = processingSpeed;
    chunk.estimatedTimeRemaining = estimatedTimeRemaining;

    // Update message with detailed progress information
    chunk.message = `Processing ${processedRows.toLocaleString()} of ${chunk.totalRows.toLocaleString()} rows (${chunk.progress.toFixed(1)}%) at ${processingSpeed.toFixed(1)} rows/sec`;

    // Emit progress update event
    const progressMessage = {
      type: 'progress',
      downloadId: this.downloadId,
      fileName: chunk.fileName,
      clientFileName: chunk.clientFileName,
      status: chunk.status,
      progress: chunk.progress,
      processedRows: chunk.processedRows,
      totalRows: chunk.totalRows,
      processingSpeed: chunk.processingSpeed,
      estimatedTimeRemaining: chunk.estimatedTimeRemaining,
      size: chunk.size,
      firstReceiveTime: chunk.firstReceiveTime,
      lastReceiveTime: chunk.lastReceiveTime,
      message: chunk.message,
      timestamp: new Date().toISOString(),
    };

    console.log('[DownloadChunkManager] Emitting progress_update event:', {
      // ...progressMessage,
      // sizeInMB: (chunk.size / (1024 * 1024)).toFixed(2) + ' MB',
      // timeRange:
      //   chunk.firstReceiveTime && chunk.lastReceiveTime
      //     ? `${new Date(chunk.firstReceiveTime).toLocaleTimeString()} ~ ${new Date(chunk.lastReceiveTime).toLocaleTimeString()}`
      //     : 'Not available',
      // timestamp: new Date().toISOString(),
    });

    this.eventEmitter.emit('progress_update', progressMessage);
  }

  public getProgress(): ChunkProgress[] {
    const chunks = Array.from(this.chunks.values());
    console.log('[DownloadChunkManager] Current chunks:', {
      downloadId: this.downloadId,
      chunks: chunks.map((c) => ({
        fileName: c.fileName,
        clientFileName: c.clientFileName,
        status: c.status,
        progress: c.progress,
      })),
      timestamp: new Date().toISOString(),
    });
    return chunks;
  }

  public getChunk(fileName: string): ChunkProgress | undefined {
    console.log('[DownloadChunkManager] Looking for chunk:', {
      searchFileName: fileName,
      availableFiles: Array.from(this.chunks.entries()).map(([_, chunk]) => ({
        fileName: chunk.fileName,
        clientFileName: chunk.clientFileName,
        status: chunk.status,
      })),
      timestamp: new Date().toISOString(),
    });
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
    const processingChunks = chunks.filter(
      (chunk) => chunk.status === 'downloading'
    ).length;

    let status: DownloadStatus = 'generating';
    if (completedChunks === chunks.length) {
      status = 'completed';
    } else if (failedChunks > 0) {
      status = 'failed';
    } else if (processingChunks > 0) {
      status = 'downloading';
    }

    const progress = chunks.length > 0 ? totalProgress / chunks.length : 0;

    // Use the first chunk's filename if available, otherwise generate a new one
    const firstChunk = chunks[0];
    const fileName =
      firstChunk?.fileName ||
      `${this.searchParams.menu}_${dayjs().format('YYYY-MM-DD_HH:mm:ss')}_1of1.csv`;

    return {
      fileName,
      downloadId: this.downloadId,
      progress: Math.min(100, progress),
      status,
      processedRows: totalProcessedRows,
      totalRows: this.totalRows,
      startTime: new Date(),
      searchParams: this.searchParams,
      message: `Processing ${totalProcessedRows} of ${this.totalRows} rows...`,
      processingSpeed: 0,
      estimatedTimeRemaining: 0,
      size: 0,
    };
  }
}

class DownloadChunkManagerInstance {
  private managers: Map<string, DownloadChunkManager> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  getManager(downloadId: string): DownloadChunkManager | undefined {
    console.log('[DownloadChunkManager] Getting manager:', {
      downloadId,
      managers: Array.from(this.managers.keys()),
      timestamp: new Date().toISOString(),
    });

    return this.managers.get(downloadId);
  }

  getActiveManagers(): DownloadChunkManager[] {
    return Array.from(this.managers.values());
  }

  createManager(
    downloadId: string,
    searchParams: SearchParams
  ): DownloadChunkManager {
    console.log('[DownloadChunkManager] Creating new manager:', {
      downloadId,
      existingManagers: Array.from(this.managers.keys()),
      timestamp: new Date().toISOString(),
    });

    const manager = new DownloadChunkManager(downloadId, searchParams);
    this.managers.set(downloadId, manager);

    // Forward events from the manager to the instance's event emitter
    manager.onFileReady((message: WebSocketMessage) => {
      this.eventEmitter.emit('file_ready', message);
    });

    manager.onProgressUpdate((message: WebSocketMessage) => {
      this.eventEmitter.emit('progress_update', message);
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
