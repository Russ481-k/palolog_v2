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
        downloadId: update.downloadId,
        clientFileName: update.clientFileName,
        currentStatus: state.fileStatuses[update.downloadId]?.status,
        newStatus: update.status,
        update,
      });

      if (!state.fileStatuses[update.downloadId]) {
        console.log('[useDownloadState] Creating new file:', {
          downloadId: update.downloadId,
          clientFileName: update.clientFileName,
          initialState: update,
        });

        setState((prev) => ({
          ...prev,
          fileStatuses: {
            ...prev.fileStatuses,
            [update.downloadId]: {
              clientFileName: update.clientFileName || update.fileName,
              fileName: update.fileName,
              downloadId: update.downloadId,
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

      if (
        update.status &&
        state.fileStatuses[update.downloadId]?.status !== update.status
      ) {
        const currentStatus =
          state.fileStatuses[update.downloadId]?.status || 'generating';
        const allowedTransitions = validTransitions[currentStatus];
        console.log('[useDownloadState] Validating status transition:', {
          downloadId: update.downloadId,
          from: currentStatus,
          to: update.status,
          allowed: allowedTransitions,
        });

        if (!allowedTransitions.includes(update.status)) {
          console.warn(
            `[useDownloadState] Invalid status transition from ${state.fileStatuses[update.downloadId]?.status} to ${update.status}`
          );
          return;
        }
      }

      const updatedFile: FileStatus = {
        ...state.fileStatuses[update.downloadId],
        clientFileName: update.clientFileName || update.fileName,
        fileName: update.fileName,
        downloadId: update.downloadId,
        status:
          update.status ||
          state.fileStatuses[update.downloadId]?.status ||
          'generating',
        progress:
          update.progress ??
          state.fileStatuses[update.downloadId]?.progress ??
          0,
        message:
          update.message ??
          state.fileStatuses[update.downloadId]?.message ??
          'Initializing...',
        size: update.size ?? state.fileStatuses[update.downloadId]?.size ?? 0,
        processedRows:
          update.processedRows ??
          state.fileStatuses[update.downloadId]?.processedRows ??
          0,
        totalRows:
          update.totalRows ??
          state.fileStatuses[update.downloadId]?.totalRows ??
          0,
        processingSpeed:
          update.processingSpeed ??
          state.fileStatuses[update.downloadId]?.processingSpeed ??
          0,
        estimatedTimeRemaining:
          update.estimatedTimeRemaining ??
          state.fileStatuses[update.downloadId]?.estimatedTimeRemaining ??
          0,
        searchParams: update.searchParams ??
          state.fileStatuses[update.downloadId]?.searchParams ?? {
            menu: 'TRAFFIC',
            timeFrom: '',
            timeTo: '',
            searchTerm: '',
          },
      };

      console.log('[useDownloadState] Updated file status:', {
        downloadId: update.downloadId,
        clientFileName: updatedFile.clientFileName,
        before: state.fileStatuses[update.downloadId]?.status,
        after: updatedFile.status,
        progress: updatedFile.progress,
        message: updatedFile.message,
      });

      setState((prev) => ({
        ...prev,
        fileStatuses: {
          ...prev.fileStatuses,
          [update.downloadId]: updatedFile,
        },
      }));
    },
    [state.fileStatuses]
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

        if (result.filePath) {
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
          searchParams: state.searchParams || {
            menu: 'TRAFFIC',
            timeFrom: '',
            timeTo: '',
            searchTerm: '',
          },
        });
      }
    },
    [state.fileStatuses, downloadFile, updateFileStatuses, state.searchParams]
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
