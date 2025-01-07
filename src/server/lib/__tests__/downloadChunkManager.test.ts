import { describe, expect, it, vi } from 'vitest';

import { SearchParams } from '@/types/download';

import { downloadChunkManager } from '../downloadChunkManager';

type DownloadChunk = {
  fileName: string;
};

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
  const searchId = 'test-download';
  const searchParams: SearchParams = {
    menu: 'TRAFFIC',
    timeFrom: '2023-01-01',
    timeTo: '2023-01-02',
    searchTerm: 'test',
  };

  it('should create chunks and process them', async () => {
    const instance = downloadChunkManager.createManager(searchId, searchParams);
    await instance.createChunks();
    const chunks = Array.from(instance['chunks'].values()) as DownloadChunk[];
    expect(chunks.length).toBeGreaterThan(0);

    const firstChunk = chunks[0];
    if (!firstChunk || !firstChunk.fileName) {
      throw new Error('First chunk or fileName is undefined');
    }

    expect(firstChunk.fileName).toMatch(/^TRAFFIC_.*\.csv$/);
  });
});
