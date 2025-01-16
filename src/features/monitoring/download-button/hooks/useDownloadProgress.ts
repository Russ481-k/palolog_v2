import { useCallback, useRef } from 'react';

import { DownloadStatus } from '@/types/download';

import {
  DownloadProgressMessage,
  DownloadState,
  FileReadyMessage,
  FileStatuses,
  GenerationProgressMessage,
  NewFilesMessage,
  ProgressMessage,
  TotalProgressMessage,
  UpdateFileStatusProps,
} from '../types';

interface FileInfo {
  clientFileName: string;
  status: DownloadStatus;
  progress: number;
  lastUpdate?: string;
}

interface UseDownloadProgressProps {
  setState: React.Dispatch<React.SetStateAction<DownloadState>>;
  updateFileStatus: (props: UpdateFileStatusProps) => void;
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
  // Keep track of file name mappings
  const fileNameMap = useRef<Record<string, FileInfo>>({});

  const handleProgressMessage = useCallback(
    (message: ProgressMessage) => {
      const baseLogInfo = {
        type: message.type,
        timestamp: new Date().toISOString(),
      };

      if (isFileSpecificMessage(message)) {
        console.log('[useDownloadProgress] Received file message:', {
          ...baseLogInfo,
          fileName: message.fileName,
          status: message.status,
          progress: message.progress,
          processedRows: message.processedRows,
          totalRows: message.totalRows,
          previousStatus: fileNameMap.current[message.fileName]?.status,
          previousProgress: fileNameMap.current[message.fileName]?.progress,
        });
      } else {
        console.log('[useDownloadProgress] Received message:', baseLogInfo);
      }

      // Skip update if status and progress haven't changed
      if (isFileSpecificMessage(message)) {
        const fileInfo = fileNameMap.current[message.fileName];
        const currentTime = new Date().toISOString();

        console.log('[useDownloadProgress] State transition check:', {
          fileName: message.fileName,
          currentStatus: fileInfo?.status,
          newStatus: message.status,
          currentProgress: fileInfo?.progress,
          newProgress: message.progress,
          processedRows: message.processedRows,
          totalRows: message.totalRows,
          timestamp: currentTime,
          timeSinceLastUpdate: fileInfo
            ? new Date().getTime() -
              new Date(fileInfo.lastUpdate || currentTime).getTime()
            : 0,
        });

        if (
          fileInfo &&
          fileInfo.status === message.status &&
          fileInfo.progress === message.progress
        ) {
          console.log('[useDownloadProgress] Skipping duplicate update:', {
            fileName: message.fileName,
            status: message.status,
            progress: message.progress,
            timestamp: currentTime,
          });
          return;
        }

        // Update file info with latest state
        fileNameMap.current[message.fileName] = {
          clientFileName: fileInfo?.clientFileName || message.fileName,
          status: message.status,
          progress: message.progress || 0,
          lastUpdate: currentTime,
        };
      }

      if (isTotalProgressMessage(message)) {
        console.log('[useDownloadProgress] Updating total progress:', {
          progress: message.totalProgress.progress,
          status: message.totalProgress.status,
          processedRows: message.totalProgress.processedRows,
          totalRows: message.totalProgress.totalRows,
          timestamp: new Date().toISOString(),
        });
        setState((prev) => ({
          ...prev,
          totalProgress: message.totalProgress,
        }));
        return;
      }

      if (isNewFilesMessage(message)) {
        console.log('[useDownloadProgress] Adding new files:', {
          files: message.newFiles.map((file) => ({
            fileName: file.fileName,
            clientFileName: file.clientFileName,
            status: file.status,
            progress: file.progress,
            processedRows: file.processedRows,
            totalRows: file.totalRows,
          })),
          timestamp: new Date().toISOString(),
        });
        const newFileStatuses = message.newFiles.reduce<FileStatuses>(
          (acc, file) => {
            // Store the mapping between server and client file names
            fileNameMap.current[file.fileName] = {
              clientFileName: file.clientFileName || file.fileName,
              status: 'pending',
              progress: 0,
            };
            return {
              ...acc,
              [file.clientFileName || file.fileName]: {
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
            };
          },
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
        console.warn('[useDownloadProgress] Invalid message format:', {
          message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get the client file name from the map, or use the original if not found
      const fileInfo = fileNameMap.current[message.fileName];
      const clientFileName = fileInfo?.clientFileName || message.fileName;

      console.log('[useDownloadProgress] Updating file status:', {
        serverFileName: message.fileName,
        clientFileName,
        previousStatus: fileInfo?.status,
        newStatus: message.status,
        progress: message.progress,
        processedRows: message.processedRows,
        totalRows: message.totalRows,
        timestamp: new Date().toISOString(),
      });

      // Update the status in the map
      if (fileInfo) {
        fileInfo.status = message.status;
      }

      const baseUpdate = {
        processedRows: message.processedRows || 0,
        totalRows: message.totalRows || 0,
        searchParams: message.searchParams,
      };

      switch (message.status) {
        case 'generating':
          console.log('[useDownloadProgress] Updating generating status:', {
            fileName: clientFileName,
            progress: message.progress,
            processedRows: message.processedRows,
            timestamp: new Date().toISOString(),
          });
          updateFileStatus({
            fileName: clientFileName,
            update: {
              ...baseUpdate,
              status: 'generating',
              progress: message.progress || 0,
              message: message.message || 'Generating file...',
              processingSpeed: message.processingSpeed || 0,
              estimatedTimeRemaining: message.estimatedTimeRemaining || 0,
            },
          });
          break;

        case 'ready':
          console.log('[useDownloadProgress] Updating ready status:', {
            fileName: clientFileName,
            size: message.size,
            progress: message.progress,
            timestamp: new Date().toISOString(),
          });
          updateFileStatus({
            fileName: clientFileName,
            update: {
              ...baseUpdate,
              status: 'ready',
              progress: message.progress || 100,
              size: message.size || 0,
              message: message.message || 'Ready to download',
              processingSpeed: 0,
              estimatedTimeRemaining: 0,
            },
          });
          break;

        case 'downloading':
          console.log('[useDownloadProgress] Updating downloading status:', {
            fileName: clientFileName,
            progress: message.progress,
            processedRows: message.processedRows,
            timestamp: new Date().toISOString(),
          });
          updateFileStatus({
            fileName: clientFileName,
            update: {
              ...baseUpdate,
              status: 'downloading',
              progress: message.progress || 0,
              size: message.size || 0,
              message: message.message || 'Downloading...',
              processingSpeed: message.processingSpeed || 0,
              estimatedTimeRemaining: message.estimatedTimeRemaining || 0,
            },
          });
          break;

        case 'completed':
          console.log('[useDownloadProgress] Updating completed status:', {
            fileName: clientFileName,
            size: message.size,
            timestamp: new Date().toISOString(),
          });
          updateFileStatus({
            fileName: clientFileName,
            update: {
              ...baseUpdate,
              status: 'completed',
              progress: 100,
              size: message.size || 0,
              message: message.message || 'Download completed',
              processingSpeed: 0,
              estimatedTimeRemaining: 0,
            },
          });
          break;

        case 'failed':
          console.log('[useDownloadProgress] Updating failed status:', {
            fileName: clientFileName,
            message: message.message,
            timestamp: new Date().toISOString(),
          });
          updateFileStatus({
            fileName: clientFileName,
            update: {
              ...baseUpdate,
              status: 'failed',
              progress: 0,
              message: message.message || 'Download failed',
              processingSpeed: 0,
              estimatedTimeRemaining: 0,
            },
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
