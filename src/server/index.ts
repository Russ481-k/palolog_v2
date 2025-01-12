import { createServer } from 'http';
import { Server } from 'socket.io';

import { env } from '@/env.mjs';
import { DownloadProgress } from '@/types/download';

import { downloadChunkManager } from './lib/downloadChunkManager';
import { downloadManager } from './lib/downloadManager';

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
      'http://localhost:8080',
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

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Client disconnected:', {
      id: socket.id,
      reason,
      timestamp: new Date().toISOString(),
    });
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
    const { downloadId, searchId, searchParams, totalRows } = message;
    console.log('[Socket.IO] Client subscribing to download updates:', {
      socketId: socket.id,
      downloadId,
      searchId,
      timestamp: new Date().toISOString(),
    });

    // Send connected response
    socket.emit('connected', {
      downloadId,
      timestamp: new Date().toISOString(),
    });

    // Handle download progress updates
    const unsubscribe = downloadManager.onProgressUpdate(
      downloadId,
      (downloadId: string, progress: DownloadProgress) => {
        socket.emit('progress', {
          type: 'progress',
          ...progress,
          timestamp: new Date().toISOString(),
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
      const { id } = await downloadManager.createDownload(
        downloadId,
        actualCount,
        searchParams
      );

      const manager = downloadChunkManager.createManager(id, searchParams);
      await manager.createChunks();

      // Send initial progress
      socket.emit('progress', {
        type: 'progress',
        downloadId,
        progress: 0,
        status: 'downloading',
        processedRows: 0,
        totalRows: actualCount,
        message: 'Starting download...',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Socket.IO] Failed to start download:', {
        error: error instanceof Error ? error.message : String(error),
        downloadId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('error', {
        downloadId,
        message: 'Failed to start download',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });
});

httpServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[Server] Socket.IO server is running on port ${WS_PORT}`);
});
