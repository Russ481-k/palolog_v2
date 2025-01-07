import { Server as HttpServer } from 'http';
import { Socket } from 'net';
import { WebSocket, WebSocketServer } from 'ws';

import { DownloadProgress } from '@/types/download';

import { downloadChunkManager } from '../lib/downloadChunkManager';
import { downloadManager } from '../lib/downloadManager';

interface WebSocketServerConfig {
  server?: HttpServer;
  port?: number;
}

export function createWebSocketServer(
  config: WebSocketServerConfig
): WebSocketServer {
  console.log('[WebSocket] Creating WebSocket server with config:', config);
  const wss = new WebSocketServer({
    ...config,
    path: '/api/ws/download',
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientAddress = (req.socket as Socket).remoteAddress;
    console.log(`[WebSocket] New connection attempt from ${clientAddress}`);

    // Send initial connection acknowledgment
    ws.send(
      JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        data: { status: 'connected' },
      })
    );

    ws.on('message', (data) => {
      console.log(
        `[WebSocket] Received message from ${clientAddress}:`,
        data.toString()
      );
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WebSocket] Parsed message:`, message);

        if (message.type === 'start_download') {
          // Start the download process
          const { downloadId, searchParams, totalRows } = message;
          console.log('[WebSocket] Starting download process with params:', {
            downloadId,
            searchParams,
            totalRows,
          });

          // Create new download
          const { id } = downloadManager.createDownload(downloadId, totalRows);

          // Create manager and start the download process
          const manager = downloadChunkManager.createManager(id, searchParams);
          manager
            .createChunks()
            .then(() => {
              console.log('[WebSocket] Download chunks created successfully');
            })
            .catch((error) => {
              console.error(
                '[WebSocket] Failed to create download chunks:',
                error
              );
              downloadManager.setError(
                id,
                error.message || 'Failed to create download chunks'
              );
            });
        }

        // Subscribe to download progress updates
        if (message.type === 'subscribe') {
          const manager = downloadChunkManager.createManager(
            message.downloadId,
            message.searchParams
          );
          const unsubscribe = downloadManager.onProgressUpdate(
            message.downloadId,
            (_downloadId: string, progress: DownloadProgress) => {
              if (ws.readyState === WebSocket.OPEN) {
                // Get all chunks for this download
                const chunks = Array.from(manager['chunks'].entries())
                  .filter(([fileName]) =>
                    fileName.startsWith(message.downloadId)
                  )
                  .map(([_, chunk]) => ({
                    fileName: chunk.fileName,
                    progress: chunk.progress || 0,
                    status: chunk.status,
                    message: chunk.message || '',
                    processedRows: chunk.processedRows || 0,
                    totalRows: chunk.totalRows || 0,
                    size: chunk.processedRows ? chunk.processedRows * 100 : 0,
                    searchParams: chunk.searchParams,
                  }));

                const response = JSON.stringify({
                  type: 'progress',
                  fileName:
                    progress.fileName || `download-${message.downloadId}.csv`,
                  progress: progress.progress || 0,
                  status: progress.status,
                  message: progress.message || '',
                  processedRows: progress.processedRows || 0,
                  totalRows: progress.totalRows || 0,
                  size: progress.processedRows
                    ? progress.processedRows * 100
                    : 0,
                  processingSpeed: progress.processingSpeed || 0,
                  estimatedTimeRemaining: progress.estimatedTimeRemaining || 0,
                  searchParams: {
                    timeFrom: message.searchParams?.timeFrom || '',
                    timeTo: message.searchParams?.timeTo || '',
                  },
                  timestamp: new Date().toISOString(),
                  chunks: chunks,
                });

                console.log(
                  `[WebSocket] Sending progress update to ${clientAddress}:`,
                  response
                );
                ws.send(response);
              } else {
                console.log(
                  `[WebSocket] Client ${clientAddress} connection not open (state: ${ws.readyState}), unsubscribing`
                );
                unsubscribe();
              }
            }
          );

          ws.on('close', () => {
            console.log(`[WebSocket] Connection closed for ${clientAddress}`);
            unsubscribe();
          });

          ws.on('error', (error) => {
            console.error(`[WebSocket] Error for ${clientAddress}:`, error);
            unsubscribe();
          });
        }
      } catch (error) {
        console.error(
          `[WebSocket] Failed to handle message from ${clientAddress}:`,
          error
        );
      }
    });
  });

  return wss;
}

export default createWebSocketServer;
