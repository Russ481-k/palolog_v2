import { useCallback, useEffect, useRef, useState } from 'react';

import { Socket, io } from 'socket.io-client';

import { env } from '@/env.mjs';
import { MenuType } from '@/types/project';

import { WebSocketMessage } from '../types';

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

export const useWebSocketConnection = ({
  downloadId,
  searchId,
  searchParams,
  totalRows,
  onMessage,
  onError,
  onConnectionAcknowledged,
}: WebSocketConnectionConfig) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectionAcknowledged, setIsConnectionAcknowledged] =
    useState(false);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);
  const connectionTimeoutRef = useRef<NodeJS.Timeout>();
  const downloadIdRef = useRef<string | null>(null);

  // Update downloadIdRef when downloadId changes
  useEffect(() => {
    console.log('[Socket.IO] downloadId changed:', {
      previousDownloadId: downloadIdRef.current,
      newDownloadId: downloadId,
      timestamp: new Date().toISOString(),
    });
    downloadIdRef.current = downloadId;
  }, [downloadId]);

  const connect = useCallback(() => {
    console.log('[Socket.IO] Connect called:', {
      currentDownloadId: downloadId,
      refDownloadId: downloadIdRef.current,
      hasSocket: !!socketRef.current,
      isSocketConnected: socketRef.current?.connected,
      isConnecting,
      timestamp: new Date().toISOString(),
    });

    return new Promise<Socket>((resolve, reject) => {
      // 이미 연결된 소켓이 있고, downloadId가 같다면 재사용
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

      // 연결 중이면 대기
      if (isConnecting) {
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

      setIsConnecting(true);

      // 기존 소켓 정리
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

      console.log('[Socket.IO] Creating socket connection...', {
        wsUrl,
        path: '/api/ws/download',
        downloadId,
        timestamp: new Date().toISOString(),
      });

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
          downloadId: downloadId || downloadIdRef.current, // downloadId가 없으면 ref 사용
        },
      });

      socketRef.current = socket;

      const cleanupListeners = () => {
        if (!mountedRef.current) return;

        socket.off('connect_error');
        socket.off('connect');
        socket.off('connected');
        socket.off('disconnect');
        socket.off('error');
        socket.off('progress');
        socket.off('count_update');

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
      };

      connectionTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;

        console.error('[Socket.IO] Connection timeout', {
          wsUrl,
          downloadId,
          timestamp: new Date().toISOString(),
        });
        cleanupListeners();
        socket.close();
        setIsConnecting(false);
        reject(new Error('Connection timeout after 10000ms'));
      }, 10000);

      socket.on('connect_error', (error: Error) => {
        if (!mountedRef.current) return;

        console.error('[Socket.IO] Connection error:', {
          error: error.message,
          wsUrl,
          downloadId,
          timestamp: new Date().toISOString(),
        });
        cleanupListeners();
        setIsConnecting(false);
        reject(error);
      });

      socket.on('connect', () => {
        if (!mountedRef.current) return;

        console.log('[Socket.IO] Connected, subscribing...', {
          downloadId,
          timestamp: new Date().toISOString(),
        });

        socket.emit('subscribe', {
          downloadId,
          searchId,
          searchParams,
          totalRows,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on('connected', () => {
        if (!mountedRef.current) return;

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        console.log('[Socket.IO] Connection acknowledged by server', {
          downloadId,
          timestamp: new Date().toISOString(),
        });

        setIsConnectionAcknowledged(true);
        onConnectionAcknowledged();
        setIsConnecting(false);
        resolve(socket);
      });

      socket.on('disconnect', (reason) => {
        if (!mountedRef.current) return;

        console.log('[Socket.IO] Disconnected:', {
          reason,
          downloadId,
          timestamp: new Date().toISOString(),
        });

        cleanupListeners();
        setIsConnecting(false);
        setIsConnectionAcknowledged(false);
      });

      socket.on('error', (error) => {
        if (!mountedRef.current) return;

        console.error('[Socket.IO] Error:', {
          error: error instanceof Error ? error.message : error,
          downloadId,
          timestamp: new Date().toISOString(),
        });

        onError(
          new Error(error instanceof Error ? error.message : 'Connection error')
        );
      });

      socket.on('progress', (message) => {
        if (!mountedRef.current) return;
        onMessage(message);
      });

      socket.on('count_update', (message) => {
        if (!mountedRef.current) return;
        onMessage(message);
      });

      socket.connect();
    });
  }, [
    downloadId,
    searchId,
    searchParams,
    totalRows,
    onError,
    onConnectionAcknowledged,
    onMessage,
    isConnecting,
  ]);

  const disconnect = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    if (!socketRef.current) return;

    socketRef.current.removeAllListeners();
    socketRef.current.close();
    socketRef.current = null;
    setIsConnecting(false);
    setIsConnectionAcknowledged(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  const startDownload = useCallback(() => {
    const currentDownloadId = downloadId || downloadIdRef.current;

    if (!socketRef.current?.connected) {
      console.error('[Socket.IO] Cannot start download: not connected');
      return;
    }

    if (!currentDownloadId) {
      console.log('[Socket.IO] Start download attempt with downloadId:', {
        propDownloadId: downloadId,
        refDownloadId: downloadIdRef.current,
        timestamp: new Date().toISOString(),
      });
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
    isConnecting,
    isConnectionAcknowledged,
  };
};
