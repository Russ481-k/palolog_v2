import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import { Socket, io } from 'socket.io-client';

import { env } from '@/env.mjs';
import { DownloadStatus } from '@/types/download';

import { DownloadSearchParams, DownloadState, FileStatus } from '../types';

interface UseDownloadProgressConfig {
  setState: Dispatch<SetStateAction<DownloadState>>;
  updateFileStatus: (update: FileStatus) => void;
  downloadId?: string;
  searchParams?: DownloadSearchParams;
  totalRows?: number;
}

interface ServerMessage {
  type:
    | 'generation_progress'
    | 'file_ready'
    | 'download_progress'
    | 'progress_update';
  fileName: string;
  clientFileName?: string;
  downloadId: string;
  status: DownloadStatus;
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  speed?: number;
  estimatedTimeRemaining?: number;
  searchParams: DownloadSearchParams;
}

const transformServerMessage = (message: ServerMessage): FileStatus => {
  return {
    fileName: message.fileName,
    clientFileName: message.clientFileName || message.fileName,
    downloadId: message.downloadId,
    status: message.status,
    progress: message.progress,
    message: message.message,
    processedRows: message.processedRows,
    totalRows: message.totalRows,
    processingSpeed: message.speed || 0,
    estimatedTimeRemaining: message.estimatedTimeRemaining || 0,
    size: 0,
    searchParams: message.searchParams,
  };
};

export const useDownloadProgress = ({
  setState,
  updateFileStatus,
  downloadId,
  searchParams,
  totalRows,
}: UseDownloadProgressConfig) => {
  const socketRef = useRef<Socket | null>(null);

  const handleGenerationProgress = useCallback(
    (message: ServerMessage) => {
      console.log('[handleGenerationProgress] Received:', message);
      const fileStatus = transformServerMessage(message);
      updateFileStatus(fileStatus);
    },
    [updateFileStatus]
  );

  const handleFileReady = useCallback(
    (message: ServerMessage) => {
      console.log('[handleFileReady] Received:', message);
      const fileStatus = transformServerMessage(message);
      updateFileStatus(fileStatus);
      setState((prevState) => ({
        ...prevState,
        status: 'ready',
        progress: 100,
        message: 'File is ready for download',
      }));
    },
    [updateFileStatus, setState]
  );

  const handleDownloadProgress = useCallback(
    (message: ServerMessage) => {
      console.log('[handleDownloadProgress] Received:', message);
      const fileStatus = transformServerMessage(message);
      updateFileStatus(fileStatus);
    },
    [updateFileStatus]
  );

  const handleProgressUpdate = useCallback(
    (message: ServerMessage) => {
      console.log('[handleProgressUpdate] Received:', message);
      const fileStatus = transformServerMessage(message);
      updateFileStatus(fileStatus);
    },
    [updateFileStatus]
  );

  const connect = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io(env.NEXT_PUBLIC_WS_HOST || '', {
        path: '/api/ws/download',
        transports: ['websocket', 'polling'],
        autoConnect: false,
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('[WebSocket] Connected to server');
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
      });

      socketRef.current.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });

      // Progress events
      socketRef.current.on('progress_update', handleProgressUpdate);
      socketRef.current.on('generation_progress', handleGenerationProgress);
      socketRef.current.on('file_ready', handleFileReady);
      socketRef.current.on('download_progress', handleDownloadProgress);
      socketRef.current.on('count_update', (message) => {
        console.log('[WebSocket] Count update:', message);
      });

      socketRef.current.connect();
    }
  }, [
    handleGenerationProgress,
    handleFileReady,
    handleDownloadProgress,
    handleProgressUpdate,
  ]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    if (socketRef.current && downloadId && searchParams && totalRows) {
      console.log('[WebSocket] Subscribing to download updates:', {
        downloadId,
        searchParams,
        totalRows,
      });

      socketRef.current.emit('subscribe', {
        downloadId,
        searchParams,
        totalRows,
        timestamp: new Date().toISOString(),
      });
    }
  }, [downloadId, searchParams, totalRows]);

  const startDownload = useCallback(() => {
    if (socketRef.current && downloadId && searchParams && totalRows) {
      console.log('[WebSocket] Starting download:', {
        downloadId,
        searchParams,
        totalRows,
      });

      socketRef.current.emit('start_download', {
        downloadId,
        searchParams,
        totalRows,
        timestamp: new Date().toISOString(),
      });
    }
  }, [downloadId, searchParams, totalRows]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    subscribe,
    startDownload,
    disconnect,
  };
};

const getStatusMessage = (status: DownloadStatus): string => {
  switch (status) {
    case 'generating':
      return 'Generating file...';
    case 'ready':
      return 'Ready to download';
    case 'downloading':
      return 'Downloading...';
    case 'completed':
      return 'Download completed';
    case 'failed':
      return 'Download failed';
    default:
      return 'Processing...';
  }
};
