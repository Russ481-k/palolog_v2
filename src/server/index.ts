import dayjs from 'dayjs';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { env } from '@/env.mjs';
import { DownloadProgress as ClientDownloadProgress } from '@/types/download';

import { downloadChunkManager } from './lib/downloadChunkManager';
import {
  DownloadFile,
  TotalProgress,
  downloadManager,
} from './lib/downloadManager';

console.log('[Server] Starting Socket.IO server initialization...');
console.log('NEXT_PUBLIC_ENV_NAME : ', env.NEXT_PUBLIC_ENV_NAME);

const WS_PORT =
  Number(env.NEXT_PUBLIC_WS_PORT) ||
  (env.NEXT_PUBLIC_ENV_NAME === 'LOCAL' ? 3001 : 8001);

console.log('[Server] Environment:', env.NEXT_PUBLIC_ENV_NAME);
console.log('[Server] Socket.IO Port:', WS_PORT);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: [
      env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:8080',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/api/ws/download',
  transports: ['websocket', 'polling'],
  pingTimeout: 20000,
  pingInterval: 10000,
  connectTimeout: 45000,
  allowUpgrades: true,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8,
});

console.log('[Server] Socket.IO server configuration:', {
  cors: {
    origins: [
      env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:8000',
      'http://localhost:8001',
    ],
  },
  path: '/api/ws/download',
  timestamp: new Date().toISOString(),
});

io.on('connection', (socket) => {
  console.log('[Socket.IO] New client connection:', {
    id: socket.id,
    handshake: {
      headers: socket.handshake.headers,
      query: socket.handshake.query,
      auth: socket.handshake.auth,
    },
    timestamp: new Date().toISOString(),
  });

  socket.on('disconnect', async (reason) => {
    console.log('[Socket.IO] Client disconnected:', {
      id: socket.id,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Cleanup any active downloads for this socket
    if (socket.data.downloadId) {
      try {
        await downloadManager.cleanup(socket.data.downloadId);
      } catch (error) {
        console.error('[Socket.IO] Failed to cleanup download:', {
          error: error instanceof Error ? error.message : String(error),
          downloadId: socket.data.downloadId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  socket.on('error', (error) => {
    console.error('[Socket.IO] Socket error:', {
      id: socket.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('subscribe', async (message) => {
    const { downloadId, searchId } = message;
    console.log('[Socket.IO] Client subscribing to download updates:', {
      socketId: socket.id,
      downloadId,
      searchId,
      timestamp: new Date().toISOString(),
    });

    // Store downloadId in socket data
    socket.data.downloadId = downloadId;

    // Send connected response
    socket.emit('connected', {
      downloadId,
      timestamp: new Date().toISOString(),
    });

    // Handle download progress updates
    const unsubscribe = downloadManager.onProgressUpdate(
      downloadId,
      (downloadId: string, progress: TotalProgress) => {
        console.log('[Socket.IO] Download progress update:', {
          downloadId,
          progress,
          timestamp: new Date().toISOString(),
        });
        progress.files?.forEach((file: DownloadFile) => {
          if (file.status === 'progress') {
            socket.emit('progress_update', {
              type: 'progress',
              downloadId,
              fileName: file.fileName,
              clientFileName: file.clientFileName,
              status: file.status,
              progress: file.progress,
              processedRows: file.processedRows,
              totalRows: file.totalRows,
              message: file.message,
              timestamp: new Date().toISOString(),
            });
          } else if (file.status === 'generating') {
            socket.emit('generation', {
              type: 'generation',
              downloadId,
              fileName: file.downloadId,
              clientFileName: file.clientFileName,
              status: file.status,
              progress: file.progress,
              processedRows: file.processedRows,
              totalRows: file.totalRows,
              message: file.message,
              timestamp: new Date().toISOString(),
            });
          } else if (file.status === 'ready') {
            socket.emit('file_ready', {
              type: 'file_ready',
              downloadId,
              fileName: file.fileName,
              clientFileName: file.clientFileName,
              status: file.status,
              progress: 100,
              processedRows: file.totalRows,
              totalRows: file.totalRows,
              message: 'File is ready for download',
              timestamp: new Date().toISOString(),
            });
          } else if (
            file.status === 'downloading' ||
            file.status === 'completed'
          ) {
            socket.emit('download_progress', {
              type: 'download_progress',
              downloadId,
              fileName: file.fileName,
              clientFileName: file.clientFileName,
              status: file.status,
              progress: file.progress,
              processedRows: file.processedRows,
              totalRows: file.totalRows,
              message: file.message,
              timestamp: new Date().toISOString(),
            });
          }
        });
      }
    );

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Client disconnected:', {
        id: socket.id,
        downloadId,
        timestamp: new Date().toISOString(),
      });
      unsubscribe();
    });
  });

  socket.on('start_download', async (message) => {
    const { downloadId, searchId, searchParams, totalRows } = message;
    try {
      // Get actual count from OpenSearch
      const actualCount = await downloadManager.getActualCount(searchParams);

      // Send count update
      socket.emit('count_update', {
        downloadId,
        expectedRows: totalRows,
        actualRows: actualCount,
        timestamp: new Date().toISOString(),
      });

      // Start download process
      const { servedDownloadId } = await downloadManager.createDownload(
        downloadId,
        actualCount,
        searchParams
      );

      const manager = downloadChunkManager.createManager(
        servedDownloadId,
        searchParams
      );

      // Add progress_update event listener
      manager.onProgressUpdate((message) => {
        socket.emit('progress_update', message);
      });

      await manager.createChunks();

      // Send initial progress with client file names

      socket.emit('file_ready', {
        type: 'file_ready',
        downloadId,
        fileName: `${downloadId}.csv`,
        clientFileName: `${searchParams.menu}_${dayjs().format('YYYY-MM-DD_HH:mm:ss')}_1of1.csv`,
        progress: 0,
        status: 'ready',
        processedRows: 0,
        totalRows: actualCount,
        message: 'File ready for download',
        searchParams,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Socket.IO] Failed to start download:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        downloadId,
        searchId,
        searchParams,
        timestamp: new Date().toISOString(),
      });

      socket.emit('error', {
        type: 'error',
        downloadId,
        fileName: `${downloadId}.csv`,
        clientFileName: `${searchParams.menu}_${dayjs().format('YYYY-MM-DD_HH:mm:ss')}_1of1.csv`,
        status: 'failed',
        progress: 0,
        processedRows: 0,
        totalRows: totalRows,
        message:
          error instanceof Error ? error.message : 'Failed to start download',
        error: error instanceof Error ? error.stack : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });
});

httpServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[Server] Socket.IO server is running on port ${WS_PORT}`);
});
