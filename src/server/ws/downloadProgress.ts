import { Socket } from 'net';
import { WebSocket, WebSocketServer } from 'ws';

import { downloadChunkManager } from '../lib/downloadChunkManager';
import { TotalProgress, downloadManager } from '../lib/downloadManager';

interface WebSocketServerConfig {
  wss: WebSocketServer;
}

export function createWebSocketServer(config: WebSocketServerConfig) {
  console.log('[WebSocket] Creating WebSocket server with config:', {
    hasServer: !!config.wss,
    timestamp: new Date().toISOString(),
  });

  const wss = config.wss;

  // Listen for file_ready events from DownloadChunkManager
  downloadChunkManager.on('file_ready', (message) => {
    console.log('[WebSocket] Received file_ready event:', {
      message,
      timestamp: new Date().toISOString(),
    });

    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });

  console.log('[WebSocket] Server created with config:', {
    hasServer: !!config.wss,
    timestamp: new Date().toISOString(),
  });

  wss.on('listening', () => {
    console.log('[WebSocket] Server is listening:', {
      timestamp: new Date().toISOString(),
    });
  });

  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('[WebSocket] New client connection:', {
      url: req.url,
      headers: req.headers,
      timestamp: new Date().toISOString(),
    });

    const clientAddress =
      req.socket instanceof Socket
        ? `${req.socket.remoteAddress}:${req.socket.remotePort}`
        : 'unknown';

    console.log('[WebSocket] Client connected:', {
      clientAddress,
      timestamp: new Date().toISOString(),
    });

    // Setup connection monitoring
    let isAlive = true;
    const pingInterval = setInterval(() => {
      if (!isAlive) {
        console.log('[WebSocket] Client connection lost:', {
          clientAddress,
          timestamp: new Date().toISOString(),
        });
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      isAlive = true;
      console.log('[WebSocket] Client connection alive:', {
        clientAddress,
        timestamp: new Date().toISOString(),
      });
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', {
        error: error instanceof Error ? error.message : String(error),
        clientAddress,
        timestamp: new Date().toISOString(),
      });
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      console.log('[WebSocket] Client disconnected:', {
        clientAddress,
        timestamp: new Date().toISOString(),
      });
    });

    ws.on('message', async (data) => {
      console.log('[WebSocket] Received message from client:', {
        clientAddress,
        data: data.toString(),
        timestamp: new Date().toISOString(),
      });

      try {
        const message = JSON.parse(data.toString());
        console.log('[WebSocket] Parsed message:', {
          message,
          clientAddress,
          timestamp: new Date().toISOString(),
        });

        if (message.type === 'start_download') {
          const { downloadId, searchParams, totalRows } = message;
          console.log('[WebSocket] Starting download process:', {
            downloadId,
            searchParams,
            totalRows,
            clientAddress,
            timestamp: new Date().toISOString(),
          });

          try {
            // Get actual count from OpenSearch first
            const actualCount =
              await downloadManager.getActualCount(searchParams);

            // Send count update to client
            const countUpdateMessage = {
              type: 'count_update',
              downloadId,
              expectedRows: totalRows,
              actualRows: actualCount,
              timestamp: new Date().toISOString(),
            };
            ws.send(JSON.stringify(countUpdateMessage));

            // Check if download already exists
            let manager = downloadChunkManager.getManager(downloadId);

            if (!manager) {
              // Create new download with actual count
              const { id } = await downloadManager.createDownload(
                downloadId,
                actualCount, // Use actual count instead of expected
                searchParams
              );
              console.log('[WebSocket] Download created:', {
                id,
                downloadId,
                actualCount,
                clientAddress,
                timestamp: new Date().toISOString(),
              });

              // Create manager and start the download process
              manager = downloadChunkManager.createManager(id, searchParams);
              console.log('[WebSocket] Download manager created:', {
                id,
                clientAddress,
                timestamp: new Date().toISOString(),
              });

              // Forward events from the manager to WebSocket
              manager.onFileReady((message) => {
                console.log('[WebSocket] Received file_ready event:', {
                  downloadId: message.downloadId,
                  fileName: message.fileName,
                  status: message.status,
                  clientAddress,
                  timestamp: new Date().toISOString(),
                });

                ws.send(
                  JSON.stringify({
                    ...message,
                    type: 'file_ready',
                  })
                );
              });

              manager.onGenerationProgress((message) => {
                console.log('[WebSocket] Received generation_progress event:', {
                  downloadId: message.downloadId,
                  fileName: message.fileName,
                  status: message.status,
                  progress: message.progress,
                  clientAddress,
                  timestamp: new Date().toISOString(),
                });

                ws.send(
                  JSON.stringify({
                    ...message,
                    type: 'generation_progress',
                  })
                );
              });

              // Start the download process
              await manager.createChunks();
              console.log('[WebSocket] Chunks created and download started:', {
                id,
                clientAddress,
                timestamp: new Date().toISOString(),
              });

              // Send initial progress update
              const initialProgress = {
                type: 'progress',
                downloadId,
                progress: 0,
                status: 'downloading',
                processedRows: 0,
                totalRows: actualCount,
                message: 'Starting download...',
                timestamp: new Date().toISOString(),
              };
              ws.send(JSON.stringify(initialProgress));
            } else {
              console.log('[WebSocket] Download already in progress:', {
                downloadId,
                clientAddress,
                timestamp: new Date().toISOString(),
              });

              // Send current progress
              const currentProgress = manager.getCurrentProgress();
              ws.send(
                JSON.stringify({
                  type: 'progress',
                  ...currentProgress,
                  timestamp: new Date().toISOString(),
                })
              );
            }
          } catch (error) {
            console.error('[WebSocket] Failed to start download process:', {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              downloadId,
              clientAddress,
              timestamp: new Date().toISOString(),
            });

            // Send error message back to client
            const errorMessage = {
              type: 'error',
              downloadId,
              message: 'Failed to start download process',
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString(),
            };
            ws.send(JSON.stringify(errorMessage));
          }
        }

        if (message.type === 'subscribe') {
          console.log('[WebSocket] Client subscribing to download updates:', {
            downloadId: message.downloadId,
            clientAddress,
            timestamp: new Date().toISOString(),
          });

          try {
            // Send connected response first
            ws.send(
              JSON.stringify({
                type: 'connected',
                downloadId: message.downloadId,
                timestamp: new Date().toISOString(),
              })
            );

            console.log('[WebSocket] Sent connected response:', {
              downloadId: message.downloadId,
              clientAddress,
              timestamp: new Date().toISOString(),
            });

            // Get existing download manager or create new one
            let manager = downloadChunkManager.getManager(message.downloadId);

            if (!manager) {
              // Create new download only if it doesn't exist
              const { id } = await downloadManager.createDownload(
                message.downloadId,
                message.totalRows,
                message.searchParams
              );
              console.log('[WebSocket] Download created:', {
                id,
                downloadId: message.downloadId,
                clientAddress,
                timestamp: new Date().toISOString(),
              });

              // Create manager and start the download process
              manager = downloadChunkManager.createManager(
                message.downloadId,
                message.searchParams
              );
              console.log('[WebSocket] Download manager created:', {
                id,
                clientAddress,
                timestamp: new Date().toISOString(),
              });

              // Forward events from the manager to WebSocket
              manager.onFileReady((message) => {
                console.log('[WebSocket] Received file_ready event:', {
                  downloadId: message.downloadId,
                  fileName: message.fileName,
                  status: message.status,
                  clientAddress,
                  timestamp: new Date().toISOString(),
                });

                ws.send(
                  JSON.stringify({
                    ...message,
                    type: 'file_ready',
                  })
                );
              });

              manager.onGenerationProgress((message) => {
                console.log('[WebSocket] Received generation_progress event:', {
                  downloadId: message.downloadId,
                  fileName: message.fileName,
                  status: message.status,
                  progress: message.progress,
                  clientAddress,
                  timestamp: new Date().toISOString(),
                });

                ws.send(
                  JSON.stringify({
                    ...message,
                    type: 'generation_progress',
                  })
                );
              });

              // Start the download process
              await manager.createChunks();
              console.log('[WebSocket] Chunks created and download started:', {
                id,
                clientAddress,
                timestamp: new Date().toISOString(),
              });
            }

            const unsubscribe = downloadManager.onProgressUpdate(
              message.downloadId,
              (downloadId: string, progress: TotalProgress) => {
                if (ws.readyState === WebSocket.OPEN) {
                  // Get current manager
                  console.log('[WebSocket] Getting download manager:', {
                    downloadId,
                    clientAddress,
                    timestamp: new Date().toISOString(),
                    progress,
                  });
                  const manager = downloadChunkManager.getManager(downloadId);
                  if (!manager) {
                    console.warn('[WebSocket] No download manager found:', {
                      downloadId,
                      clientAddress,
                      timestamp: new Date().toISOString(),
                    });
                    return;
                  }

                  // Get current progress
                  const currentProgress = manager.getCurrentProgress();

                  const response = JSON.stringify({
                    type: 'progress',
                    ...currentProgress,
                    timestamp: new Date().toISOString(),
                  });

                  console.log('[WebSocket] Sending progress update:', {
                    downloadId,
                    progress: currentProgress.progress,
                    status: currentProgress.status,
                    processedRows: currentProgress.processedRows,
                    totalRows: currentProgress.totalRows,
                    clientAddress,
                    timestamp: new Date().toISOString(),
                  });

                  ws.send(response);
                }
              }
            );

            ws.on('close', () => {
              console.log('[WebSocket] Cleaning up subscription:', {
                downloadId: message.downloadId,
                clientAddress,
                timestamp: new Date().toISOString(),
              });
              unsubscribe();
            });
          } catch (error) {
            console.error(
              '[WebSocket] Failed to subscribe to download updates:',
              {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                downloadId: message.downloadId,
                clientAddress,
                timestamp: new Date().toISOString(),
              }
            );
          }
        }
      } catch (error) {
        console.error('[WebSocket] Failed to handle message:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          data: data.toString(),
          clientAddress,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  return wss;
}

export default createWebSocketServer;
