import { forwardRef, useCallback, useState } from 'react';
import { useRef } from 'react';

import {
  Box,
  Button,
  Checkbox,
  Flex,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
  useColorMode,
} from '@chakra-ui/react';
import {
  ColDef as GridColDef,
  GridReadyEvent,
  ICellRendererParams,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { AgGridReact } from 'ag-grid-react';
import { FaDownload } from 'react-icons/fa';

import { trpc } from '@/lib/trpc/client';
import { DownloadStatus } from '@/types/download';
import { MenuType } from '@/types/project';

import { DownloadProgress } from './components/DownloadProgress';
import { useDownloadState } from './hooks/useDownloadState';
import { useWebSocketConnection } from './hooks/useWebSocketConnection';
import { DownloadButtonProps, FileData, isProgressMessage } from './types';

interface StatusDisplay {
  text: string;
  color: string;
}

const statusDisplayMap = new Map([
  ['completed', { text: 'completed', color: 'green' }],
  ['downloading', { text: 'downloading', color: 'blue' }],
  ['failed', { text: 'failed', color: 'red' }],
  ['paused', { text: 'paused', color: 'orange' }],
  ['pending', { text: 'pending', color: 'gray' }],
] as const) as Map<DownloadStatus, StatusDisplay>;

const defaultStatusDisplay: StatusDisplay = { text: 'pending', color: 'gray' };

export const DownloadButton = forwardRef<HTMLDivElement, DownloadButtonProps>(
  (
    {
      searchId,
      totalRows,
      searchParams,
    }: {
      searchId: string;
      totalRows: number;
      searchParams: {
        menu: MenuType;
        timeFrom: string;
        timeTo: string;
        searchTerm: string;
      };
    },
    ref
  ) => {
    const { colorMode } = useColorMode();
    const gridTheme =
      colorMode === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark';
    const gridRef = useRef<AgGridReact>(null);
    const [activeDownloadId, setActiveDownloadId] = useState<string | null>(
      null
    );

    const downloadFile = trpc.download.downloadFile.useMutation({
      onError: (error) => {
        console.error('Failed to download file:', error);
      },
    });
    const cancelDownload = trpc.download.cancelDownload.useMutation();
    const cleanup = trpc.download.cleanup.useMutation();

    const {
      state: { downloadId, fileStatuses, selectedFiles, isOpen, totalProgress },
      updateFileStatus,
      handleFileSelection,
      handleError,
      handleModalClose,
      setState,
    } = useDownloadState({
      onCleanup: (id) => cleanup.mutateAsync({ downloadId: id }),
      onCancel: (id) => cancelDownload.mutate({ downloadId: id }),
    });

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

    const {
      connect,
      startDownload: startWebSocketDownload,
      isConnecting: isConnectingWs,
    } = useWebSocketConnection({
      downloadId: activeDownloadId || '',
      searchId,
      searchParams,
      totalRows,
      onMessage: (message) => {
        console.log('[DownloadButton] Received WebSocket message:', {
          type: message.type,
          downloadId: activeDownloadId,
          timestamp: new Date().toISOString(),
        });

        if (isProgressMessage(message)) {
          if (message.fileName) {
            updateFileStatus(message.fileName, {
              progress: message.progress || 0,
              status: message.status || 'downloading',
              message: message.message || '',
              processedRows: message.processedRows || 0,
              totalRows: message.totalRows || 0,
              size: message.size || 0,
              processingSpeed: message.processingSpeed || 0,
              estimatedTimeRemaining: message.estimatedTimeRemaining || 0,
              searchParams: message.searchParams,
            });
          }

          if (message.totalProgress) {
            setState((prev) => ({
              ...prev,
              totalProgress: message.totalProgress,
            }));
          }

          if (message.newFiles) {
            setState((prev) => ({
              ...prev,
              fileStatuses: {
                ...prev.fileStatuses,
                ...message.newFiles?.reduce(
                  (acc, file) => ({
                    ...acc,
                    [file.fileName]: {
                      ...file,
                      processingSpeed: 0,
                      estimatedTimeRemaining: 0,
                    },
                  }),
                  {}
                ),
              },
            }));
          }
        }
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

    const handleDownloadClick = useCallback(async () => {
      try {
        // 먼저 모달을 열고 연결 상태 초기화
        setState((prev) => ({
          ...prev,
          isOpen: true,
          isConnecting: true,
          isConnectionReady: false,
        }));

        // 다운로드 mutation 실행
        const result = await startDownloadMutation.mutateAsync({
          searchId,
          totalRows,
          searchParams,
        });

        if (!result.downloadId) {
          throw new Error('Download ID not received from server');
        }

        // downloadId를 먼저 설정하고 상태 업데이트를 기다림
        setActiveDownloadId(result.downloadId);

        // 상태 업데이트를 기다림
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

        // WebSocket 연결 시도
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
      if (!downloadId) {
        handleError(new Error('Download ID is missing'));
        return;
      }
      downloadFile.mutate({
        fileName,
        downloadId,
      });
    };

    const columnDefs: GridColDef<FileData>[] = [
      {
        headerName: '',
        field: 'fileName',
        width: 50,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        cellRenderer: (params: ICellRendererParams<FileData>) => (
          <Checkbox
            checked={selectedFiles.includes(params.data?.fileName || '')}
            onChange={(event) =>
              handleFileSelection(
                params.data?.fileName || '',
                event.target.checked
              )
            }
          />
        ),
      },
      {
        field: 'fileName',
        headerName: 'File Name',
        width: 400,
      },
      {
        field: 'timeRange',
        headerName: 'Time Range',
        width: 200,
      },
      {
        field: 'size',
        headerName: 'Size',
        width: 100,
        valueFormatter: (params) => `${(params.value / 1024).toFixed(2)} KB`,
      },
      {
        field: 'lastModified',
        headerName: 'Last Modified',
        width: 200,
        valueFormatter: (params) => new Date(params.value).toLocaleString(),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        cellRenderer: (params: ICellRendererParams<FileData>) => {
          const status = params.value as DownloadStatus;
          const displayInfo =
            statusDisplayMap.get(status) || defaultStatusDisplay;

          return (
            <Flex height="40px" alignItems="center">
              <Box
                px={2}
                borderRadius="md"
                bg={`${displayInfo.color}.100`}
                color={`${displayInfo.color}.700`}
                fontSize="sm"
                fontWeight="medium"
                textAlign="center"
                height="24px"
                width="120px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {displayInfo.text}
              </Box>
            </Flex>
          );
        },
      },
      {
        field: 'progress',
        headerName: 'Progress',
        width: 320,
        cellRenderer: (params: ICellRendererParams<FileData>) => {
          const data = params.data;
          if (!data) return null;

          return (
            <Flex width="280px" alignItems="center">
              <DownloadProgress
                progress={data.progress}
                status={data.status}
                processedRows={data.processedRows}
                totalRows={data.totalRows}
                processingSpeed={data.processingSpeed}
                estimatedTimeRemaining={data.estimatedTimeRemaining}
                message={data.message}
                size="sm"
              />
            </Flex>
          );
        },
      },
      {
        headerName: 'Actions',
        cellRenderer: (params: ICellRendererParams<FileData>) => {
          if (!params.data) return null;
          const { fileName, status } = params.data;

          return (
            <Flex alignItems="center" height="40px">
              <IconButton
                aria-label="Download"
                icon={<FaDownload />}
                size="sm"
                colorScheme="blue"
                variant="ghost"
                isDisabled={status !== 'completed'}
                onClick={() => handleFileDownload(fileName)}
              />
            </Flex>
          );
        },
      },
    ];

    const rowData: FileData[] = Object.entries(fileStatuses).length
      ? Object.entries(fileStatuses).map(([fileName, status]) => ({
          fileName,
          size: status.size || 0,
          lastModified: new Date().toISOString(),
          selected: selectedFiles.includes(fileName),
          status: status.status || 'pending',
          progress: status.progress || 0,
          message: status.message,
          processedRows: status.processedRows || 0,
          totalRows: status.totalRows || 0,
          timeRange: status.searchParams
            ? `${status.searchParams.timeFrom} ~ ${status.searchParams.timeTo}`
            : '',
          searchParams: {
            timeFrom: status.searchParams?.timeFrom || searchParams.timeFrom,
            timeTo: status.searchParams?.timeTo || searchParams.timeTo,
            menu: searchParams.menu,
            searchTerm: searchParams.searchTerm,
          },
        }))
      : [
          {
            fileName: `TRAFFIC_${new Date().toISOString().slice(0, 10)}_1of1.csv`,
            size: 0,
            lastModified: new Date().toISOString(),
            selected: false,
            status: 'pending',
            progress: 0,
            message: 'Initializing download...',
            processedRows: 0,
            totalRows,
            timeRange: `${searchParams.timeFrom} ~ ${searchParams.timeTo}`,
            searchParams,
          },
        ];

    const onGridReady = (params: GridReadyEvent<FileData>) => {
      params.api.sizeColumnsToFit();
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
          isLoading={isConnectingWs}
          loadingText="Connecting..."
          disabled={isConnectingWs}
          width="120px"
          className="download-button"
        >
          Download
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={handleModalClose}
          size="xl"
          closeOnOverlayClick={false}
        >
          <ModalOverlay />
          <ModalContent maxW="80vw">
            <ModalHeader>Download Progress</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" mb={2}>
                    Overall Progress
                  </Text>
                  <DownloadProgress
                    progress={totalProgress?.progress || 0}
                    status={totalProgress?.status || 'pending'}
                    processedRows={totalProgress?.processedRows || 0}
                    totalRows={totalProgress?.totalRows || 0}
                    processingSpeed={totalProgress?.processingSpeed || 0}
                    estimatedTimeRemaining={
                      totalProgress?.estimatedTimeRemaining || 0
                    }
                    message={totalProgress?.message || 'Preparing files...'}
                    size="md"
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    {
                      Object.values(fileStatuses).filter(
                        (f) => f.status === 'completed'
                      ).length
                    }{' '}
                    / {Object.keys(fileStatuses).length} files completed
                  </Text>
                </Box>
                <Box
                  height="800px"
                  className={`download-grid ${gridTheme}`}
                  data-testid="download-grid"
                  overflow="hidden"
                >
                  <AgGridReact<FileData>
                    ref={gridRef}
                    columnDefs={columnDefs}
                    rowData={rowData}
                    onGridReady={onGridReady}
                    rowSelection="multiple"
                    suppressRowClickSelection
                    domLayout="autoHeight"
                    suppressPropertyNamesCheck
                  />
                </Box>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    );
  }
);

DownloadButton.displayName = 'DownloadButton';
