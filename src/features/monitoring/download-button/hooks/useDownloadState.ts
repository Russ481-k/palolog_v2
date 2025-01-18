import { useCallback, useState } from 'react';

import { trpc } from '@/lib/trpc/client';
import { DownloadStatus } from '@/types/download';

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

const validTransitions: Record<DownloadStatus, DownloadStatus[]> = {
  progress: ['progress', 'generating', 'ready', 'downloading', 'failed'],
  generating: ['generating', 'ready', 'failed'],
  ready: ['ready', 'downloading', 'failed'],
  downloading: ['downloading', 'completed', 'failed'],
  completed: ['completed', 'failed'],
  failed: [],
};

export const useDownloadState = ({
  onCleanup,
  onCancel,
}: UseDownloadStateProps) => {
  const downloadFile = trpc.download.downloadFile.useMutation();
  const [state, setState] = useState<DownloadState>(initialState);

  const updateFileStatuses = useCallback(
    (update: FileStatus) => {
      console.log('[useDownloadState] Updating file status:', {
        fileName: update.fileName,
        currentStatus: state.fileStatuses[update.fileName]?.status,
        newStatus: update.status,
        update,
      });

      const displayFileName = update.clientFileName || update.fileName;

      if (!state.fileStatuses[update.fileName]) {
        console.log('[useDownloadState] Creating new file:', {
          fileName: displayFileName,
          initialState: update,
        });

        setState((prev) => ({
          ...prev,
          fileStatuses: {
            ...prev.fileStatuses,
            [update.fileName]: {
              clientFileName: update.clientFileName || update.fileName,
              fileName: update.fileName,
              downloadId: update.downloadId || prev.downloadId, // 기본값 제공
              status: update.status || 'generating',
              progress: update.progress || 0,
              message: update.message || 'Initializing...',
              size: update.size || 0,
              processedRows: update.processedRows || 0,
              totalRows: update.totalRows || 0,
              processingSpeed: update.processingSpeed || 0,
              estimatedTimeRemaining: update.estimatedTimeRemaining || 0,
              searchParams: update.searchParams || {
                menu: 'TRAFFIC',
                timeFrom: '',
                timeTo: '',
                searchTerm: '',
              },
            },
          },
        }));
        return;
      }

      // For existing files, v

      if (
        update.status &&
        state.fileStatuses[update.fileName]?.status !== update.status
      ) {
        const currentStatus =
          state.fileStatuses[update.fileName]?.status || 'generating';
        const allowedTransitions = validTransitions[currentStatus];
        console.log('[useDownloadState] Validating status transition:', {
          fileName: update.fileName,
          from: currentStatus,
          to: update.status,
          allowed: allowedTransitions,
        });

        if (!allowedTransitions.includes(update.status)) {
          console.warn(
            `[useDownloadState] Invalid status transition from ${state.fileStatuses[update.fileName]?.status} to ${update.status}`
          );
          return;
        }
      }

      const updatedFile: FileStatus = {
        ...state.fileStatuses[update.fileName],
        clientFileName: update.clientFileName || update.fileName,
        fileName: update.fileName,
        downloadId:
          update.downloadId ||
          state.fileStatuses[update.fileName]?.downloadId ||
          '',
        status:
          update.status ||
          state.fileStatuses[update.fileName]?.status ||
          'generating',
        progress:
          update.progress ?? state.fileStatuses[update.fileName]?.progress ?? 0,
        message:
          update.message ??
          state.fileStatuses[update.fileName]?.message ??
          'Initializing...',
        size: update.size ?? state.fileStatuses[update.fileName]?.size ?? 0,
        processedRows:
          update.processedRows ??
          state.fileStatuses[update.fileName]?.processedRows ??
          0,
        totalRows:
          update.totalRows ??
          state.fileStatuses[update.fileName]?.totalRows ??
          0,
        processingSpeed:
          update.processingSpeed ??
          state.fileStatuses[update.fileName]?.processingSpeed ??
          0,
        estimatedTimeRemaining:
          update.estimatedTimeRemaining ??
          state.fileStatuses[update.fileName]?.estimatedTimeRemaining ??
          0,
        searchParams: update.searchParams ??
          state.fileStatuses[update.fileName]?.searchParams ?? {
            menu: 'TRAFFIC',
            timeFrom: '',
            timeTo: '',
            searchTerm: '',
          },
      };

      console.log('[useDownloadState] Updated file status:', {
        fileName: update.fileName,
        before: state.fileStatuses[update.fileName]?.status,
        after: updatedFile.status,
        progress: updatedFile.progress,
        message: updatedFile.message,
      });

      setState((prev) => ({
        ...prev,
        fileStatuses: {
          ...prev.fileStatuses,
          [update.fileName]: updatedFile,
        },
      }));
    },
    [state.fileStatuses]
  );

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

  const handleDownload = useCallback(
    async (fileName: string) => {
      const fileStatus = state.fileStatuses[fileName];
      if (!fileStatus) {
        console.error('[useDownloadState] File not found:', fileName);
        return;
      }

      try {
        const result = await downloadFile.mutateAsync({
          fileName,
          downloadId: state.downloadId,
        });

        if (result.filePath) {
          updateFileStatuses({
            fileName,
            downloadId: state.downloadId,
            status: 'downloading',
            message: 'Starting download...',
            size: 0,
            progress: 0,
            processedRows: 0,
            totalRows: 0,
            processingSpeed: 0,
            estimatedTimeRemaining: 0,
            searchParams: state.searchParams || {
              menu: 'TRAFFIC',
              timeFrom: '',
              timeTo: '',
              searchTerm: '',
            },
          });
        }
      } catch (error) {
        console.error('[useDownloadState] Download error:', error);
        updateFileStatuses({
          fileName,
          downloadId: state.downloadId,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Download failed',
          size: 0,
          progress: 0,
          processedRows: 0,
          totalRows: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          searchParams: state.searchParams || {
            menu: 'TRAFFIC',
            timeFrom: '',
            timeTo: '',
            searchTerm: '',
          },
        });
      }
    },
    [
      state.fileStatuses,
      state.downloadId,
      downloadFile,
      updateFileStatuses,
      state.searchParams,
    ]
  );

  return {
    state,
    setState,
    updateFileStatuses,
    handleFileSelection,
    handleError,
    handleModalClose,
    handleDownload,
  };
};
