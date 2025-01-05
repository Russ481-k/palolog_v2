import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import fs from 'fs';
import { join } from 'path';

import {
  ChunkConfig,
  ChunkProgress,
  DownloadProgress,
  OpenSearchSource,
} from '@/types/download';
import { SearchParams } from '@/types/search';
import { retry } from '@/utils/retry';

import { downloadManager } from './downloadManager';
import { OpenSearchClient } from './opensearch';

dayjs.extend(utc);
dayjs.extend(timezone);

export class DownloadChunkManager {
  private chunks: Map<string, ChunkProgress> = new Map();
  private activeDownloads: Set<string> = new Set();
  private paused: Set<string> = new Set();
  private chunkSize = 1000;

  async createChunks(
    downloadId: string,
    searchParams: SearchParams
  ): Promise<void> {
    try {
      console.log(
        '[DownloadChunkManager] Creating chunks for download:',
        downloadId
      );

      // Get total count from search params
      const totalCount = await this.getTotalCount(searchParams);
      console.log('[DownloadChunkManager] Total count:', totalCount);

      // Calculate number of chunks
      const numChunks = Math.ceil(totalCount / this.chunkSize);
      console.log('[DownloadChunkManager] Number of chunks:', numChunks);

      // Initialize download in active downloads
      this.activeDownloads.add(downloadId);

      // Create chunks and start processing
      for (let i = 0; i < numChunks; i++) {
        const offset = i * this.chunkSize;
        const limit = Math.min(this.chunkSize, totalCount - offset);
        const chunkFileName = `${downloadId}_chunk${i}`;

        // Initialize chunk progress
        const chunkProgress: ChunkProgress = {
          fileName: chunkFileName,
          downloadId,
          progress: 0,
          status: 'pending',
          processedRows: 0,
          totalRows: limit,
          startTime: new Date(),
          searchParams,
        };

        // Add chunk to chunks map
        this.chunks.set(chunkFileName, chunkProgress);

        console.log(
          `[DownloadChunkManager] Processing chunk ${i + 1}/${numChunks}`
        );

        // Update download manager with chunk creation
        this.updateDownloadProgress(downloadId);

        // Process the chunk
        await this.processChunk({
          downloadId,
          fileName: chunkFileName,
          chunkIndex: i,
          searchParams: {
            ...searchParams,
            startRow: offset,
            endRow: offset + limit - 1,
          },
        });
      }

      // Update final progress
      this.updateDownloadProgress(downloadId);

      // Remove from active downloads
      this.activeDownloads.delete(downloadId);
    } catch (error: unknown) {
      console.error('[DownloadChunkManager] Error creating chunks:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process download chunks';
      downloadManager.setError(downloadId, errorMessage);
      this.activeDownloads.delete(downloadId);
      throw error;
    }
  }

  private updateDownloadProgress(downloadId: string): void {
    // Get all chunks for this download
    const downloadChunks = Array.from(this.chunks.entries())
      .filter(([fileName]) => fileName.startsWith(downloadId))
      .map(([_, chunk]) => ({
        fileName: chunk.fileName,
        progress: chunk.progress,
        status: chunk.status,
        message: chunk.message,
        processedRows: chunk.processedRows,
        totalRows: chunk.totalRows,
      }));

    // Calculate total processed rows and total rows
    const totalProcessed = downloadChunks.reduce(
      (sum, chunk) => sum + chunk.processedRows,
      0
    );
    const totalRows = downloadChunks.reduce(
      (sum, chunk) => sum + chunk.totalRows,
      0
    );

    // Calculate chunk statistics
    const completedChunks = downloadChunks.filter(
      (chunk) => chunk.status === 'completed'
    ).length;
    const failedChunks = downloadChunks.filter(
      (chunk) => chunk.status === 'failed'
    ).length;
    const processingChunks = downloadChunks.filter(
      (chunk) => chunk.status === 'downloading'
    ).length;

    // Calculate overall progress
    const totalProgress = downloadChunks.reduce(
      (sum, chunk) => sum + chunk.progress,
      0
    );
    const percentage =
      downloadChunks.length > 0 ? totalProgress / downloadChunks.length : 0;

    // Update download manager
    downloadManager.updateProgress(downloadId, {
      processedRows: totalProcessed,
      totalRows,
      progress: percentage,
      completedChunks,
      failedChunks,
      processingChunks,
      chunks: downloadChunks,
    });
  }

  private async processChunk(config: ChunkConfig): Promise<void> {
    const { downloadId, fileName } = config;
    const chunk = this.chunks.get(fileName);
    if (!chunk) return;

    try {
      chunk.status = 'downloading';
      this.updateChunkProgress(chunk);

      await retry(
        async () => {
          await this.downloadChunk(config);
        },
        {
          retries: 3,
          onError: (error: Error) => {
            if (chunk) {
              chunk.status = 'failed';
              chunk.error =
                error instanceof Error ? error.message : String(error);
              this.updateChunkProgress(chunk);
            }
          },
        }
      );

      chunk.status = 'completed';
      chunk.endTime = new Date();
      this.updateChunkProgress(chunk);
    } catch (error) {
      chunk.status = 'failed';
      chunk.error = error instanceof Error ? error.message : String(error);
      this.updateChunkProgress(chunk);
    }
  }

  private updateChunkProgress(chunk: ChunkProgress): void {
    this.chunks.set(chunk.fileName, chunk);
    this.updateDownloadProgress(chunk.downloadId);
  }

  private async getTotalCount(searchParams: SearchParams): Promise<number> {
    // TODO: Implement actual count query
    return 10000; // Temporary mock value
  }

  private async downloadChunk(config: ChunkConfig): Promise<void> {
    const { downloadId, fileName, searchParams } = config;
    const chunk = this.chunks.get(fileName);

    if (!chunk) {
      throw new Error('Chunk not found');
    }

    if (
      searchParams.startRow === undefined ||
      searchParams.endRow === undefined
    ) {
      throw new Error('Invalid search parameters: missing startRow or endRow');
    }

    try {
      // Update chunk status to downloading
      chunk.status = 'downloading';
      this.updateChunkProgress(chunk);

      // Get total rows for this chunk
      const totalRows = searchParams.endRow - searchParams.startRow + 1;
      const batchSize = 10000; // Process 10k rows at a time

      // Create the downloads directory if it doesn't exist
      const downloadDir = join(process.cwd(), 'downloads');
      await fs.promises.mkdir(downloadDir, { recursive: true });

      let processedRows = 0;
      let firstReceiveTime: string | undefined;
      let lastReceiveTime: string | undefined;

      // Process first batch to get the time range
      const firstBatch = await this.fetchData({
        ...searchParams,
        startRow: searchParams.startRow,
        endRow: Math.min(
          searchParams.startRow + batchSize - 1,
          searchParams.endRow
        ),
      });

      if (firstBatch.firstReceiveTime && firstBatch.lastReceiveTime) {
        firstReceiveTime = firstBatch.firstReceiveTime;
        lastReceiveTime = firstBatch.lastReceiveTime;
      }

      // Generate file name with time range
      const finalFileName =
        firstReceiveTime && lastReceiveTime
          ? `${searchParams.menu}_${firstReceiveTime}-${lastReceiveTime}.csv`
          : fileName;

      const filePath = join(downloadDir, finalFileName);
      const writeStream = fs.createWriteStream(filePath);

      // Write first batch data
      if (firstBatch.data) {
        writeStream.write(firstBatch.data);
        processedRows += batchSize;

        // Update chunk progress
        chunk.processedRows = processedRows;
        chunk.progress = (processedRows / totalRows) * 100;
        chunk.fileName = finalFileName;
        this.updateChunkProgress(chunk);
      }

      // Process remaining batches
      while (processedRows < totalRows) {
        // Check if download is paused
        if (this.paused.has(downloadId)) {
          chunk.status = 'paused';
          this.updateChunkProgress(chunk);
          writeStream.end();
          return;
        }

        // Calculate the current batch size
        const currentBatchSize = Math.min(batchSize, totalRows - processedRows);
        const startRow = searchParams.startRow + processedRows;
        const endRow = startRow + currentBatchSize - 1;

        try {
          // Fetch data for the current batch
          const { data } = await this.fetchData({
            ...searchParams,
            startRow,
            endRow,
          });

          // Write data to file
          if (data) {
            writeStream.write(data);
            processedRows += currentBatchSize;

            // Update chunk progress
            chunk.processedRows = processedRows;
            chunk.progress = (processedRows / totalRows) * 100;
            chunk.fileName = finalFileName;
            this.updateChunkProgress(chunk);
          }
        } catch (error) {
          console.error(`Error processing batch: ${error}`);
          throw error;
        }
      }

      // Close the write stream
      writeStream.end();

      // Mark as completed
      chunk.processedRows = totalRows;
      chunk.progress = 100;
      chunk.status = 'completed';
      chunk.fileName = finalFileName;
      this.updateChunkProgress(chunk);
    } catch (error) {
      chunk.status = 'failed';
      chunk.error = error instanceof Error ? error.message : String(error);
      this.updateChunkProgress(chunk);
      throw error;
    }
  }

  private async fetchData(params: SearchParams): Promise<{
    data: string | null;
    firstReceiveTime?: string;
    lastReceiveTime?: string;
  }> {
    if (params.startRow === undefined || params.endRow === undefined) {
      throw new Error('Invalid search parameters: missing startRow or endRow');
    }

    const { startRow, endRow } = params;

    try {
      const client = OpenSearchClient.getInstance();

      // Convert dates to ISO8601 format
      const timeFrom = dayjs(params.timeFrom).tz('Asia/Seoul').format();
      const timeTo = dayjs(params.timeTo).tz('Asia/Seoul').format();

      const searchBody = {
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
                  logType: params.menu,
                },
              },
              ...(params.searchTerm
                ? [
                    {
                      multi_match: {
                        query: params.searchTerm,
                        fields: ['*'],
                        type: 'phrase',
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
        from: startRow,
        size: endRow - startRow + 1,
      };

      const response = await client.request<{
        hits: {
          hits: Array<{
            _source: OpenSearchSource;
          }>;
        };
      }>({
        path: '/_search',
        method: 'POST',
        body: searchBody,
      });

      // Convert the response to CSV
      const hits = response.hits.hits;
      if (!hits || hits.length === 0) return { data: null };

      // Get first and last hits
      const lastHit = hits[0];
      const firstHit = hits[hits.length - 1];

      if (!lastHit?._source || !firstHit?._source) {
        console.warn('Missing source data in search results');
        return { data: null };
      }

      const firstReceiveTime = firstHit._source.receiveTime as
        | string
        | undefined;
      const lastReceiveTime = lastHit._source.receiveTime as string | undefined;

      // Format receiveTime values for file name
      const formattedFirstTime = firstReceiveTime
        ? dayjs(firstReceiveTime).format('YYYYMMDDHHmmss')
        : undefined;
      const formattedLastTime = lastReceiveTime
        ? dayjs(lastReceiveTime).format('YYYYMMDDHHmmss')
        : undefined;

      // Get fields for CSV from the last hit (most recent)
      const fields = Object.keys(lastHit._source).sort();

      // Create CSV header
      let csv = fields.join(',') + '\n';

      // Add data rows
      hits.forEach((hit) => {
        if (!hit._source) return;
        const row = fields.map((field) => {
          const value = hit._source[field];
          // Handle special cases and escaping
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            // Escape quotes and wrap in quotes if contains comma or newline
            if (
              value.includes('"') ||
              value.includes(',') ||
              value.includes('\n')
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }
          return String(value);
        });
        csv += row.join(',') + '\n';
      });

      if (!formattedFirstTime || !formattedLastTime) {
        console.warn('Missing receiveTime in search results');
        return { data: csv };
      }

      return {
        data: csv,
        firstReceiveTime: formattedFirstTime,
        lastReceiveTime: formattedLastTime,
      };
    } catch (error) {
      console.error('Error fetching data from OpenSearch:', error);
      return { data: null };
    }
  }

  async getFilePath(fileName: string): Promise<string> {
    const chunk = this.chunks.get(fileName);
    if (!chunk || chunk.status !== 'completed') {
      throw new Error('File not found or not completed');
    }
    return join(process.cwd(), 'downloads', fileName);
  }

  updateProgress(progress: Partial<DownloadProgress>): void {
    if (!progress.fileName) return;

    const existingProgress = this.chunks.get(progress.fileName);
    if (!existingProgress) return;

    this.chunks.set(progress.fileName, {
      ...existingProgress,
      ...progress,
    });
  }

  pauseDownload(downloadId: string): void {
    this.paused.add(downloadId);
  }

  resumeDownload(downloadId: string): void {
    this.paused.delete(downloadId);
    // 일시 중지된 청크들을 다시 처리
    for (const [fileName, chunk] of this.chunks.entries()) {
      if (fileName.startsWith(downloadId) && chunk.status === 'paused') {
        const [searchId, chunkIndexStr] = fileName.split('_');
        if (searchId && chunkIndexStr) {
          const chunkIndex = parseInt(chunkIndexStr);
          const CHUNK_SIZE = 1_000_000;
          const startRow = chunkIndex * CHUNK_SIZE;
          const endRow = startRow + CHUNK_SIZE - 1;

          // Get the original search parameters from the chunk
          const originalParams = chunk.searchParams;
          if (!originalParams) {
            console.error('Missing search parameters for chunk:', fileName);
            continue;
          }

          const config: ChunkConfig = {
            downloadId,
            chunkIndex,
            fileName,
            searchParams: {
              ...originalParams,
              startRow,
              endRow,
            } as SearchParams,
          };
          this.processChunk(config);
        }
      }
    }
  }

  cancelDownload(downloadId: string): void {
    for (const [fileName, chunk] of this.chunks.entries()) {
      if (fileName.startsWith(downloadId)) {
        chunk.status = 'failed';
        chunk.message = 'Download cancelled';
        this.updateProgress(chunk);
      }
    }
  }
}

export const downloadChunkManager = new DownloadChunkManager();
