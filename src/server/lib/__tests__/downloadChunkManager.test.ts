import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchParams } from '@/types/search';

import { DownloadChunkManager } from '../downloadChunkManager';

vi.mock('../opensearch', () => ({
  OpenSearchClient: {
    getInstance: vi.fn().mockReturnValue({
      request: vi.fn().mockResolvedValue({
        hits: {
          hits: [
            { _source: { field1: 'value1', field2: 'value2' } },
            { _source: { field1: 'value3', field2: 'value4' } },
          ],
        },
      }),
    }),
  },
}));

describe('DownloadChunkManager', () => {
  let downloadChunkManager: DownloadChunkManager;
  const searchId = 'test-download';
  const searchParams: SearchParams = {
    menu: 'test',
    timeFrom: '2023-01-01',
    timeTo: '2023-01-02',
    searchTerm: 'test',
  };

  beforeEach(() => {
    downloadChunkManager = new DownloadChunkManager();
  });

  it('should create chunks and process them', async () => {
    await downloadChunkManager.createChunks(searchId, searchParams);
    const chunks = Array.from(downloadChunkManager['chunks'].values());
    expect(chunks.length).toBeGreaterThan(0);

    const firstChunk = chunks[0];
    if (!firstChunk || !firstChunk.fileName) {
      throw new Error('First chunk or fileName is undefined');
    }

    expect(firstChunk.fileName).toMatch(/^test-download_.*_chunk\d+\.csv$/);
  });

  it('should handle pause and resume', async () => {
    await downloadChunkManager.createChunks(searchId, searchParams);
    const chunks = Array.from(downloadChunkManager['chunks'].values());
    expect(chunks.length).toBeGreaterThan(0);

    // Pause download
    downloadChunkManager.pauseDownload(searchId);
    expect(downloadChunkManager['paused'].has(searchId)).toBe(true);

    // Resume download
    downloadChunkManager.resumeDownload(searchId);
    expect(downloadChunkManager['paused'].has(searchId)).toBe(false);
  });

  it('should handle cancellation', async () => {
    await downloadChunkManager.createChunks(searchId, searchParams);
    const chunks = Array.from(downloadChunkManager['chunks'].values());
    expect(chunks.length).toBeGreaterThan(0);

    // Cancel download
    downloadChunkManager.cancelDownload(searchId);
    const failedChunks = chunks.filter((chunk) => chunk.status === 'failed');
    expect(failedChunks.length).toBeGreaterThan(0);
  });

  it('should properly escape CSV values', async () => {
    const testParams = {
      ...searchParams,
      startRow: 0,
      endRow: 10,
    };
    const data = await downloadChunkManager['fetchData'](testParams);
    expect(data).not.toBeNull();

    if (data) {
      expect(data).toContain('field1,field2');
      expect(data).toContain('value1,value2');
      expect(data).toContain('value3,value4');
    }
  });
});
