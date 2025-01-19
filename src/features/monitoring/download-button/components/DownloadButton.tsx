import { forwardRef, useCallback, useEffect, useState } from 'react';

import { Box, Button, Spinner, useColorMode, useToast } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';

import { trpc } from '@/lib/trpc/client';
import { getServerFileName } from '@/server/utils/fileNaming';
import { WebSocketMessage } from '@/types/download';

import { useDownloadState } from '../hooks/useDownloadState';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { DownloadButtonProps, FileStatus } from '../types';
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
      handleFileSelection,
      handleError,
      handleModalClose,
      initializeFileStatuses,
    } = useDownloadState({
      onCleanup: (id) => cleanup.mutateAsync({ downloadId: id }),
      onCancel: (id) => cancelDownload.mutate({ downloadId: id }),
    });

    const toast = useToast();

    // 실패한 다운로드를 추적하기 위한 상태 추가
    const [failedDownloads, setFailedDownloads] = useState<Set<string>>(
      new Set()
    );
    const [, setCompletedDownloads] = useState<Set<string>>(new Set());

    const handleProgressMessage = useCallback(
      (message: WebSocketMessage) => {
        console.log('[DownloadButton] Progress message received:', {
          downloadId: message.downloadId,
          fileName: message.fileName,
          clientFileName: message.clientFileName,
          status: message.status,
          progress: message.progress,
          processedRows: message.processedRows,
          totalRows: message.totalRows,
          timeRange:
            message.firstReceiveTime && message.lastReceiveTime
              ? `${message.firstReceiveTime} ~ ${message.lastReceiveTime}`
              : 'Not available',
          timestamp: new Date().toISOString(),
        });

        // 초기 파일 목록을 받았을 때 상태 초기화
        if (message.type === 'file_ready') {
          const fileStatus: FileStatus = {
            fileName: message.fileName,
            downloadId: message.downloadId,
            clientFileName: message.clientFileName || '',
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

          initializeFileStatuses([fileStatus]);
        } else {
          // 진행 상황 업데이트
          const fileStatus: FileStatus = {
            fileName: message.fileName,
            downloadId: message.downloadId,
            clientFileName: message.clientFileName || '',
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

          updateFileStatuses(fileStatus);
        }

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
      [state, updateFileStatuses, setState, initializeFileStatuses]
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
      onSuccess: (result) => {
        console.log('[DownloadButton] Download mutation successful:', {
          result,
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

    const handleFileDownload = useCallback(
      async (serverFileName: string, clientFileName: string) => {
        try {
          if (!serverFileName) {
            throw new Error('서버 파일명이 필요합니다.');
          }

          // 파일명에서 인덱스 추출 (예: xxx_2.csv -> 2)
          const match = serverFileName.match(/_(\d+)\.csv$/);
          console.log('[DownloadButton] Extracted file info:', {
            serverFileName,
            match,
            matchGroups: match ? Array.from(match) : null,
            timestamp: new Date().toISOString(),
          });

          const index = match?.[1] ? parseInt(match[1], 10) - 1 : 0;

          // downloadId는 파일명에서 _1.csv 부분을 제외한 나머지
          const downloadId = serverFileName.replace(/_\d+\.csv$/, '');
          console.log('[DownloadButton] Extracted download info:', {
            serverFileName,
            downloadId,
            index,
            fileStatus: state.fileStatuses[serverFileName],
            timestamp: new Date().toISOString(),
          });

          const fileName = getServerFileName(downloadId, index);
          const result = await downloadFileMutation.mutateAsync({
            fileName,
          });

          console.log('[DownloadButton] Download mutation result:', {
            requestedFileName: fileName,
            requestedDownloadId: downloadId,
            result,
            timestamp: new Date().toISOString(),
          });

          const response = await fetch(`/api/download?file=${fileName}`);

          if (!response.ok) {
            throw new Error('파일 다운로드에 실패했습니다.');
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = clientFileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          // 다운로드 성공 시 실패 목록에서 제거
          setFailedDownloads((prev) => {
            const next = new Set(prev);
            next.delete(serverFileName);
            return next;
          });

          toast({
            title: '다운로드 완료',
            description: `${clientFileName} 파일이 다운로드되었습니다.`,
            status: 'success',
            duration: 3000,
            isClosable: true,
            position: 'top',
          });
        } catch (error) {
          console.error('[DownloadButton] File download failed:', error);
          // 다운로드 실패 시 실패 목록에 추가
          setFailedDownloads((prev) => {
            const next = new Set(prev);
            next.add(serverFileName);
            return next;
          });
          handleError(new Error('파일 다운로드에 실패했습니다.'));
        }
      },
      [downloadFileMutation, handleError, toast, state.fileStatuses]
    );

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

        console.log('[DownloadButton] Processing initial file statuses:', {
          files: result.files.map((f) => ({
            fileName: f.fileName,
            clientFileName: f.clientFileName,
          })),
          timestamp: new Date().toISOString(),
        });

        const initialFileStatuses = result.files.reduce(
          (acc, file) => {
            console.log('[DownloadButton] Processing file:', {
              fileName: file.fileName,
              clientFileName: file.clientFileName,
              existingStatus: acc[file.fileName],
              timestamp: new Date().toISOString(),
            });

            acc[file.fileName] = {
              fileName: file.fileName,
              clientFileName: file.clientFileName,
              downloadId: file.downloadId,
              // 첫 번째 파일만 generating, 나머지는 pending
              status: 'pending',
              progress: file.progress || 0,
              message: file.message || 'Waiting...',
              processedRows: file.processedRows || 0,
              totalRows: file.totalRows || 0,
              processingSpeed: file.processingSpeed || 0,
              estimatedTimeRemaining: file.estimatedTimeRemaining || 0,
              size: 0,
            };

            console.log('[DownloadButton] Updated file status:', {
              fileName: file.fileName,
              newStatus: acc[file.fileName],
              timestamp: new Date().toISOString(),
            });

            return acc;
          },
          {} as Record<string, FileStatus>
        );

        console.log('[DownloadButton] Final initial file statuses:', {
          statuses: Object.values(initialFileStatuses).map((f) => ({
            fileName: f.fileName,
            clientFileName: f.clientFileName,
            status: f.status,
          })),
          timestamp: new Date().toISOString(),
        });

        setState((prev) => {
          console.log('[DownloadButton] Updating state with initial files:', {
            prevFileStatuses: Object.values(prev.fileStatuses).map((f) => ({
              fileName: f.fileName,
              clientFileName: f.clientFileName,
              status: f.status,
            })),
            newFileStatuses: Object.values(initialFileStatuses).map((f) => ({
              fileName: f.fileName,
              clientFileName: f.clientFileName,
              status: f.status,
            })),
            timestamp: new Date().toISOString(),
          });

          return {
            ...prev,
            downloadId: result.downloadId,
            fileStatuses: initialFileStatuses,
            selectedFiles: [],
            status: 'generating',
            isOpen: true,
          };
        });

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

    const handleDownloadSelected = useCallback(async () => {
      const fileStatusEntries = Object.entries(state.fileStatuses);
      const promises = state.selectedFiles?.map(async (clientFileName) => {
        const fileStatus = fileStatusEntries.find(
          ([_, status]) => status.clientFileName === clientFileName
        )?.[1];

        console.log('[DownloadButton] Handling download selected:', {
          clientFileName,
          fileStatus,
          allFileStatuses: state.fileStatuses,
          timestamp: new Date().toISOString(),
        });

        if (fileStatus?.status === 'ready' && fileStatus.fileName) {
          try {
            const match = fileStatus.fileName.match(/_(\d+)\.csv$/);
            console.log('[DownloadButton] Extracted file info:', {
              serverFileName: fileStatus.fileName,
              match,
              matchGroups: match ? Array.from(match) : null,
              timestamp: new Date().toISOString(),
            });

            const index = match?.[1] ? parseInt(match[1], 10) - 1 : 0;
            const downloadId = fileStatus.fileName.replace(/_\d+\.csv$/, '');

            console.log('[DownloadButton] Extracted download info:', {
              serverFileName: fileStatus.fileName,
              downloadId,
              index,
              fileStatus,
              timestamp: new Date().toISOString(),
            });

            const serverFileName = getServerFileName(downloadId, index);
            const result = await downloadFileMutation.mutateAsync({
              fileName: serverFileName,
            });

            console.log('[DownloadButton] Download mutation result:', {
              requestedFileName: serverFileName,
              requestedDownloadId: downloadId,
              result,
              timestamp: new Date().toISOString(),
            });

            const response = await fetch(
              `/api/download?file=${serverFileName}`
            );
            if (!response.ok) {
              throw new Error('파일 다운로드에 실패했습니다.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileStatus.clientFileName || '';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // 다운로드 성공 시 실패 목록에서 제거하고 완료 목록에 추가
            setFailedDownloads((prev) => {
              const next = new Set(prev);
              next.delete(fileStatus.fileName);
              return next;
            });
            setCompletedDownloads((prev) => {
              const next = new Set(prev);
              next.add(fileStatus.fileName);
              return next;
            });
          } catch (error) {
            console.error('[DownloadButton] File download failed:', error);
            // 다운로드 실패 시 실패 목록에 추가
            if (fileStatus.fileName) {
              setFailedDownloads((prev) => {
                const next = new Set(prev);
                next.add(fileStatus.fileName);
                return next;
              });
            }
            handleError(new Error('파일 다운로드에 실패했습니다.'));
          }
        } else {
          console.warn('[DownloadButton] File not ready or missing fileName:', {
            clientFileName,
            fileStatus,
            timestamp: new Date().toISOString(),
          });
        }
      });

      if (promises) {
        await Promise.all(promises);
      }
    }, [
      state.selectedFiles,
      state.fileStatuses,
      downloadFileMutation,
      handleError,
      setFailedDownloads,
      setCompletedDownloads,
    ]);

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
          failedDownloads={failedDownloads}
        />
      </Box>
    );
  }
);

DownloadButton.displayName = 'DownloadButton';
