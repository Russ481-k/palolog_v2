import { useState } from 'react';

import type { DownloadState, FileStatus } from '../types';

interface UseDownloadStateProps {
  onCleanup: (id: string) => void;
  onCancel: (id: string) => void;
}

const initialState: DownloadState = {
  downloadId: '',
  fileStatuses: {},
  selectedFiles: [],
  isOpen: false,
  isConnecting: false,
  isConnectionReady: false,
  totalProgress: undefined,
  searchParams: undefined,
};

export const useDownloadState = ({
  onCleanup,
  onCancel,
}: UseDownloadStateProps) => {
  const [state, setState] = useState<DownloadState>(initialState);

  const updateFileStatus = (fileName: string, update: Partial<FileStatus>) => {
    setState((prev) => {
      const currentStatus = prev.fileStatuses[fileName] || {
        size: 0,
        status: 'pending' as const,
        progress: 0,
        message: '',
        processedRows: 0,
        totalRows: 0,
        processingSpeed: 0,
        estimatedTimeRemaining: 0,
        searchParams: {
          timeFrom: '',
          timeTo: '',
          menu: 'TRAFFIC',
          searchTerm: '',
        },
      };

      // Handle state transitions
      let newProgress = update.progress ?? currentStatus.progress;
      const newStatus = update.status ?? currentStatus.status;
      let newMessage = update.message ?? currentStatus.message;
      let newProcessingSpeed =
        update.processingSpeed ?? currentStatus.processingSpeed;
      let newEstimatedTime =
        update.estimatedTimeRemaining ?? currentStatus.estimatedTimeRemaining;

      // State transition rules
      switch (currentStatus.status) {
        case 'pending':
          if (newStatus === 'generating') {
            newMessage = newMessage || 'Generating file...';
          }
          break;

        case 'generating':
          if (newStatus === 'ready') {
            newProgress = 0;
            newMessage = 'Ready to download';
            newProcessingSpeed = 0;
            newEstimatedTime = 0;
          }
          break;

        case 'ready':
          if (newStatus === 'downloading') {
            newProgress = 0;
            newMessage = 'Starting download...';
            newProcessingSpeed = 0;
            newEstimatedTime = 0;
          }
          break;

        case 'downloading':
          if (newStatus === 'completed') {
            newProgress = 100;
            newMessage = 'Download completed';
            newProcessingSpeed = 0;
            newEstimatedTime = 0;
          }
          break;

        default:
          break;
      }

      return {
        ...prev,
        fileStatuses: {
          ...prev.fileStatuses,
          [fileName]: {
            ...currentStatus,
            ...update,
            progress: newProgress,
            status: newStatus,
            message: newMessage,
            processingSpeed: newProcessingSpeed,
            estimatedTimeRemaining: newEstimatedTime,
          },
        },
      };
    });
  };

  const handleFileSelection = (fileName: string, selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: selected
        ? [...prev.selectedFiles, fileName]
        : prev.selectedFiles.filter((f) => f !== fileName),
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
    if (state.downloadId) {
      onCleanup(state.downloadId);
    }
    setState((prev) => ({
      ...prev,
      isOpen: false,
      isConnecting: false,
      isConnectionReady: false,
    }));
  };

  return {
    state,
    setState,
    updateFileStatus,
    handleFileSelection,
    handleError,
    handleModalClose,
  };
};
