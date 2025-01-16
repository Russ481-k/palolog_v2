import { useCallback, useEffect, useRef, useState } from 'react';

import { Socket, io } from 'socket.io-client';

import { env } from '@/env.mjs';
import { MenuType } from '@/types/project';

import { WebSocketMessage } from '../../types';
import { useConnectionTimeout } from './websocket/useConnectionTimeout';

enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ACKNOWLEDGED = 'acknowledged',
  ERROR = 'error',
}

interface WebSocketConnectionConfig {
  downloadId: string;
  searchId: string;
  searchParams: {
    menu: MenuType;
    timeFrom: string;
    timeTo: string;
    searchTerm: string;
  };
  totalRows: number;
  onMessage: (message: WebSocketMessage) => void;
  onError: (error: Error) => void;
  onConnectionAcknowledged: () => void;
}

interface SocketEventHandlers {
  handleConnect: (socket: Socket) => void;
  handleConnected: (socket: Socket, resolve: (socket: Socket) => void) => void;
  handleDisconnect: (socket: Socket, reason: string) => void;
  handleError: (error: unknown) => void;
  handleProgress: (message: WebSocketMessage) => void;
  handleConnectError: (
    socket: Socket,
    error: Error,
    reject: (error: Error) => void
  ) => void;
}

export const useWebSocketConnection = ({
  downloadId,
  searchId,
  searchParams,
  totalRows,
  onMessage,
  onError,
  onConnectionAcknowledged,
}: WebSocketConnectionConfig) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);
  const downloadIdRef = useRef<string | null>(null);

  const { startTimeout, clearTimeout } = useConnectionTimeout({
    onTimeout: () => {
      if (socketRef.current) {
        handleTimeout(socketRef.current, (error) => {
          onError(error);
        });
      }
    },
  });

  const handleTimeout = useCallback(
    (socket: Socket, reject: (error: Error) => void) => {
      if (!mountedRef.current) return;

      console.error('[Socket.IO] Connection timeout', {
        downloadId,
        timestamp: new Date().toISOString(),
      });
      socket.removeAllListeners();
      socket.close();
      setConnectionState(ConnectionState.ERROR);
      reject(new Error('Connection timeout after 10000ms'));
    },
    [downloadId]
  );

  const eventHandlers = useCallback(
    (): SocketEventHandlers => ({
      handleConnectError: (
        socket: Socket,
        error: Error,
        reject: (error: Error) => void
      ) => {
        if (!mountedRef.current) return;

        console.error('[Socket.IO] Connection error:', {
          error: error.message,
          downloadId,
          timestamp: new Date().toISOString(),
        });
        socket.removeAllListeners();
        setConnectionState(ConnectionState.ERROR);
        clearTimeout();
        reject(error);
      },

      handleConnect: (socket: Socket) => {
        if (!mountedRef.current) return;

        console.log('[Socket.IO] Connected, subscribing...', {
          downloadId,
          timestamp: new Date().toISOString(),
        });

        setConnectionState(ConnectionState.CONNECTED);
        socket.emit('subscribe', {
          downloadId,
          searchId,
          searchParams,
          totalRows,
          timestamp: new Date().toISOString(),
        });
      },

      handleConnected: (socket: Socket, resolve: (socket: Socket) => void) => {
        if (!mountedRef.current) return;

        clearTimeout();

        console.log('[Socket.IO] Connection acknowledged by server', {
          downloadId,
          timestamp: new Date().toISOString(),
        });

        setConnectionState(ConnectionState.ACKNOWLEDGED);
        onConnectionAcknowledged();
        resolve(socket);
      },

      handleDisconnect: (socket: Socket, reason: string) => {
        if (!mountedRef.current) return;

        console.log('[Socket.IO] Disconnected:', {
          reason,
          downloadId,
          timestamp: new Date().toISOString(),
        });

        socket.removeAllListeners();
        setConnectionState(ConnectionState.DISCONNECTED);
      },

      handleError: (error: unknown) => {
        if (!mountedRef.current) return;

        console.error('[Socket.IO] Error:', {
          error: error instanceof Error ? error.message : error,
          downloadId,
          timestamp: new Date().toISOString(),
        });

        onError(
          new Error(error instanceof Error ? error.message : 'Connection error')
        );
      },

      handleProgress: (message: WebSocketMessage) => {
        if (!mountedRef.current) return;

        if ('totalProgress' in message && message.totalProgress) {
          console.log('[Socket.IO] Total progress update:', {
            progress: message.totalProgress.progress,
            status: message.totalProgress.status,
            processedRows: message.totalProgress.processedRows,
            totalRows: message.totalProgress.totalRows,
            timestamp: new Date().toISOString(),
          });
        } else if (message.fileName) {
          console.log('[Socket.IO] File progress update:', {
            fileName: message.fileName,
            status: message.status,
            progress: message.progress,
            processedRows: message.processedRows,
            totalRows: message.totalRows,
            timestamp: new Date().toISOString(),
          });
        }

        onMessage(message);
      },
    }),
    [
      downloadId,
      searchId,
      searchParams,
      totalRows,
      onMessage,
      onError,
      onConnectionAcknowledged,
      clearTimeout,
    ]
  );

  const setupSocketListeners = useCallback(
    (
      socket: Socket,
      resolve: (socket: Socket) => void,
      reject: (error: Error) => void
    ) => {
      const handlers = eventHandlers();

      socket.on('connect_error', (error) =>
        handlers.handleConnectError(socket, error, reject)
      );
      socket.on('connect', () => handlers.handleConnect(socket));
      socket.on('connected', () => handlers.handleConnected(socket, resolve));
      socket.on('disconnect', (reason) =>
        handlers.handleDisconnect(socket, reason)
      );
      socket.on('error', handlers.handleError);

      // 1. Generation Progress
      socket.on(
        'generation_progress',
        (rawMessage: Record<string, unknown>) => {
          const message: WebSocketMessage = {
            type: 'progress',
            ...rawMessage,
          };
          console.log(
            '[Socket.IO] Received generation_progress message:',
            message
          );
          handlers.handleProgress(message);
          setConnectionState(ConnectionState.ACKNOWLEDGED);
          onMessage({
            ...message,
            type: 'progress',
            progress: message.progress || 0,
            fileName: message.clientFileName || message.fileName,
          });
        }
      );

      // 2. File Ready
      socket.on('file_ready', (rawMessage: Record<string, unknown>) => {
        const message: WebSocketMessage = {
          type: 'progress',
          ...rawMessage,
        };
        console.log('[Socket.IO] Received file_ready message:', message);
        handlers.handleProgress(message);
        setConnectionState(ConnectionState.ACKNOWLEDGED);
        onMessage({
          ...message,
          type: 'progress',
          progress: message.progress || 100,
          fileName: message.clientFileName || message.fileName,
        });
      });

      // 3. Download Progress
      socket.on('download_progress', (rawMessage: Record<string, unknown>) => {
        const message: WebSocketMessage = {
          type: 'progress',
          ...rawMessage,
        };
        console.log('[Socket.IO] Received download_progress message:', message);
        handlers.handleProgress(message);
        onMessage({
          ...message,
          type: 'progress',
          progress: message.progress || 0,
          fileName: message.clientFileName || message.fileName,
        });
      });

      // Generic Progress
      socket.on('progress', (rawMessage: Record<string, unknown>) => {
        const message: WebSocketMessage = {
          type: 'progress',
          ...rawMessage,
        };
        console.log('[Socket.IO] Received generic progress message:', message);
        handlers.handleProgress(message);

        // Only forward progress updates for the current status
        if (message.status) {
          onMessage({
            ...message,
            type: 'progress',
            progress: message.progress || 0,
            fileName: message.clientFileName || message.fileName,
          });
        }
      });
    },
    [eventHandlers, onMessage]
  );

  const connect = useCallback(() => {
    console.log('[Socket.IO] Connect called:', {
      currentDownloadId: downloadId,
      refDownloadId: downloadIdRef.current,
      hasSocket: !!socketRef.current,
      isSocketConnected: socketRef.current?.connected,
      connectionState,
      timestamp: new Date().toISOString(),
    });

    return new Promise<Socket>((resolve, reject) => {
      if (
        socketRef.current?.connected &&
        downloadIdRef.current === downloadId
      ) {
        console.log('[Socket.IO] Reusing existing connection:', {
          downloadId,
          socketId: socketRef.current.id,
          timestamp: new Date().toISOString(),
        });
        resolve(socketRef.current);
        return;
      }

      if (connectionState === ConnectionState.CONNECTING) {
        console.log('[Socket.IO] Connection already in progress', {
          downloadId,
          timestamp: new Date().toISOString(),
        });
        const checkConnection = () => {
          if (socketRef.current?.connected) {
            resolve(socketRef.current);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      setConnectionState(ConnectionState.CONNECTING);

      if (socketRef.current) {
        console.log('[Socket.IO] Cleaning up existing socket:', {
          downloadId,
          timestamp: new Date().toISOString(),
        });
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }

      const wsPort = env.NEXT_PUBLIC_WS_PORT || 3001;
      const baseUrl = env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const wsUrl = baseUrl.replace(/:\d+/, `:${wsPort}`);

      const socket = io(wsUrl, {
        path: '/api/ws/download',
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true,
        auth: {
          downloadId: downloadId || downloadIdRef.current,
        },
      });

      socketRef.current = socket;
      setupSocketListeners(socket, resolve, reject);
      startTimeout();
      socket.connect();
    });
  }, [downloadId, connectionState, setupSocketListeners, startTimeout]);

  useEffect(() => {
    downloadIdRef.current = downloadId;
  }, [downloadId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
      clearTimeout();
    };
  }, [clearTimeout]);

  const disconnect = useCallback(() => {
    clearTimeout();
    if (!socketRef.current) return;

    socketRef.current.removeAllListeners();
    socketRef.current.close();
    socketRef.current = null;
    setConnectionState(ConnectionState.DISCONNECTED);
  }, [clearTimeout]);

  const startDownload = useCallback(() => {
    const currentDownloadId = downloadId || downloadIdRef.current;

    if (!socketRef.current?.connected) {
      console.error('[Socket.IO] Cannot start download: not connected');
      return;
    }

    if (!currentDownloadId) {
      console.error('[Socket.IO] Cannot start download: no downloadId');
      return;
    }

    console.log('[Socket.IO] Starting download...', {
      downloadId: currentDownloadId,
      timestamp: new Date().toISOString(),
    });

    socketRef.current.emit('start_download', {
      type: 'start_download',
      downloadId: currentDownloadId,
      searchId,
      searchParams,
      totalRows,
      timestamp: new Date().toISOString(),
    });
  }, [downloadId, searchId, searchParams, totalRows]);

  return {
    connect,
    disconnect,
    startDownload,
    socket: socketRef.current,
    isConnecting: connectionState === ConnectionState.CONNECTING,
    isConnectionAcknowledged: connectionState === ConnectionState.ACKNOWLEDGED,
  };
};
