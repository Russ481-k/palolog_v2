import { forwardRef, useCallback } from 'react';

import { Box, Button, Spinner, useColorMode } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';

import { trpc } from '@/lib/trpc/client';

import { useDownloadProgress } from '../hooks/useDownloadProgress';
import { useDownloadState } from '../hooks/useDownloadState';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import {
  DownloadButtonProps,
  DownloadState,
  FileStatus,
  isProgressMessage,
} from '../types';
import { DownloadModal } from './DownloadModal';

export const DownloadButton = forwardRef<HTMLDivElement, DownloadButtonProps>(
  ({ searchId, totalRows, searchParams, isLoading }, ref) => {
    const { colorMode } = useColorMode();
    const gridTheme =
      colorMode === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark';

    const {
      state,
      setState,
      updateFileStatuses,
      handleError,
      handleModalClose,
      handleDownload,
    } = useDownloadState({
      onCleanup: (id) => cleanup.mutateAsync({ downloadId: id }),
      onCancel: (id) => cancelDownload.mutate({ downloadId: id }),
    });

    const handleProgressMessage = useCallback(
      (message: unknown) => {
        if (!isProgressMessage(message)) return;

        console.log('[DownloadButton] Progress message:', message);
        const fileStatus: FileStatus = {
          fileName: message.fileName,
          downloadId: message.downloadId,
          status: message.status,
          progress: message.progress,
          message: message.message,
          processedRows: message.processedRows,
          totalRows: message.totalRows,
          processingSpeed: message.processingSpeed,
          estimatedTimeRemaining: message.estimatedTimeRemaining,
          size: 0,
          searchParams: searchParams,
          clientFileName: state.fileStatuses[message.fileName]?.clientFileName,
        };
        console.log('[DownloadButton] File status update:', fileStatus);

        updateFileStatuses(fileStatus);

        const totalFiles = Object.keys(state.fileStatuses).length;
        const completedFiles = Object.values(state.fileStatuses).filter(
          (f) => f.status === 'completed' || f.status === 'ready'
        ).length;

        const totalProgress = {
          status: message.status,
          progress: (completedFiles / totalFiles) * 100,
          message: `${completedFiles}/${totalFiles} files completed`,
          processedRows: Object.values(state.fileStatuses).reduce(
            (sum, f) => sum + f.processedRows,
            0
          ),
          totalRows: Object.values(state.fileStatuses).reduce(
            (sum, f) => sum + f.totalRows,
            0
          ),
          processingSpeed: Object.values(state.fileStatuses).reduce(
            (sum, f) => sum + (f.processingSpeed || 0),
            0
          ),
          estimatedTimeRemaining: Math.max(
            ...Object.values(state.fileStatuses).map(
              (f) => f.estimatedTimeRemaining || 0
            )
          ),
        };

        setState((prev) => ({
          ...prev,
          totalProgress,
        }));
      },
      [state, searchParams, updateFileStatuses, setState]
    );

    const {
      connect,
      startDownload: startWebSocketDownload,
      isConnecting: isConnectingWs,
    } = useWebSocketConnection({
      downloadId: state.downloadId,
      searchId,
      searchParams,
      totalRows,
      onMessage: handleProgressMessage,
      onError: handleError,
      onConnectionAcknowledged: () => {
        console.log('[WebSocket] Connection acknowledged by server');
        setState((prev) => ({
          ...prev,
          isConnectionReady: true,
        }));
      },
    });

    const downloadFile = trpc.download.downloadFile.useMutation({
      onSuccess: () => {
        setState((prev) => ({
          ...prev,
          status: 'downloading',
          progress: 0,
          message: 'Starting download...',
        }));
      },
      onError: (error) => {
        setState((prev) => ({
          ...prev,
          status: 'failed',
          message: error.message || 'Download failed',
        }));
      },
    });

    const cancelDownload = trpc.download.cancelDownload.useMutation();
    const cleanup = trpc.download.cleanup.useMutation();

    const startDownloadMutation = trpc.download.startDownload.useMutation({
      onSuccess: async (result) => {
        console.log('[DownloadButton] Download mutation successful:', {
          result,
          timestamp: new Date().toISOString(),
        });

        if (!result.downloadId || !result.files.length) {
          throw new Error('Invalid response from server');
        }

        const initialFileStatuses = result.files.reduce(
          (acc, file) => {
            acc[file.fileName] = {
              fileName: file.fileName,
              clientFileName: file.clientFileName,
              downloadId: file.downloadId,
              status: file.status,
              progress: file.progress || 0,
              message: file.message || 'Initializing...',
              processedRows: file.processedRows || 0,
              totalRows: file.totalRows || 0,
              processingSpeed: file.processingSpeed || 0,
              estimatedTimeRemaining: file.estimatedTimeRemaining || 0,
              size: 0,
              searchParams: searchParams,
            };
            return acc;
          },
          {} as Record<string, FileStatus>
        );

        setState((prev) => ({
          ...prev,
          downloadId: result.downloadId,
          fileStatuses: initialFileStatuses,
          selectedFiles: result.files.map((f) => f.fileName),
          status: 'generating',
          isOpen: true,
        }));

        const socket = await connect(result.downloadId);
        if (!socket) {
          throw new Error('Failed to establish WebSocket connection');
        }

        startWebSocketDownload();
      },
      onError: (error) => {
        console.error('[DownloadButton] Download mutation failed:', {
          error: error.message,
          searchId,
          timestamp: new Date().toISOString(),
        });
        handleError(new Error(error.message || 'Failed to start download'));
      },
    });

    const handleDownloadClick = useCallback(async () => {
      try {
        setState((prev) => ({
          ...prev,
          isOpen: true,
          isConnecting: true,
          isConnectionReady: false,
        }));

        await startDownloadMutation.mutateAsync({
          searchId,
          totalRows,
          searchParams,
        });
      } catch (error) {
        console.error('[DownloadButton] Error during download process:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        handleError(
          error instanceof Error ? error : new Error('Download failed')
        );
      } finally {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
        }));
      }
    }, [
      searchId,
      totalRows,
      searchParams,
      startDownloadMutation,
      setState,
      handleError,
    ]);

    const handleFileDownload = useCallback(
      (fileName: string) => {
        const fileStatus = state.fileStatuses[fileName];
        if (!fileStatus || fileStatus.status !== 'ready') return;

        downloadFile.mutate({
          downloadId: fileStatus.downloadId,
          fileName: fileStatus.fileName,
        });
      },
      [state.fileStatuses, downloadFile]
    );

    const handleFileSelection = useCallback(
      (fileName: string, selected: boolean) => {
        setState((prev) => ({
          ...prev,
          selectedFiles: selected
            ? [...prev.selectedFiles, fileName]
            : prev.selectedFiles.filter((f) => f !== fileName),
        }));
      },
      [setState]
    );

    const handleDownloadSelected = useCallback(() => {
      state.selectedFiles?.forEach((fileName) => {
        const fileStatus = state.fileStatuses[fileName];
        if (fileStatus?.status === 'ready') {
          handleFileDownload(fileName);
        }
      });
    }, [state.selectedFiles, state.fileStatuses, handleFileDownload]);

    return (
      <Box ref={ref} lineHeight="normal">
        <Button
          size="xs"
          borderLeftRadius="0"
          borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
          textAlign="center"
          leftIcon={
            isConnectingWs ? (
              <Spinner size="xs" />
            ) : (
              <FaDownload width="12px" height="12px" />
            )
          }
          onClick={handleDownloadClick}
          aria-label="Download"
          isLoading={isConnectingWs || isLoading}
          loadingText="Connecting..."
          disabled={isConnectingWs || isLoading}
          width="120px"
          className="download-button"
        >
          Download
        </Button>
        <DownloadModal
          isOpen={state.isOpen}
          onClose={handleModalClose}
          totalProgress={state.totalProgress}
          fileStatuses={state.fileStatuses}
          selectedFiles={state.selectedFiles}
          onFileSelection={handleFileSelection}
          onFileDownload={handleFileDownload}
          onDownloadSelected={handleDownloadSelected}
          gridTheme={gridTheme}
        />
      </Box>
    );
  }
);

DownloadButton.displayName = 'DownloadButton';
