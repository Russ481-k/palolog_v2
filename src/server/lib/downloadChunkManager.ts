import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import * as fs from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';

import { getColumnNames } from '@/features/monitoring/columns';
import { ChunkProgress, SearchParams } from '@/types/download';
import { getCurrentVersion } from '@/utils/version';

import { OpenSearchClient } from './opensearch';

dayjs.extend(utc);
dayjs.extend(timezone);

const CHUNK_SIZE = 500000;

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

type ChunkStatus = 'pending' | 'downloading' | 'completed' | 'failed';

class DownloadChunkManager {
  private chunks: Map<string, ChunkProgress>;
  private downloadId: string;
  private totalRows: number;
  private processedRows: number;
  private searchParams: SearchParams;

  constructor(downloadId: string, searchParams: SearchParams) {
    this.downloadId = downloadId;
    this.chunks = new Map();
    this.totalRows = 0;
    this.processedRows = 0;
    this.searchParams = searchParams;
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

      for (let i = 0; i < numChunks; i++) {
        const fileName = `${this.searchParams.menu}_${dayjs().format('YYYYMMDD_HHmmss')}_${i + 1}of${numChunks}.csv`;
        this.chunks.set(fileName, {
          fileName,
          downloadId: this.downloadId,
          progress: 0,
          status: 'pending',
          processedRows: 0,
          totalRows: Math.min(CHUNK_SIZE, totalCount - i * CHUNK_SIZE),
          startTime: new Date(),
          searchParams: this.searchParams,
          message: 'Initializing...',
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
        });
      }

      console.log(`[DownloadChunkManager] Created ${numChunks} chunks`, {
        downloadId: this.downloadId,
        totalRows: totalCount,
        timestamp: new Date().toISOString(),
      });

      const chunkConfigs = Array.from(this.chunks.entries()).map(
        ([fileName, chunk]) => ({
          downloadId: this.downloadId,
          fileName,
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

      const downloadDir = join(process.cwd(), 'downloads');
      await fs.promises.mkdir(downloadDir, { recursive: true });

      const client = OpenSearchClient.getInstance();
      const timeFrom = dayjs(searchParams.timeFrom).tz('Asia/Seoul').format();
      const timeTo = dayjs(searchParams.timeTo).tz('Asia/Seoul').format();

      // Get current version and column names
      const currentVersion = getCurrentVersion();
      const allColumnNames = getColumnNames(currentVersion);
      // Exclude 'message' column
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
        timestamp: new Date().toISOString(),
      });

      // Initialize scroll to get first batch for header generation
      const response = await client.request<ScrollResponse>({
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
                ...(searchParams.searchTerm
                  ? [
                      {
                        multi_match: {
                          query: searchParams.searchTerm,
                          fields: ['*'],
                          type: 'phrase',
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
          _source: true,
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: 1,
        },
      });

      const firstBatch = response.hits.hits;
      if (!firstBatch || firstBatch.length === 0 || !firstBatch[0]) {
        throw new Error('No data found');
      }

      // Get actual keys from the first record and filter/sort them
      const firstRecord = firstBatch[0]._source;
      const actualKeys = Object.keys(firstRecord);
      const orderedColumnNames = actualKeys
        .filter((key) => versionColumnNames.includes(key))
        .sort(
          (a, b) =>
            versionColumnNames.indexOf(a) - versionColumnNames.indexOf(b)
        );

      // Now create the main search query with only the needed columns
      const searchBody = {
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
              ...(searchParams.searchTerm
                ? [
                    {
                      multi_match: {
                        query: searchParams.searchTerm,
                        fields: ['*'],
                        type: 'phrase',
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        _source: orderedColumnNames,
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: 10000,
        track_total_hits: true,
      };

      console.log('[DownloadChunkManager] Executing OpenSearch search query:', {
        query: searchBody,
        fileName,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });

      const filePath = join(downloadDir, fileName);
      const writeStream = createWriteStream(filePath);
      let currentScrollId: string | undefined;

      try {
        // Initialize scroll to get first batch for header generation
        let response = await client.request<ScrollResponse>({
          path: '/*/_search?scroll=5m',
          method: 'POST',
          body: searchBody,
        });

        currentScrollId = response._scroll_id;

        const firstBatch = response.hits.hits;
        if (!firstBatch || firstBatch.length === 0 || !firstBatch[0]) {
          throw new Error('No data found');
        }

        // Get actual keys from the first record
        const firstRecord = firstBatch[0]._source;
        const actualKeys = Object.keys(firstRecord);

        // Create ordered headers using only the keys that exist in the actual data
        const orderedHeaders =
          actualKeys
            .filter((key) => versionColumnNames.includes(key)) // Only keep keys that are in our version's column list
            .sort(
              (a, b) =>
                versionColumnNames.indexOf(a) - versionColumnNames.indexOf(b)
            ) // Sort according to version column order
            .map((column) =>
              column
                .replace(/([A-Z])/g, '_$1')
                .toUpperCase()
                .replace(/^_/, '')
            )
            .join(',') + '\n';

        // Store filtered and ordered column names for data rows
        const orderedColumnNames = actualKeys
          .filter((key) => versionColumnNames.includes(key))
          .sort(
            (a, b) =>
              versionColumnNames.indexOf(a) - versionColumnNames.indexOf(b)
          );

        // Write headers
        writeStream.write(orderedHeaders);

        chunk.processedRows = 0;

        // Process batches starting with the first batch
        do {
          const batch = response.hits.hits;
          if (!batch || batch.length === 0) break;

          console.log('[DownloadChunkManager] Processing batch:', {
            batchSize: batch.length,
            firstRecord: batch[0]?._source,
            lastRecord: batch[batch.length - 1]?._source,
          });

          // Process batch and write to file
          let batchData = '';
          for (const hit of batch) {
            const orderedData: Record<
              string,
              string | number | boolean | null
            > = {};
            orderedColumnNames.forEach((column: string) => {
              orderedData[column] =
                (hit._source[column] as string | number | boolean | null) ?? '';
            });

            const row =
              orderedColumnNames
                .map((column: string) => {
                  const value = orderedData[column];
                  return typeof value === 'string' &&
                    (value.includes(',') ||
                      value.includes('"') ||
                      value.includes('\n'))
                    ? `"${value.replace(/"/g, '""')}"`
                    : value === null || value === undefined
                      ? ''
                      : String(value);
                })
                .join(',') + '\n';

            batchData += row;
          }

          // Write entire batch at once
          writeStream.write(batchData);

          chunk.processedRows += batch.length;
          this.updateProgress(chunk, chunk.processedRows);

          console.log('[DownloadChunkManager] Batch processed:', {
            processedRows: chunk.processedRows,
            batchSize: batch.length,
            totalRows: chunk.totalRows,
            progress: `${((chunk.processedRows / chunk.totalRows) * 100).toFixed(1)}%`,
            fileName,
            downloadId: this.downloadId,
            timestamp: new Date().toISOString(),
          });

          if (chunk.processedRows >= chunk.totalRows) break;

          // Get next batch using scroll
          const currentScrollId = response._scroll_id;
          if (!currentScrollId) break;

          response = await client.request<ScrollResponse>({
            path: '/_search/scroll',
            method: 'POST',
            body: {
              scroll: '5m',
              scroll_id: currentScrollId,
            },
          });
        } while (true);
      } finally {
        // Close the write stream
        writeStream.end();

        if (currentScrollId) {
          try {
            await client.request({
              path: `/_search/scroll/${currentScrollId}`,
              method: 'DELETE',
            });
          } catch (error) {
            console.warn('[DownloadChunkManager] Failed to clear scroll:', {
              error: error instanceof Error ? error.message : String(error),
              scrollId: currentScrollId,
              fileName,
              downloadId: this.downloadId,
              timestamp: new Date().toISOString(),
            });
          }
        }

        const stats = await fs.promises.stat(filePath);
        console.log('[DownloadChunkManager] Chunk download completed:', {
          fileName,
          fileSize: `${(stats.size / (1024 * 1024)).toFixed(2)}MB`,
          processedRows: chunk.processedRows,
          totalRows: chunk.totalRows,
          progress: `${((chunk.processedRows / chunk.totalRows) * 100).toFixed(2)}%`,
          downloadId: this.downloadId,
          timestamp: new Date().toISOString(),
        });

        chunk.status = 'completed';
        chunk.endTime = new Date();
        chunk.progress = 100;
      }
    } catch (error) {
      console.error('[DownloadChunkManager] Failed to download chunk:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileName,
        searchParams,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });
      chunk.status = 'failed';
      chunk.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private updateProgress(chunk: ChunkProgress, processedRows: number): void {
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

    // Validate progress state
    if (chunk.progress === 100 && chunk.processedRows !== chunk.totalRows) {
      console.error('[DownloadChunkManager] Progress state mismatch:', {
        fileName: chunk.fileName,
        processedRows: chunk.processedRows,
        totalRows: chunk.totalRows,
        progress: chunk.progress,
        downloadId: this.downloadId,
        timestamp: new Date().toISOString(),
      });
      // Adjust processed rows to match total rows
      chunk.processedRows = chunk.totalRows;
    }

    // Update message with detailed progress information
    chunk.message = `Processing ${processedRows.toLocaleString()} of ${chunk.totalRows.toLocaleString()} rows (${chunk.progress.toFixed(1)}%) at ${processingSpeed.toFixed(1)} rows/sec`;

    console.log('[DownloadChunkManager] Progress updated:', {
      fileName: chunk.fileName,
      processedRows: chunk.processedRows,
      totalRows: chunk.totalRows,
      progress: `${chunk.progress.toFixed(1)}%`,
      speed: `${processingSpeed.toFixed(1)} rows/sec`,
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
    const processingChunks = chunks.filter(
      (chunk) => chunk.status === 'downloading'
    ).length;

    let status: ChunkStatus = 'pending';
    if (completedChunks === chunks.length) {
      status = 'completed';
    } else if (failedChunks > 0) {
      status = 'failed';
    } else if (processingChunks > 0) {
      status = 'downloading';
    }

    const progress = chunks.length > 0 ? totalProgress / chunks.length : 0;

    return {
      fileName: `${this.downloadId}.csv`,
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
    };
  }
}

class DownloadChunkManagerInstance {
  private managers: Map<string, DownloadChunkManager> = new Map();

  getManager(downloadId: string): DownloadChunkManager | undefined {
    return this.managers.get(downloadId);
  }

  createManager(
    downloadId: string,
    searchParams: SearchParams
  ): DownloadChunkManager {
    const manager = new DownloadChunkManager(downloadId, searchParams);
    this.managers.set(downloadId, manager);
    return manager;
  }
}

export const downloadChunkManager = new DownloadChunkManagerInstance();
