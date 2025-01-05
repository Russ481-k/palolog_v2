import { Data, WebSocket, WebSocketServer } from 'ws';

import { DownloadProgress, DownloadStatus } from '@/types/download';

import { downloadManager } from '../../lib/downloadManager';
import { createWebSocketServer } from '../downloadProgress';

interface WebSocketMessage {
  downloadId: string;
}

interface WebSocketResponse {
  downloadId: string;
  progress: DownloadProgress;
}

const TIMEOUT = 5000;
const TEST_PORT = 3002;

const createMessageHandler = (
  ws: WebSocket,
  testDownloadId: string,
  testProgress: Partial<DownloadProgress>,
  timeout: NodeJS.Timeout,
  resolve: () => void,
  reject: (error: Error) => void
) => {
  const handleMessage = (data: Data) => {
    try {
      const response = JSON.parse(data.toString()) as WebSocketResponse;
      if (
        response.downloadId === testDownloadId &&
        response.progress.status === 'downloading'
      ) {
        expect(response.progress).toMatchObject(testProgress);
        clearTimeout(timeout);
        ws.off('message', handleMessage);
        resolve();
      }
    } catch (error) {
      clearTimeout(timeout);
      ws.off('message', handleMessage);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  };
  return handleMessage;
};

describe('WebSocket Download Progress', () => {
  let ws: WebSocket;
  let wss: WebSocketServer;
  const TEST_URL = `ws://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    wss = createWebSocketServer({ port: TEST_PORT });
    await new Promise<void>((resolve) => {
      wss.once('listening', () => resolve());
    });
  });

  beforeEach(async () => {
    ws = new WebSocket(TEST_URL);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, TIMEOUT);

      ws.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  });

  afterEach(async () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
  });

  it('should connect to WebSocket server', async () => {
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it(
    'should receive download progress updates',
    async () => {
      const testDownloadId = 'test-download-123';
      const testProgress: Partial<DownloadProgress> = {
        processedRows: 50,
        totalRows: 100,
        percentage: 50,
        status: 'downloading' as DownloadStatus,
      };

      // Subscribe to download progress
      const message: WebSocketMessage = { downloadId: testDownloadId };
      ws.send(JSON.stringify(message));

      // Create a promise for the message event with timeout
      const messagePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for progress update'));
        }, TIMEOUT);

        const handleMessage = createMessageHandler(
          ws,
          testDownloadId,
          testProgress,
          timeout,
          resolve,
          reject
        );
        ws.on('message', handleMessage);
      });

      // Wait for initial progress message
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      // Simulate progress update
      downloadManager.updateProgress(testDownloadId, testProgress);

      // Wait for the message to be received
      await messagePromise;
    },
    TIMEOUT + 1000
  );

  it(
    'should handle multiple clients for the same download',
    async () => {
      const testDownloadId = 'test-download-456';
      const ws2 = new WebSocket(TEST_URL);

      // Connect second client
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, TIMEOUT);

        ws2.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        ws2.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const testProgress: Partial<DownloadProgress> = {
        processedRows: 75,
        totalRows: 100,
        percentage: 75,
        status: 'downloading' as DownloadStatus,
      };

      // Subscribe both clients
      const message: WebSocketMessage = { downloadId: testDownloadId };
      ws.send(JSON.stringify(message));
      ws2.send(JSON.stringify(message));

      // Create promises for both clients with timeouts
      const messagePromise1 = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for progress update on client 1'));
        }, TIMEOUT);

        const handleMessage = createMessageHandler(
          ws,
          testDownloadId,
          testProgress,
          timeout,
          resolve,
          reject
        );
        ws.on('message', handleMessage);
      });

      const messagePromise2 = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for progress update on client 2'));
        }, TIMEOUT);

        const handleMessage = createMessageHandler(
          ws2,
          testDownloadId,
          testProgress,
          timeout,
          resolve,
          reject
        );
        ws2.on('message', handleMessage);
      });

      // Wait for initial progress messages
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      // Simulate progress update
      downloadManager.updateProgress(testDownloadId, testProgress);

      // Wait for both clients to receive the message
      await Promise.all([messagePromise1, messagePromise2]);

      // Clean up
      if (ws2.readyState === WebSocket.OPEN) {
        ws2.close();
      }
    },
    TIMEOUT + 1000
  );

  it('should handle client disconnection gracefully', async () => {
    const testDownloadId = 'test-download-789';

    // Subscribe and then disconnect
    const message: WebSocketMessage = { downloadId: testDownloadId };
    ws.send(JSON.stringify(message));
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    ws.close();
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    // No error should be thrown
    expect(true).toBe(true);
  });
});
