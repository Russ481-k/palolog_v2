import { forwardRef, useCallback, useEffect } from 'react';

import { Box, Button, Spinner, useColorMode } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';

import { trpc } from '@/lib/trpc/client';

import { useDownloadState } from '../hooks/useDownloadState';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { DownloadButtonProps, FileStatus, isProgressMessage } from '../types';
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
    } = useDownloadState({
      onCleanup: (id) => cleanup.mutateAsync({ downloadId: id }),
      onCancel: (id) => cancelDownload.mutate({ downloadId: id }),
    });

    const handleProgressMessage = useCallback(
      (message: unknown) => {
        if (!isProgressMessage(message)) return;

        console.log('[DownloadButton] Progress message:', {
          ...message,
          timeRange:
            message.firstReceiveTime && message.lastReceiveTime
              ? `${message.firstReceiveTime} ~ ${message.lastReceiveTime}`
              : 'Not available',
          timestamp: new Date().toISOString(),
        });

        const fileStatus: FileStatus = {
          fileName: message.fileName,
          downloadId: message.downloadId,
          clientFileName: message.clientFileName,
          status: message.status,
          progress: message.progress,
          message: message.message || '',
          processedRows: message.processedRows,
          totalRows: message.totalRows,
          processingSpeed: message.processingSpeed || 0,
          estimatedTimeRemaining: message.estimatedTimeRemaining || 0,
          size: message.size || 0,
          firstReceiveTime: message.firstReceiveTime,
          lastReceiveTime: message.lastReceiveTime,
        };

        console.log('[DownloadButton] File status update:', {
          ...fileStatus,
          timeRange:
            fileStatus.firstReceiveTime && fileStatus.lastReceiveTime
              ? `${fileStatus.firstReceiveTime} ~ ${fileStatus.lastReceiveTime}`
              : 'Not available',
          timestamp: new Date().toISOString(),
        });

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
      disconnect,
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

    const downloadFileMutation = trpc.download.downloadFile.useMutation({
      onSuccess: ({ downloadId, fileName }) => {
        console.log('[DownloadButton] Download mutation successful:', {
          downloadId,
          fileName,
          timestamp: new Date().toISOString(),
        });
      },
      onError: (error) => {
        console.error('[DownloadButton] Download file mutation failed:', {
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        handleError(new Error(error.message || 'Failed to download file'));
      },
    });

    const handleFileDownload = async (fileName: string) => {
      const fileStatus = Object.values(state.fileStatuses).find(
        (status) => status.clientFileName === fileName
      );

      if (!fileStatus?.clientFileName || !fileStatus?.fileName) {
        console.error('[DownloadButton] Required file information not found:', {
          fileName,
          availableFiles: Object.keys(state.fileStatuses),
        });
        return;
      }

      if (fileStatus.status !== 'ready' && fileStatus.status !== 'completed') {
        console.warn('[DownloadButton] File not ready for download:', {
          fileName,
          status: fileStatus.status,
        });
        return;
      }

      try {
        const result = await downloadFileMutation.mutateAsync({
          fileName: fileStatus.fileName,
          downloadId: fileStatus.downloadId,
        });

        console.log('[DownloadButton] Starting file download:', {
          serverFileName: result.fileName,
          clientFileName: fileStatus.clientFileName,
          status: result.status,
        });

        const response = await fetch(`/api/download?file=${result.fileName}`);
        if (!response.ok) {
          throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileStatus.clientFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log('[DownloadButton] File download completed:', {
          serverFileName: result.fileName,
          clientFileName: fileStatus.clientFileName,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[DownloadButton] Download failed:', {
          fileName,
          error: error instanceof Error ? error.message : String(error),
        });
        handleError(new Error('Failed to download file'));
      }
    };

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
            acc[file.downloadId] = {
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
            };
            return acc;
          },
          {} as Record<string, FileStatus>
        );

        setState((prev) => ({
          ...prev,
          downloadId: result.downloadId,
          fileStatuses: initialFileStatuses,
          selectedFiles: result.files.map((f) => f.downloadId),
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

    const handleClose = useCallback(() => {
      console.log('[DownloadButton] Modal closing, cleaning up...', {
        downloadId: state.downloadId,
        timestamp: new Date().toISOString(),
      });

      // 웹소켓 연결 종료
      disconnect();

      // 다운로드 취소 및 파일 정리
      if (state.downloadId) {
        // 먼저 다운로드를 취소
        cancelDownload
          .mutateAsync({ downloadId: state.downloadId })
          .then(() => {
            console.log('[DownloadButton] Download cancelled successfully:', {
              downloadId: state.downloadId,
              timestamp: new Date().toISOString(),
            });

            // 다운로드 취소 후 cleanup 실행
            return cleanup.mutateAsync({ downloadId: state.downloadId });
          })
          .then(() => {
            console.log('[DownloadButton] Cleanup completed successfully:', {
              downloadId: state.downloadId,
              timestamp: new Date().toISOString(),
            });
          })
          .catch((error) => {
            console.error('[DownloadButton] Failed to cancel/cleanup:', {
              error: error instanceof Error ? error.message : String(error),
              downloadId: state.downloadId,
              timestamp: new Date().toISOString(),
            });
          });
      }

      setState((prev) => ({
        ...prev,
        isOpen: false,
        isConnecting: false,
        isConnectionReady: false,
      }));
      handleModalClose();
    }, [
      state.downloadId,
      disconnect,
      cancelDownload,
      cleanup,
      setState,
      handleModalClose,
    ]);

    // Handle browser close/refresh
    useEffect(() => {
      const handleBeforeUnload = () => {
        console.log(
          '[DownloadButton] Browser closing/refreshing, cleaning up...',
          {
            downloadId: state.downloadId,
            timestamp: new Date().toISOString(),
          }
        );

        if (state.downloadId) {
          // 웹소켓 연결 종료
          disconnect();

          // 동기적으로 다운로드 취소 요청 전송
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000);

          fetch('/api/download/cancel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ downloadId: state.downloadId }),
            signal: controller.signal,
          }).catch(() => {
            // 브라우저 종료 시에는 에러가 발생할 수 있으므로 무시
          });

          clearTimeout(timeoutId);
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }, [state.downloadId, disconnect]);

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

    const handleFileSelection = useCallback(
      (downloadId: string, selected: boolean) => {
        setState((prev) => ({
          ...prev,
          selectedFiles: selected
            ? [...prev.selectedFiles, downloadId]
            : prev.selectedFiles.filter((id) => id !== downloadId),
        }));
      },
      [setState]
    );

    const handleDownloadSelected = useCallback(() => {
      state.selectedFiles?.forEach((downloadId) => {
        const fileStatus = state.fileStatuses[downloadId];
        if (fileStatus?.status === 'ready' && fileStatus.clientFileName) {
          handleFileDownload(fileStatus.clientFileName);
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
          onClose={handleClose}
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
