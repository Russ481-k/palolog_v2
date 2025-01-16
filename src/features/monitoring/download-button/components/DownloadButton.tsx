import { forwardRef, useCallback, useState } from 'react';

import { Box, Button, Spinner, useColorMode } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';

import { trpc } from '@/lib/trpc/client';

import { useDownloadProgress } from '../hooks/useDownloadProgress';
import { useDownloadState } from '../hooks/useDownloadState';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { DownloadButtonProps, isProgressMessage } from '../types';
import { DownloadModal } from './DownloadModal';

export const DownloadButton = forwardRef<HTMLDivElement, DownloadButtonProps>(
  ({ searchId, totalRows, searchParams, isLoading }, ref) => {
    const { colorMode } = useColorMode();
    const gridTheme =
      colorMode === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark';
    const [activeDownloadId, setActiveDownloadId] = useState<string | null>(
      null
    );

    const {
      state,
      updateFileStatus,
      handleFileSelection,
      handleError,
      handleModalClose,
      setState,
    } = useDownloadState({
      onCleanup: (id) => cleanup.mutateAsync({ downloadId: id }),
      onCancel: (id) => cancelDownload.mutate({ downloadId: id }),
    });

    const { handleProgressMessage } = useDownloadProgress({
      setState,
      updateFileStatus,
    });

    const {
      connect,
      startDownload: startWebSocketDownload,
      isConnecting: isConnectingWs,
    } = useWebSocketConnection({
      downloadId: activeDownloadId || '',
      searchId,
      searchParams,
      totalRows,
      onMessage: (message: unknown) => {
        if (!isProgressMessage(message)) return;
        handleProgressMessage(message);
      },
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
      onError: (error) => {
        console.error('Failed to download file:', error);
      },
    });
    const cancelDownload = trpc.download.cancelDownload.useMutation();
    const cleanup = trpc.download.cleanup.useMutation();

    const startDownloadMutation = trpc.download.startDownload.useMutation({
      onMutate: () => {
        console.log('[DownloadButton] Starting download mutation...', {
          searchId,
          totalRows,
          searchParams,
          timestamp: new Date().toISOString(),
        });
      },
      onSuccess: async (result) => {
        console.log('[DownloadButton] Download mutation successful:', {
          result,
          timestamp: new Date().toISOString(),
        });
        if (!result.downloadId) {
          throw new Error('Download ID not received from server');
        }
      },
      onError: (error) => {
        console.error('[DownloadButton] Download mutation failed:', {
          error: error.message,
          searchId,
          timestamp: new Date().toISOString(),
        });
        handleError(new Error(error.message || 'Failed to start download'));
      },
      retry: false,
      onSettled: (data, error) => {
        console.log('[DownloadButton] Download mutation settled:', {
          success: !!data,
          hasError: !!error,
          timestamp: new Date().toISOString(),
        });
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

        const result = await startDownloadMutation.mutateAsync({
          searchId,
          totalRows,
          searchParams,
        });

        if (!result.downloadId) {
          throw new Error('Download ID not received from server');
        }

        setActiveDownloadId(result.downloadId);

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            setState((prev) => ({
              ...prev,
              downloadId: result.downloadId,
              fileStatuses: result.files.reduce(
                (acc, file) => ({
                  ...acc,
                  [file.fileName]: {
                    ...file,
                    status: 'pending',
                    progress: 0,
                    processingSpeed: 0,
                    estimatedTimeRemaining: 0,
                  },
                }),
                {}
              ),
            }));
            resolve();
          });
        });

        const socket = await connect();

        if (!socket) {
          throw new Error('Failed to establish WebSocket connection');
        }

        startWebSocketDownload();
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
      connect,
      startWebSocketDownload,
      handleError,
    ]);

    const handleFileDownload = (fileName: string) => {
      const fileStatus = state.fileStatuses[fileName];
      if (!fileStatus || fileStatus.status !== 'ready') {
        return;
      }

      downloadFile.mutate(
        {
          fileName,
          downloadId: state.downloadId,
        },
        {
          onSuccess: () => {
            updateFileStatus({
              fileName,
              update: {
                status: 'downloading',
                progress: 0,
                message: 'Starting download...',
              },
            });
          },
          onError: (error) => {
            updateFileStatus({
              fileName,
              update: {
                status: 'failed',
                message: error.message || 'Download failed',
              },
            });
          },
        }
      );
    };

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
          totalProgress={state.totalProgress || null}
          fileStatuses={state.fileStatuses}
          selectedFiles={state.selectedFiles}
          onFileSelection={handleFileSelection}
          onFileDownload={handleFileDownload}
          gridTheme={gridTheme}
        />
      </Box>
    );
  }
);

DownloadButton.displayName = 'DownloadButton';
