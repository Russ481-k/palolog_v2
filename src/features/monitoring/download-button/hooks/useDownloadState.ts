import { useCallback, useState } from 'react';

import { useToast } from '@chakra-ui/react';

import { trpc } from '@/lib/trpc/client';
import { WebSocketMessage } from '@/types/download';

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

export const useDownloadState = ({ onCleanup }: UseDownloadStateProps) => {
  const toast = useToast();
  const downloadFile = trpc.download.downloadFile.useMutation();
  const [state, setState] = useState<DownloadState>(initialState);

  const initializeFileStatuses = useCallback((files: FileStatus[]) => {
    console.log('[useDownloadState] Initializing file statuses:', {
      existingFiles: [],
      newFiles: files,
      timestamp: new Date().toISOString(),
    });

    setState((prev) => {
      const existingStatuses = Object.values(prev.fileStatuses);
      console.log('[useDownloadState] Before initialization:', {
        existingStatuses,
        timestamp: new Date().toISOString(),
      });

      const updatedStatuses = files.map((file) => {
        const existingFile = prev.fileStatuses[file.fileName];
        console.log('[useDownloadState] Adding/Updating file:', {
          fileName: file.fileName,
          existingFile,
          newFile: file,
          timestamp: new Date().toISOString(),
        });

        // 기존 파일이 있고 ready 상태면 업데이트하지 않음
        if (existingFile?.status === 'ready') {
          console.log('[useDownloadState] Skipping update for ready file:', {
            fileName: file.fileName,
            timestamp: new Date().toISOString(),
          });
          return existingFile;
        }

        return file as FileStatus;
      });

      console.log('[useDownloadState] After initialization:', {
        updatedStatuses,
        timestamp: new Date().toISOString(),
      });

      const newFileStatuses = {
        ...prev.fileStatuses,
        ...Object.fromEntries(
          updatedStatuses.map((status) => [status.fileName, status])
        ),
      };

      return {
        ...prev,
        fileStatuses: newFileStatuses,
      };
    });
  }, []);

  const updateFileStatuses = useCallback((update: FileStatus) => {
    console.log('[useDownloadState] Updating file status:', {
      fileName: update.fileName,
      newStatus: update,
      timestamp: new Date().toISOString(),
    });

    setState((prev) => {
      const currentFile = prev.fileStatuses[update.fileName];
      console.log('[useDownloadState] Current file state:', {
        fileName: update.fileName,
        currentFile,
        timestamp: new Date().toISOString(),
      });

      // ready 상태인 파일은 업데이트하지 않음
      if (currentFile?.status === 'ready') {
        console.log('[useDownloadState] Skipping update for ready file:', {
          fileName: update.fileName,
          timestamp: new Date().toISOString(),
        });
        return prev;
      }

      // 새로운 파일 상태 생성 - 기존 값이 있고 새 값이 undefined나 0이면 기존 값 유지
      const updatedFile = {
        ...currentFile,
        ...update,
        firstReceiveTime:
          update.firstReceiveTime || currentFile?.firstReceiveTime,
        lastReceiveTime: update.lastReceiveTime || currentFile?.lastReceiveTime,
        size: update.size || currentFile?.size || 0,
        processingSpeed:
          update.processingSpeed || currentFile?.processingSpeed || 0,
        estimatedTimeRemaining:
          update.estimatedTimeRemaining ||
          currentFile?.estimatedTimeRemaining ||
          0,
        // ready 상태로 변경될 때 기존 정보 유지
        ...(update.status === 'ready' && currentFile
          ? {
              firstReceiveTime: currentFile.firstReceiveTime,
              lastReceiveTime: currentFile.lastReceiveTime,
              size: currentFile.size,
              processingSpeed: currentFile.processingSpeed,
              estimatedTimeRemaining: currentFile.estimatedTimeRemaining,
            }
          : {}),
      };

      console.log('[useDownloadState] Updated file state:', {
        fileName: update.fileName,
        updatedFile,
        timestamp: new Date().toISOString(),
      });

      return {
        ...prev,
        fileStatuses: {
          ...prev.fileStatuses,
          [update.fileName]: updatedFile,
        },
      };
    });
  }, []);

  const handleFileSelection = (downloadId: string, selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: selected
        ? [...prev.selectedFiles, downloadId]
        : prev.selectedFiles.filter((id) => id !== downloadId),
    }));
  };

  const handleError = useCallback(
    (error: Error) => {
      console.error('[DownloadButton] Download error:', error);
      toast({
        title: '다운로드 오류',
        description: error.message || '파일 다운로드 중 오류가 발생했습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      setState((prev) => ({
        ...prev,
        error,
      }));
    },
    [toast, setState]
  );

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
        });

        if (result.success) {
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
    console.log('[useDownloadState] Received WebSocket message:', {
      type: message.type,
      fileName: message.fileName,
      status: message.status,
      timestamp: new Date().toISOString(),
    });

    // file_ready 메시지이고 size가 0이면 무시
    if (
      message.type === 'file_ready' &&
      (!message.size || message.size === 0)
    ) {
      console.log('[useDownloadState] Ignoring empty file_ready message:', {
        fileName: message.fileName,
        size: message.size,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    setState((prevState) => {
      const fileStatuses = { ...prevState.fileStatuses };
      console.log('[useDownloadState] Current file statuses:', {
        existingFiles: Object.keys(fileStatuses).map((key) => ({
          fileName: fileStatuses[key]?.fileName,
          clientFileName: fileStatuses[key]?.clientFileName,
          size: fileStatuses[key]?.size,
        })),
        timestamp: new Date().toISOString(),
      });

      // 이미 존재하는 파일이고 size가 0이면 업데이트 하지 않음
      if (
        fileStatuses[message.fileName] &&
        (!message.size || message.size === 0)
      ) {
        console.log(
          '[useDownloadState] Skipping update for existing file with zero size:',
          {
            fileName: message.fileName,
            existingSize: fileStatuses[message.fileName]?.size,
            newSize: message.size,
            timestamp: new Date().toISOString(),
          }
        );
        return prevState;
      }

      const currentStatus: FileStatus = fileStatuses[message.fileName] || {
        fileName: message.fileName,
        clientFileName: '',
        downloadId: message.downloadId,
        status: 'generating',
        progress: 0,
        processedRows: 0,
        totalRows: 0,
        message: '',
        processingSpeed: 0,
        estimatedTimeRemaining: 0,
        size: 0,
        firstReceiveTime: '',
        lastReceiveTime: '',
      };

      console.log('[useDownloadState] Current status for file:', {
        fileName: message.fileName,
        currentStatus,
        timestamp: new Date().toISOString(),
      });

      // 기존 상태를 보존하면서 새로운 상태로 업데이트
      fileStatuses[message.fileName] = {
        ...currentStatus,
        fileName: message.fileName,
        clientFileName: message.clientFileName || currentStatus.clientFileName,
        downloadId: message.downloadId,
        status: message.status || currentStatus.status,
        progress: message.progress ?? currentStatus.progress,
        processedRows: message.processedRows ?? currentStatus.processedRows,
        totalRows: message.totalRows ?? currentStatus.totalRows,
        message: message.message || currentStatus.message,
        processingSpeed:
          message.processingSpeed ?? currentStatus.processingSpeed,
        estimatedTimeRemaining:
          message.estimatedTimeRemaining ??
          currentStatus.estimatedTimeRemaining,
        firstReceiveTime:
          message.firstReceiveTime || currentStatus.firstReceiveTime,
        lastReceiveTime:
          message.lastReceiveTime || currentStatus.lastReceiveTime,
        size: message.size ?? currentStatus.size,
      };

      console.log('[useDownloadState] Updated status:', {
        fileName: message.fileName,
        updatedStatus: fileStatuses[message.fileName],
        timestamp: new Date().toISOString(),
      });

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
    initializeFileStatuses,
  };
};
