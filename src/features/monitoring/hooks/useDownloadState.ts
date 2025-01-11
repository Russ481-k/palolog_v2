import { useCallback, useState } from 'react';

import { DownloadStatus } from '@/types/download';
import { MenuType } from '@/types/project';

import { FileStatuses } from '../types';

interface DownloadState {
  downloadId: string;
  fileStatuses: FileStatuses;
  selectedFiles: string[];
  isOpen: boolean;
  isConnecting: boolean;
  totalRows: number;
  searchParams?: {
    menu: MenuType;
    timeFrom: string;
    timeTo: string;
    searchTerm: string;
  };
  totalProgress?: {
    progress: number;
    status: DownloadStatus;
    processedRows: number;
    totalRows: number;
    processingSpeed: number;
    estimatedTimeRemaining: number;
    message: string;
  };
}

interface DownloadStateConfig {
  onCleanup: (downloadId: string) => Promise<{ success: boolean }>;
  onCancel: (downloadId: string) => void;
}

export const useDownloadState = ({
  onCleanup,
  onCancel,
}: DownloadStateConfig) => {
  const [state, setState] = useState<DownloadState>({
    downloadId: '',
    fileStatuses: {},
    selectedFiles: [],
    isOpen: false,
    isConnecting: false,
    totalRows: 0,
    searchParams: undefined,
  });

  const updateFileStatus = (
    fileName: string,
    status: {
      progress: number;
      status: DownloadStatus;
      message: string;
      processedRows: number;
      totalRows: number;
      size: number;
      processingSpeed: number;
      estimatedTimeRemaining: number;
      searchParams?: {
        timeFrom: string;
        timeTo: string;
      };
    }
  ) => {
    setState((prev) => ({
      ...prev,
      fileStatuses: {
        ...prev.fileStatuses,
        [fileName]: {
          fileName,
          ...status,
        },
      },
    }));
  };

  const handleFileSelection = (fileName: string, checked: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: checked
        ? [...prev.selectedFiles, fileName]
        : prev.selectedFiles.filter((name) => name !== fileName),
    }));
  };

  const startDownload = (
    downloadId: string,
    totalRows: number,
    searchParams: DownloadState['searchParams']
  ) => {
    const timestamp = new Date().toISOString().slice(0, 13).replace('T', '_');
    const fileName = `TRAFFIC_${timestamp}_1of1.csv`;

    setState((prev) => ({
      ...prev,
      downloadId,
      totalRows,
      searchParams,
      isConnecting: true,
      fileStatuses: {
        [fileName]: {
          fileName,
          progress: 0,
          status: 'pending',
          message: 'Establishing connection...',
          processedRows: 0,
          totalRows,
          size: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          searchParams,
        },
      },
      selectedFiles: [],
      isOpen: true,
    }));
  };

  const handleError = (error: Error) => {
    setState((prev) => ({
      ...prev,
      isConnecting: false,
      fileStatuses: {
        error: {
          fileName: 'error',
          progress: 0,
          status: 'failed',
          message: error.message || 'Connection failed',
          processedRows: 0,
          totalRows: 0,
          size: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
        },
      },
    }));
  };

  const handleModalClose = useCallback(async () => {
    try {
      if (state.downloadId) {
        await onCleanup(state.downloadId);
      }
      setState((prev) => ({
        ...prev,
        isOpen: false,
        fileStatuses: {},
        selectedFiles: [],
        downloadId: '',
      }));
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error('Failed to cleanup download')
      );
    }
  }, [state.downloadId, onCleanup]);

  return {
    state,
    updateFileStatus,
    handleFileSelection,
    startDownload,
    handleError,
    handleModalClose,
    setState,
  };
};
