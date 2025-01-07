import { beforeEach, describe, expect, it } from 'vitest';

import { DownloadManager } from '../downloadManager';

describe('DownloadManager', () => {
  let downloadManager: DownloadManager;

  beforeEach(() => {
    downloadManager = new DownloadManager();
  });

  it('creates a new download', () => {
    const id = 'test-id';
    const totalRows = 1000000;
    const status = downloadManager.createDownload(id, totalRows);

    expect(status).toEqual({
      id,
      totalRows,
      processedRows: 0,
      percentage: 0,
      status: 'preparing',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      files: [],
      totalChunks: 1,
      completedChunks: 0,
      failedChunks: 0,
      processingChunks: 0,
    });
  });

  it('updates download progress', () => {
    const id = 'test-id';
    const totalRows = 1000000;
    downloadManager.createDownload(id, totalRows);

    downloadManager.updateProgress(id, {
      processedRows: 500000,
      status: 'downloading',
      message: 'Processing...',
      totalChunks: 20,
      completedChunks: 10,
      failedChunks: 0,
      processingChunks: 1,
    });

    const progress = downloadManager.getProgress(id);
    expect(progress).toMatchObject({
      processedRows: 500000,
      totalRows: 1000000,
      status: 'downloading',
      message: 'Processing...',
      totalChunks: 20,
      completedChunks: 10,
      failedChunks: 0,
      processingChunks: 1,
      files: [],
    });
    expect(progress?.progress).toBeGreaterThanOrEqual(0);
  });

  it('handles download failure', () => {
    const id = 'test-id';
    const totalRows = 1000000;
    downloadManager.createDownload(id, totalRows);

    downloadManager.setError(id, 'Download failed');

    const progress = downloadManager.getProgress(id);
    expect(progress?.status).toBe('failed');
    expect(progress?.error).toBe('Download failed');
  });

  it('handles pause and resume', () => {
    const id = 'test-id';
    const totalRows = 1000000;
    downloadManager.createDownload(id, totalRows);

    downloadManager.pauseDownload(id);
    expect(downloadManager.getProgress(id)?.status).toBe('preparing');
    expect(downloadManager.getProgress(id)?.message).toBe('Download paused');

    downloadManager.resumeDownload(id);
    expect(downloadManager.getProgress(id)?.status).toBe('downloading');
    expect(downloadManager.getProgress(id)?.message).toBe('Download resumed');
  });

  it('handles download cancellation', () => {
    const id = 'test-id';
    const totalRows = 1000000;
    downloadManager.createDownload(id, totalRows);

    downloadManager.cancelDownload(id);
    const progress = downloadManager.getProgress(id);
    expect(progress?.status).toBe('failed');
    expect(progress?.message).toBe('Download cancelled by user');
  });

  it('cleans up downloads', () => {
    const id = 'test-id';
    const totalRows = 1000000;
    downloadManager.createDownload(id, totalRows);

    downloadManager.cleanup(id);
    expect(downloadManager.getProgress(id)).toBeNull();
  });
});
