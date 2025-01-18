import { useCallback, useState } from 'react';

import { trpc } from '@/lib/trpc/client';
import { DownloadStatus, WebSocketMessage } from '@/types/download';

import type { DownloadState, FileStatus } from '../types';

interface UseDownloadStateProps {
  onCleanup: (id: string) => void;
  onCancel: (id: string) => void;
}

const initialState: DownloadState = {
  clientFileName: '',
  status: 'generating',
  downloadId: '',
  fileStatuses: {},
  selectedFiles: [],
  isOpen: false,
  isConnecting: false,
  isConnectionReady: false,
  size: 0,
  searchParams: {
    menu: 'TRAFFIC',
    timeFrom: '',
    timeTo: '',
    searchTerm: '',
  },
};

export const useDownloadState = ({
  onCleanup,
  onCancel,
}: UseDownloadStateProps) => {
  const downloadFile = trpc.download.downloadFile.useMutation();
  const [state, setState] = useState<DownloadState>(initialState);

  const updateFileStatuses = useCallback(
    (update: FileStatus) => {
      setState((prev) => {
        const currentFile = prev.fileStatuses[update.downloadId];
        const updatedFile = {
          ...currentFile,
          ...update,
          clientFileName: update.clientFileName || currentFile?.clientFileName,
        };

        return {
          ...prev,
          fileStatuses: {
            ...prev.fileStatuses,
            [update.downloadId]: updatedFile,
          },
        };
      });
    },
    [setState, state.fileStatuses]
  );

  const handleFileSelection = (downloadId: string, selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: selected
        ? [...prev.selectedFiles, downloadId]
        : prev.selectedFiles.filter((id) => id !== downloadId),
    }));
  };

  const handleError = (error: Error) => {
    console.error('Download error:', error);
    if (state.downloadId) {
      onCancel(state.downloadId);
    }
    setState((prev) => ({
      ...prev,
      isOpen: false,
      isConnecting: false,
      isConnectionReady: false,
    }));
  };

  const handleModalClose = () => {
    console.log('[useDownloadState] Cleaning up and resetting state...');

    if (state.downloadId) {
      onCleanup(state.downloadId);
    }

    // 상태를 초기값으로 리셋
    setState(initialState);
  };

  const handleDownload = useCallback(
    async (downloadId: string) => {
      const fileStatus = state.fileStatuses[downloadId];
      if (!fileStatus) {
        console.error('[useDownloadState] File not found:', downloadId);
        return;
      }

      try {
        const result = await downloadFile.mutateAsync({
          fileName: fileStatus.fileName,
          downloadId: fileStatus.downloadId,
        });

        if (result.fileName) {
          updateFileStatuses({
            fileName: fileStatus.fileName,
            downloadId: fileStatus.downloadId,
            clientFileName: fileStatus.clientFileName,
            status: 'downloading',
            message: 'Starting download...',
            size: 0,
            progress: 0,
            processedRows: 0,
            totalRows: 0,
            processingSpeed: 0,
            estimatedTimeRemaining: 0,
          });
        }
      } catch (error) {
        console.error('[useDownloadState] Download error:', error);
        updateFileStatuses({
          fileName: fileStatus.fileName,
          downloadId: fileStatus.downloadId,
          clientFileName: fileStatus.clientFileName,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Download failed',
          size: 0,
          progress: 0,
          processedRows: 0,
          totalRows: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
        });
      }
    },
    [state.fileStatuses, downloadFile, updateFileStatuses]
  );

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    setState((prevState) => {
      const fileStatuses = { ...prevState.fileStatuses };
      const currentStatus = fileStatuses[message.downloadId] || {};

      fileStatuses[message.downloadId] = {
        ...currentStatus,
        fileName: message.fileName,
        clientFileName: message.clientFileName,
        downloadId: message.downloadId,
        status: message.status,
        progress: message.progress,
        processedRows: message.processedRows,
        totalRows: message.totalRows,
        message: message.message,
        processingSpeed: message.processingSpeed,
        estimatedTimeRemaining: message.estimatedTimeRemaining,
        firstReceiveTime: message.firstReceiveTime,
        lastReceiveTime: message.lastReceiveTime,
        size: message.size,
      };

      return {
        ...prevState,
        fileStatuses,
      };
    });
  }, []);

  return {
    state,
    setState,
    updateFileStatuses,
    handleFileSelection,
    handleError,
    handleModalClose,
    handleDownload,
    handleWebSocketMessage,
  };
};
