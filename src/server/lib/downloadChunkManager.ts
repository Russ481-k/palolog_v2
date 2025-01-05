import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import * as fs from 'fs';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { env } from '@/env.mjs';
import { ChunkProgress, SearchParams } from '@/types/download';

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

      const numChunks = Math.ceil(totalCount / CHUNK_SIZE);
      console.log(`[DownloadChunkManager] Total count: ${totalCount}`);

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
        });
      }

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

    console.log('OpenSearch count query:', countQuery);

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

    console.log('OpenSearch count response:', response);
    return response.hits.total.value;
  }

  private async downloadChunk(config: ChunkConfig): Promise<void> {
    const { downloadId, fileName, searchParams } = config;
    if (!searchParams) throw new Error('Search parameters are required');

    const chunk = this.chunks.get(fileName);
    if (!chunk) throw new Error('Chunk not found');

    try {
      const downloadDir = join(process.cwd(), 'downloads');
      await fs.promises.mkdir(downloadDir, { recursive: true });

      const client = OpenSearchClient.getInstance();
      const timeFrom = dayjs(searchParams.timeFrom).tz('Asia/Seoul').format();
      const timeTo = dayjs(searchParams.timeTo).tz('Asia/Seoul').format();

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
        _source: ['message'],
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: 10000,
      };

      const filePath = join(downloadDir, fileName);
      const writeStream = createWriteStream(filePath);

      let processedRows = 0;
      let scrollId: string | undefined;

      try {
        // Initialize scroll
        const initialResponse = await client.request<ScrollResponse>({
          path: '/*/_search?scroll=2m&size=10000',
          method: 'POST',
          body: searchBody,
        });

        scrollId = initialResponse._scroll_id;

        // Process initial batch
        const initialBatch = initialResponse.hits.hits;
        if (initialBatch.length > 0) {
          const header = 'message\n';
          await pipeline(Readable.from([header]), writeStream);

          const rows = initialBatch
            .map((hit: OpenSearchHit) => hit._source.message)
            .filter(
              (message: unknown): message is string =>
                typeof message === 'string'
            )
            .map((message: string) => `${message}\n`);

          await pipeline(Readable.from(rows), writeStream);

          processedRows += rows.length;
          this.updateProgress(chunk, processedRows);
        }

        // Continue scrolling
        while (scrollId && processedRows < chunk.totalRows) {
          const scrollResponse: ScrollResponse =
            await client.request<ScrollResponse>({
              path: '/_search/scroll',
              method: 'POST',
              body: {
                scroll: '2m',
                scroll_id: scrollId,
              },
            });

          scrollId = scrollResponse._scroll_id;
          const batch = scrollResponse.hits.hits;

          if (batch.length === 0) break;

          const rows = batch
            .map((hit: OpenSearchHit) => hit._source.message)
            .filter(
              (message: unknown): message is string =>
                typeof message === 'string'
            )
            .map((message: string) => `${message}\n`);

          await pipeline(Readable.from(rows), writeStream);

          processedRows += rows.length;
          this.updateProgress(chunk, processedRows);
        }
      } finally {
        if (scrollId) {
          try {
            await client.request({
              path: `/_search/scroll/${scrollId}`,
              method: 'DELETE',
            });
          } catch (error) {
            console.warn('Failed to clear scroll context:', error);
          }
        }
        writeStream.end();
      }

      const stats = await fs.promises.stat(filePath);
      console.log('Batch processed:', {
        batchSize: `${(stats.size / (1024 * 1024)).toFixed(2)}MB`,
        processedRows,
        totalRows: chunk.totalRows,
        progress: `${((processedRows / chunk.totalRows) * 100).toFixed(2)}%`,
      });

      chunk.status = 'completed';
      chunk.endTime = new Date();
      chunk.processedRows = processedRows;
      chunk.progress = 100;
    } catch (error) {
      console.error('Error downloading chunk:', error);
      chunk.status = 'failed';
      chunk.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private updateProgress(chunk: ChunkProgress, processedRows: number): void {
    chunk.processedRows = processedRows;
    chunk.progress = (processedRows / chunk.totalRows) * 100;
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
}

export const downloadChunkManager = {
  createManager: (downloadId: string, searchParams: SearchParams) => {
    return new DownloadChunkManager(downloadId, searchParams);
  },
};
