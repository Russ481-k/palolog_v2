import { forwardRef, useEffect, useRef, useState } from 'react';

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

import { env } from '@/env.mjs';
import { trpc } from '@/lib/trpc/client';
import { DownloadStatus } from '@/types/download';

import { DownloadProgress } from './components/DownloadProgress';
import {
  DownloadButtonProps,
  FileData,
  FileStatuses,
  isProgressMessage,
} from './types';

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

interface OverallProgress {
  totalFiles: number;
  completedFiles: number;
  totalRows: number;
  processedRows: number;
  percentage: number;
  status: DownloadStatus;
}

export const DownloadButton = forwardRef<HTMLDivElement, DownloadButtonProps>(
  (
    {
      searchId: totalRows,
      searchParams,
    }: {
      searchId: string;
      searchParams: {
        menu: 'TRAFFIC';
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
    const [isOpen, setIsOpen] = useState(false);
    const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
    const [downloadId, setDownloadId] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [fileStatuses, setFileStatuses] = useState<FileStatuses>({});
    const [isConnecting, setIsConnecting] = useState(false);
    const gridRef = useRef<AgGridReact>(null);
    const isConnectingRef = useRef<boolean>(false);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [, setOverallProgress] = useState<OverallProgress>({
      totalFiles: 0,
      completedFiles: 0,
      totalRows: Number(totalRows),
      processedRows: 0,
      percentage: 0,
      status: 'pending',
    });
    const [, setDownloadProgress] = useState<{
      progress: number;
      status: DownloadStatus;
      message: string;
      processedRows: number;
      totalRows: number;
      size: number;
      fileName: string;
      searchParams?: {
        timeFrom: string;
        timeTo: string;
      };
    }>({
      progress: 0,
      status: 'pending',
      message: '',
      processedRows: 0,
      totalRows: 0,
      size: 0,
      fileName: '',
    });

    const downloadFile = trpc.download.downloadFile.useMutation({
      onError: (error) => {
        console.error('Failed to download file:', error);
      },
    });
    const cancelDownload = trpc.download.cancelDownload.useMutation();
    const cleanup = trpc.download.cleanup.useMutation();

    const handleConnectionError = (error: Error) => {
      console.error('[Error] Connection error occurred:', {
        message: error.message,
        stack: error.stack,
        downloadId: downloadId || 'not_set',
      });

      setIsConnecting(false);
      isConnectingRef.current = false;

      if (retryTimeoutRef.current) {
        console.log('[Cleanup] Clearing retry timeout');
        clearTimeout(retryTimeoutRef.current);
      }

      if (webSocket) {
        console.log('[Cleanup] Closing existing WebSocket connection');
        webSocket.close();
        setWebSocket(null);
      }

      if (downloadId) {
        console.log(
          '[Cleanup] Initiating download cleanup for ID:',
          downloadId
        );
        cleanupDownload(downloadId);
        setDownloadId('');
      }

      setFileStatuses((prev) => ({
        ...prev,
        error: {
          fileName: 'error',
          progress: 0,
          status: 'failed',
          message: error.message || 'Connection failed',
          processedRows: 0,
          totalRows: 0,
          size: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
        },
      }));
    };

    const cleanupDownload = async (id: string) => {
      try {
        console.log('[Cleanup] Starting download cleanup process for ID:', id);
        await cleanup.mutateAsync({ downloadId: id });
        console.log('[Cleanup] Successfully cleaned up download:', id);
      } catch (error) {
        console.error('[Cleanup] Failed to cleanup download:', {
          downloadId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const connectWebSocket = async (id: string) => {
      if (isConnectingRef.current) {
        console.log('[WebSocket] Connection already in progress, skipping');
        return null;
      }

      const MAX_RETRIES = 3;
      const BASE_RETRY_DELAY = 1000;
      const TIMEOUT = 5000;
      let retries = 0;
      isConnectingRef.current = true;

      const connect = () => {
        return new Promise<WebSocket>((resolve, reject) => {
          let isResolved = false;
          const protocol =
            window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.hostname}:${env.NEXT_PUBLIC_ENV_NAME === 'LOCAL' ? 3001 : 8001}/api/ws/download`;

          console.log('[WebSocket] Attempting connection:', {
            url: wsUrl,
            protocol,
            hostname: window.location.hostname,
            downloadId: id,
            attempt: retries + 1,
            maxRetries: MAX_RETRIES,
          });

          const ws = new WebSocket(wsUrl);
          let connectionAcknowledged = false;

          const timeoutId = setTimeout(() => {
            if (!isResolved) {
              isResolved = true;
              console.error('[WebSocket] Connection timed out:', {
                timeout: TIMEOUT,
                attempt: retries + 1,
              });
              cleanup();
              ws.close();
              reject(new Error(`Connection timeout after ${TIMEOUT}ms`));
            }
          }, TIMEOUT);

          const cleanup = () => {
            console.log('[WebSocket] Cleaning up event listeners');
            clearTimeout(timeoutId);
            ws.removeEventListener('open', handleOpen);
            ws.removeEventListener('message', handleMessage);
            ws.removeEventListener('error', handleError);
            ws.removeEventListener('close', handleClose);
          };

          const handleOpen = () => {
            console.log('[WebSocket] Connection opened, sending subscription');
            try {
              const subscriptionMessage = {
                downloadId: id,
                type: 'subscribe',
                clientId: `client-${Date.now()}`,
                timestamp: new Date().toISOString(),
              };
              console.log(
                '[WebSocket] Sending subscription:',
                subscriptionMessage
              );
              ws.send(JSON.stringify(subscriptionMessage));
            } catch (error) {
              console.error('[WebSocket] Failed to send subscription:', error);
              cleanup();
              ws.close();
              reject(error);
            }
          };

          const handleMessage = (event: MessageEvent) => {
            try {
              const message = JSON.parse(event.data);
              console.log('[WebSocket] Message received:', message);

              if (isProgressMessage(message)) {
                // Clear initializing status when actual download starts
                setFileStatuses((prev) => {
                  const newStatuses = { ...prev };
                  delete newStatuses['initializing'];

                  // Only update the status for the current download
                  if (message.fileName) {
                    newStatuses[message.fileName] = {
                      fileName: message.fileName,
                      progress: message.progress || 0,
                      status: message.status || 'downloading',
                      message: message.message || '',
                      processedRows: message.processedRows || 0,
                      totalRows: message.totalRows || 0,
                      size: message.size || 0,
                      processingSpeed: message.processingSpeed || 0,
                      estimatedTimeRemaining:
                        message.estimatedTimeRemaining || 0,
                      searchParams: message.searchParams,
                    };
                  }

                  return newStatuses;
                });

                // Update download progress
                setDownloadProgress({
                  progress: message.progress || 0,
                  status: message.status || 'downloading',
                  message: message.message || '',
                  processedRows: message.processedRows || 0,
                  totalRows: message.totalRows || 0,
                  size: message.size || 0,
                  fileName: message.fileName || '',
                  searchParams: message.searchParams,
                });
              }
            } catch (error) {
              console.error('[WebSocket] Failed to parse message:', error);
            }
          };

          const handleError = (event: Event) => {
            console.error('[WebSocket] Connection error:', {
              event,
              timestamp: new Date().toISOString(),
              wsState: ws.readyState,
            });
            cleanup();
            if (!isResolved) {
              isResolved = true;
              reject(new Error('WebSocket connection failed'));
            }
          };

          const handleClose = (event: CloseEvent) => {
            console.log('[WebSocket] Connection closed:', {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
              acknowledged: connectionAcknowledged,
              timestamp: new Date().toISOString(),
            });
            cleanup();

            if (!connectionAcknowledged && event.code === 1006) {
              console.log('[WebSocket] Abnormal closure, attempting retry');
              if (retries < MAX_RETRIES && isConnectingRef.current) {
                retries++;
                const retryDelay =
                  BASE_RETRY_DELAY * Math.pow(1.5, retries - 1);
                console.log('[WebSocket] Scheduling retry:', {
                  attempt: retries,
                  maxRetries: MAX_RETRIES,
                  delay: retryDelay,
                  timestamp: new Date().toISOString(),
                });

                if (retryTimeoutRef.current) {
                  clearTimeout(retryTimeoutRef.current);
                }

                retryTimeoutRef.current = setTimeout(() => {
                  console.log('[WebSocket] Attempting retry connection');
                  connect()
                    .then(resolve)
                    .catch((error) => {
                      if (retries === MAX_RETRIES) {
                        console.error(
                          '[WebSocket] Max retries reached:',
                          error
                        );
                        isConnectingRef.current = false;
                        reject(error);
                      }
                    });
                }, retryDelay);
              } else if (!isResolved) {
                console.error('[WebSocket] Connection permanently failed');
                isResolved = true;
                isConnectingRef.current = false;
                reject(new Error(`WebSocket connection closed: ${event.code}`));
              }
            }
          };

          ws.onopen = () => {
            console.log('[WebSocket] Connection opened');
            // Send initial download request
            ws.send(
              JSON.stringify({
                type: 'start_download',
                downloadId: id,
                searchParams,
                totalRows,
              })
            );
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'connected' && !connectionAcknowledged) {
                connectionAcknowledged = true;
                console.log('[WebSocket] Connection acknowledged');
                if (!isResolved) {
                  isResolved = true;
                  clearTimeout(timeoutId);
                  resolve(ws);
                }
              }
            } catch (error) {
              console.error('[WebSocket] Failed to parse message:', error);
            }
          };

          ws.addEventListener('open', handleOpen);
          ws.addEventListener('message', handleMessage);
          ws.addEventListener('error', handleError);
          ws.addEventListener('close', handleClose);
        });
      };

      try {
        console.log('[WebSocket] Starting connection process');
        const ws = await connect();
        if (ws) {
          console.log('[WebSocket] Connection successfully established');
          setWebSocket(ws);
          return ws;
        }
        return null;
      } catch (error) {
        console.error('[WebSocket] Connection process failed:', error);
        isConnectingRef.current = false;
        throw error;
      }
    };

    const handleDownloadClick = async () => {
      try {
        const searchId = `download-${Date.now()}`;
        console.log('[Download] Initializing download process', {
          searchId,
          searchParams,
          totalRows,
        });

        const result = await startDownload.mutateAsync({
          searchId,
          searchParams,
          totalRows: Number(totalRows),
        });

        console.log('[Download] Server response received:', result);

        if (!result.downloadId) {
          throw new Error('Download ID not received from server');
        }
      } catch (error) {
        console.error('[Download] Failed to initialize download:', error);
        if (error instanceof Error) {
          handleConnectionError(error);
        } else {
          handleConnectionError(
            new Error('Unknown error occurred during download initialization')
          );
        }
      }
    };

    const startDownload = trpc.download.startDownload.useMutation({
      onMutate: () => {
        console.log('[Download] Starting mutation process');
        setIsConnecting(true);
        setFileStatuses({});
        setSelectedFiles([]);
        setIsOpen(true);
        setFileStatuses((prev) => ({
          ...prev,
          initializing: {
            fileName: 'initializing',
            progress: 0,
            status: 'pending',
            message: 'Preparing download...',
            processedRows: 0,
            totalRows: 0,
            size: 0,
            processingSpeed: 0,
            estimatedTimeRemaining: 0,
          },
        }));
      },
      onSuccess: async (data) => {
        console.log('[Download] Mutation successful, received data:', data);
        if (!data.downloadId) {
          throw new Error('Download ID not received from mutation');
        }
        setDownloadId(data.downloadId);
        try {
          console.log(
            '[Download] Attempting to establish WebSocket connection'
          );
          const ws = await connectWebSocket(data.downloadId);
          if (!ws) {
            throw new Error('WebSocket connection failed to establish');
          }
          console.log(
            '[Download] WebSocket connection established successfully'
          );
        } catch (error) {
          console.error('[Download] WebSocket connection failed:', error);
          if (error instanceof Error) {
            handleConnectionError(error);
          } else {
            handleConnectionError(
              new Error('Unknown error during WebSocket connection')
            );
          }
        }
      },
      onError: (error) => {
        console.error('[Download] Mutation failed:', error);
        handleConnectionError(
          error instanceof Error ? error : new Error(String(error))
        );
      },
      onSettled: () => {
        console.log('[Download] Mutation settled');
        setIsConnecting(false);
        setFileStatuses((prev) => {
          const { ...rest } = prev;
          return Object.keys(rest).length > 0 ? rest : prev;
        });
      },
    });

    const handleFileDownload = (fileName: string) => {
      downloadFile.mutate({
        fileName,
        searchId: totalRows,
        searchParams: { ...searchParams, menu: 'TRAFFIC' as const },
      });
    };

    const handleCancel = () => {
      if (downloadId) {
        cancelDownload.mutate({ downloadId });
      }
    };

    const handleModalClose = async () => {
      if (downloadId) {
        console.log('[Modal] Closing modal with active download:', downloadId);
        try {
          console.log('[Cleanup] Starting cleanup process for modal close');
          await cleanup.mutateAsync({ downloadId });

          if (webSocket) {
            console.log('[WebSocket] Closing connection due to modal close');
            webSocket.close();
            setWebSocket(null);
          }

          setDownloadId('');
          setFileStatuses({});
          setSelectedFiles([]);
          console.log('[Modal] Cleanup completed successfully');
          handleCancel();
        } catch (error) {
          console.error('[Modal] Failed to cleanup on close:', error);
        } finally {
          setIsOpen(false);
        }
      } else {
        console.log('[Modal] Closing modal without active download');
        setIsOpen(false);
      }
    };

    useEffect(() => {
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        if (webSocket) {
          webSocket.close();
          setWebSocket(null);
        }
        if (downloadId) {
          cleanupDownload(downloadId);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [downloadId]);

    useEffect(() => {
      const allFiles = Object.values(fileStatuses);
      const completed = allFiles.filter((f) => f.status === 'completed').length;
      const totalProcessed = allFiles.reduce(
        (sum, f) => sum + (f.processedRows || 0),
        0
      );

      setOverallProgress({
        totalFiles: allFiles.length || 1,
        completedFiles: completed,
        totalRows: Number(totalRows),
        processedRows: totalProcessed,
        percentage:
          Number(totalRows) > 0
            ? (totalProcessed / Number(totalRows)) * 100
            : 0,
        status: completed === allFiles.length ? 'completed' : 'downloading',
      });
    }, [fileStatuses, totalRows]);

    const handleFileSelection = (fileName: string, checked: boolean) => {
      setSelectedFiles((prev) =>
        checked ? [...prev, fileName] : prev.filter((name) => name !== fileName)
      );
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

    const activeDownloads = Object.entries(fileStatuses).filter(
      ([_, status]) => status.status !== 'completed'
    );
    const completedFiles = Object.values(fileStatuses).filter(
      (status) => status.status === 'completed'
    );

    const rowData: FileData[] = Object.entries(fileStatuses).map(
      ([fileName, status]) => ({
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
        searchParams: status.searchParams,
      })
    );

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
            isConnecting ? (
              <Spinner size="xs" />
            ) : (
              <FaDownload width="12px" height="12px" />
            )
          }
          onClick={handleDownloadClick}
          aria-label="Download"
          isLoading={isConnecting}
          loadingText="Connecting..."
          disabled={isConnecting}
          width="120px"
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
                  <Text fontSize="sm" color="gray.600">
                    {activeDownloads.length} / {completedFiles.length} /{' '}
                    {Math.ceil(
                      Number(totalRows) /
                        Number(env.NEXT_PUBLIC_DOWNLOAD_CHUNK_SIZE)
                    )}
                    files completed
                  </Text>
                </Box>
                <Box
                  height="800px"
                  className={gridTheme}
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
