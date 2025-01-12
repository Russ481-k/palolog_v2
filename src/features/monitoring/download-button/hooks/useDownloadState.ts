import { useState } from 'react';

import { DownloadStatus } from '@/types/download';

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

const validTransitions: Record<DownloadStatus, DownloadStatus[]> = {
  pending: ['generating'],
  generating: ['ready', 'failed'],
  ready: ['downloading', 'failed'],
  downloading: ['completed', 'failed'],
  completed: [],
  failed: [],
  paused: ['downloading', 'failed'],
};

export const useDownloadState = ({
  onCleanup,
  onCancel,
}: UseDownloadStateProps) => {
  const [state, setState] = useState<DownloadState>(initialState);

  const updateFileStatus = (fileName: string, update: Partial<FileStatus>) => {
    console.log('[useDownloadState] Updating file status:', {
      fileName,
      currentStatus: state.fileStatuses[fileName]?.status,
      newStatus: update.status,
      update,
    });

    setState((prev) => {
      const currentFile = prev.fileStatuses[fileName];

      // If file doesn't exist, create it with initial state
      if (!currentFile) {
        const newFile: FileStatus = {
          status: 'pending',
          progress: 0,
          message: 'Initializing...',
          size: 0,
          processedRows: 0,
          totalRows: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          searchParams: update.searchParams || {
            timeFrom: '',
            timeTo: '',
            menu: 'TRAFFIC',
            searchTerm: '',
          },
          ...update,
        };

        console.log('[useDownloadState] Creating new file:', {
          fileName,
          initialState: newFile,
        });

        return {
          ...prev,
          fileStatuses: {
            ...prev.fileStatuses,
            [fileName]: newFile,
          },
        };
      }

      // For existing files, validate status transition
      if (update.status && currentFile.status !== update.status) {
        const allowedTransitions = validTransitions[currentFile.status];
        console.log('[useDownloadState] Validating status transition:', {
          fileName,
          from: currentFile.status,
          to: update.status,
          allowed: allowedTransitions,
        });

        if (!allowedTransitions.includes(update.status)) {
          console.warn(
            `[useDownloadState] Invalid status transition from ${currentFile.status} to ${update.status}`
          );
          return prev;
        }
      }

      const updatedFile = {
        ...currentFile,
        ...update,
      };

      console.log('[useDownloadState] Updated file status:', {
        fileName,
        before: currentFile.status,
        after: updatedFile.status,
        progress: updatedFile.progress,
        message: updatedFile.message,
      });

      return {
        ...prev,
        fileStatuses: {
          ...prev.fileStatuses,
          [fileName]: updatedFile,
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
