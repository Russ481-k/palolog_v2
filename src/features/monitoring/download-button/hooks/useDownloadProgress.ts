import { useCallback } from 'react';

import {
  DownloadProgressMessage,
  DownloadState,
  FileReadyMessage,
  FileStatus,
  FileStatuses,
  GenerationProgressMessage,
  NewFilesMessage,
  ProgressMessage,
  TotalProgressMessage,
} from '../types';

interface UseDownloadProgressProps {
  setState: (updater: (prev: DownloadState) => DownloadState) => void;
  updateFileStatus: (fileName: string, update: Partial<FileStatus>) => void;
}

const isTotalProgressMessage = (
  message: ProgressMessage
): message is TotalProgressMessage => {
  return 'totalProgress' in message;
};

const isNewFilesMessage = (
  message: ProgressMessage
): message is NewFilesMessage => {
  return 'newFiles' in message;
};

const isFileSpecificMessage = (
  message: ProgressMessage
): message is
  | GenerationProgressMessage
  | DownloadProgressMessage
  | FileReadyMessage => {
  if (!('fileName' in message)) return false;
  if (!('status' in message)) return false;
  const validStatuses = [
    'generating',
    'downloading',
    'ready',
    'completed',
    'failed',
  ] as const;
  return validStatuses.includes(
    message.status as (typeof validStatuses)[number]
  );
};

export const useDownloadProgress = ({
  setState,
  updateFileStatus,
}: UseDownloadProgressProps) => {
  const handleProgressMessage = useCallback(
    (message: ProgressMessage) => {
      console.log('[useDownloadProgress] Received message:', message);

      if (isTotalProgressMessage(message)) {
        console.log(
          '[useDownloadProgress] Updating total progress:',
          message.totalProgress
        );
        setState((prev) => ({
          ...prev,
          totalProgress: message.totalProgress,
        }));
        return;
      }

      if (isNewFilesMessage(message)) {
        console.log(
          '[useDownloadProgress] Adding new files:',
          message.newFiles
        );
        const newFileStatuses = message.newFiles.reduce<FileStatuses>(
          (acc, file) => ({
            ...acc,
            [file.fileName]: {
              size: file.size || 0,
              status: 'pending',
              progress: 0,
              message: 'Initializing...',
              processedRows: file.processedRows || 0,
              totalRows: file.totalRows || 0,
              processingSpeed: 0,
              estimatedTimeRemaining: 0,
              searchParams: file.searchParams,
            },
          }),
          {}
        );

        setState((prev) => ({
          ...prev,
          fileStatuses: {
            ...prev.fileStatuses,
            ...newFileStatuses,
          },
        }));
        return;
      }

      if (!isFileSpecificMessage(message)) {
        console.warn('[useDownloadProgress] Invalid message format:', message);
        return;
      }

      console.log('[useDownloadProgress] Updating file status:', {
        fileName: message.fileName,
        status: message.status,
        progress: message.progress,
      });

      const baseUpdate = {
        processedRows: message.processedRows || 0,
        totalRows: message.totalRows || 0,
        searchParams: message.searchParams,
      };

      switch (message.status) {
        case 'generating':
          updateFileStatus(message.fileName, {
            ...baseUpdate,
            status: 'generating',
            progress: message.progress || 0,
            message: message.message || 'Generating file...',
            processingSpeed: message.processingSpeed || 0,
            estimatedTimeRemaining: message.estimatedTimeRemaining || 0,
          });
          break;

        case 'ready':
          updateFileStatus(message.fileName, {
            ...baseUpdate,
            status: 'ready',
            progress: 0,
            size: message.size || 0,
            message: message.message || 'Ready to download',
            processingSpeed: 0,
            estimatedTimeRemaining: 0,
          });
          break;

        case 'downloading':
          updateFileStatus(message.fileName, {
            ...baseUpdate,
            status: 'downloading',
            progress: message.progress || 0,
            size: message.size || 0,
            message: message.message || 'Downloading...',
            processingSpeed: message.processingSpeed || 0,
            estimatedTimeRemaining: message.estimatedTimeRemaining || 0,
          });
          break;

        case 'completed':
          updateFileStatus(message.fileName, {
            ...baseUpdate,
            status: 'completed',
            progress: 100,
            size: message.size || 0,
            message: message.message || 'Download completed',
            processingSpeed: 0,
            estimatedTimeRemaining: 0,
          });
          break;

        case 'failed':
          updateFileStatus(message.fileName, {
            ...baseUpdate,
            status: 'failed',
            progress: 0,
            message: message.message || 'Download failed',
            processingSpeed: 0,
            estimatedTimeRemaining: 0,
          });
          break;
      }
    },
    [setState, updateFileStatus]
  );

  return {
    handleProgressMessage,
  };
};
