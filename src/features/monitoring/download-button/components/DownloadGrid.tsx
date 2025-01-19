import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Box,
  Checkbox,
  Flex,
  IconButton,
  Skeleton,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorMode,
} from '@chakra-ui/react';
import { FaCheck, FaDownload } from 'react-icons/fa';

import { FileData } from '../types';
import { DownloadProgress } from './DownloadProgress';
import { DownloadStatus } from './DownloadStatus';

interface DownloadGridProps {
  rowData: FileData[];
  selectedFiles: string[];
  onFileSelection: (fileName: string, selected: boolean) => void;
  onFileDownload: (serverFileName: string, clientFileName: string) => void;
  gridTheme: string;
  isLoading?: boolean;
}

export const DownloadGrid = memo(
  ({
    rowData,
    selectedFiles,
    onFileSelection,
    onFileDownload,
    isLoading = false,
  }: DownloadGridProps) => {
    const { colorMode } = useColorMode();
    const [, setUpdatedRows] = useState<Set<string>>(new Set());
    const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(
      new Set()
    );
    const [completedDownloads, setCompletedDownloads] = useState<Set<string>>(
      new Set()
    );

    // Track row updates with previous values
    const prevRowDataRef = useRef(rowData);
    useEffect(() => {
      const newUpdatedRows = new Set<string>();

      rowData?.forEach((row) => {
        const prevRow = prevRowDataRef.current.find(
          (r) => r.fileName === row.fileName
        );
        if (
          prevRow &&
          (prevRow.status !== row.status ||
            prevRow.progress !== row.progress ||
            prevRow.processedRows !== row.processedRows)
        ) {
          console.log('[DownloadGrid] Row updated:', {
            clientFileName: row.fileName,
            prevStatus: prevRow.status,
            newStatus: row.status,
            prevProgress: prevRow.progress,
            newProgress: row.progress,
            prevProcessedRows: prevRow.processedRows,
            newProcessedRows: row.processedRows,
          });
          newUpdatedRows.add(row.fileName);
        }
      });

      if (newUpdatedRows.size > 0) {
        setUpdatedRows(newUpdatedRows);
        const timeoutId = setTimeout(() => {
          setUpdatedRows(new Set());
        }, 1000);
        return () => clearTimeout(timeoutId);
      }

      prevRowDataRef.current = rowData;
    }, [rowData]);

    // Calculate selection states
    const allSelected = useMemo(() => {
      return (
        rowData.length > 0 &&
        rowData.every((row) => selectedFiles.includes(row.fileName))
      );
    }, [rowData, selectedFiles]);

    const someSelected = useMemo(() => {
      return (
        !allSelected &&
        rowData.some((row) => selectedFiles.includes(row.fileName))
      );
    }, [allSelected, rowData, selectedFiles]);

    // ready 상태인 파일이 있는지 확인
    const hasReadyFiles = useMemo(() => {
      return rowData.some(
        (row) =>
          (row.status === 'ready' || row.status === 'completed') &&
          !downloadingFiles.has(row.fileName) &&
          !completedDownloads.has(row.fileName)
      );
    }, [rowData, downloadingFiles, completedDownloads]);

    // Memoize styles
    const styles = useMemo(
      () => ({
        cell: {
          fontSize: '12px',
          padding: '8px',
          lineHeight: '16px',
          whiteSpace: 'nowrap' as const,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        header: {
          textAlign: 'left' as const,
          fontWeight: 'bold',
          backgroundColor: colorMode === 'dark' ? 'gray.800' : 'gray.50',
          borderColor: colorMode === 'dark' ? 'gray.700' : 'gray.200',
          position: 'sticky' as const,
          top: 0,
          zIndex: 1,
        },
      }),
      [colorMode]
    );

    // Handle select all with proper type checking
    const handleSelectAll = useCallback(
      (checked: boolean) => {
        if (checked) {
          // ready 상태인 파일만 선택
          rowData?.forEach((row) => {
            if (
              (row.status === 'ready' || row.status === 'completed') &&
              !downloadingFiles.has(row.fileName) &&
              !completedDownloads.has(row.fileName) &&
              !selectedFiles.includes(row.fileName)
            ) {
              onFileSelection(row.fileName, true);
            }
          });
        } else {
          selectedFiles?.forEach((fileName) => {
            onFileSelection(fileName, false);
          });
        }
      },
      [
        rowData,
        selectedFiles,
        onFileSelection,
        downloadingFiles,
        completedDownloads,
      ]
    );

    const handleFileDownload = useCallback(
      async (serverFileName: string, clientFileName: string) => {
        try {
          setDownloadingFiles((prev) => new Set(prev).add(clientFileName));
          await onFileDownload(serverFileName, clientFileName);
          setCompletedDownloads((prev) => new Set(prev).add(clientFileName));
        } finally {
          setDownloadingFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(clientFileName);
            return newSet;
          });
        }
      },
      [onFileDownload]
    );

    return (
      <Box
        height="72vh"
        overflow="auto"
        borderWidth="1px"
        borderRadius="md"
        borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
        data-testid="download-grid"
        sx={{
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: colorMode === 'dark' ? 'gray.800' : 'gray.100',
          },
          '&::-webkit-scrollbar-thumb': {
            background: colorMode === 'dark' ? 'gray.600' : 'gray.400',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'gray.500',
          },
          '&::-webkit-scrollbar-corner': {
            background: colorMode === 'dark' ? 'gray.800' : 'gray.100',
          },
        }}
      >
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th {...styles.header} width="50px">
                <Checkbox
                  isChecked={allSelected}
                  isIndeterminate={someSelected}
                  isDisabled={!hasReadyFiles}
                  borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </Th>
              <Th {...styles.header} width="300px">
                File Name
              </Th>
              <Th {...styles.header} width="300px">
                Time Range
              </Th>
              <Th {...styles.header} width="120px" isNumeric>
                Size
              </Th>
              <Th {...styles.header} width="140px">
                Status
              </Th>
              <Th {...styles.header} minWidth="500px">
                Progress
              </Th>
              <Th {...styles.header} width="100px">
                Download
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading
              ? [...Array(30)].map((_, index) => (
                  <Tr
                    key={index}
                    transition="all 0.3s ease-in-out"
                    _hover={{
                      backgroundColor:
                        colorMode === 'dark' ? 'gray.900' : 'gray.50',
                    }}
                  >
                    <Td {...styles.cell}>
                      <Flex
                        gap={3}
                        alignItems="center"
                        justifyContent="center"
                        w="100%"
                        height={7}
                      >
                        <Skeleton height={4} width={4} />
                      </Flex>
                    </Td>
                    <Td {...styles.cell}>
                      <Skeleton height={3} width="240px" />
                    </Td>
                    <Td {...styles.cell}>
                      <Skeleton height={3} width="240px" />
                    </Td>
                    <Td {...styles.cell}>
                      <Skeleton height={3} width="80px" />
                    </Td>
                    <Td {...styles.cell}>
                      <Skeleton height={4} width="100px" borderRadius="5px" />
                    </Td>
                    <Td {...styles.cell}>
                      <Skeleton height={3} width="460px" />
                    </Td>
                    <Td {...styles.cell}>
                      <Flex
                        width="100px"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Skeleton height={7} width={7} />
                      </Flex>
                    </Td>
                  </Tr>
                ))
              : rowData.map((row, index) => (
                  <Tr
                    key={`${row.fileName}_${index}`}
                    _hover={{
                      backgroundColor:
                        colorMode === 'dark' ? 'gray.700' : 'gray.50',
                    }}
                  >
                    <Td {...styles.cell}>
                      <Checkbox
                        isChecked={selectedFiles.includes(row.fileName)}
                        isDisabled={
                          (row.status !== 'ready' &&
                            row.status !== 'completed') ||
                          downloadingFiles.has(row.fileName) ||
                          completedDownloads.has(row.fileName)
                        }
                        borderColor={
                          colorMode === 'dark' ? 'gray.700' : 'gray.200'
                        }
                        padding={2}
                        onChange={(e) =>
                          onFileSelection(row.fileName, e.target.checked)
                        }
                      />
                    </Td>
                    <Td {...styles.cell}>
                      <Flex width="240px" alignItems="center">
                        {row.fileName}
                      </Flex>
                    </Td>
                    <Td {...styles.cell}>
                      <Flex width="240px" alignItems="center">
                        {row.timeRange}
                      </Flex>
                    </Td>
                    <Td {...styles.cell} isNumeric>
                      {(row.size / 1024 / 1024).toFixed(2)} MB
                    </Td>
                    <Td {...styles.cell}>
                      <DownloadStatus status={row.status} />
                    </Td>
                    <Td {...styles.cell}>
                      <Flex flex={1} alignItems="center">
                        <DownloadProgress
                          progress={row.progress}
                          status={row.status}
                          processedRows={row.processedRows}
                          totalRows={row.totalRows}
                          processingSpeed={row.processingSpeed}
                          estimatedTimeRemaining={row.estimatedTimeRemaining}
                          message={row.message}
                          size="sm"
                        />
                      </Flex>
                    </Td>
                    <Td {...styles.cell}>
                      <Flex alignItems="center" justifyContent="center">
                        <IconButton
                          aria-label="Download"
                          icon={
                            downloadingFiles.has(row.fileName) ? (
                              <Spinner size="sm" />
                            ) : completedDownloads.has(row.fileName) ? (
                              <FaCheck color="teal.400" />
                            ) : (
                              <FaDownload color="teal.400" />
                            )
                          }
                          size="sm"
                          colorScheme="green"
                          variant="ghost"
                          isDisabled={
                            (row.status !== 'ready' &&
                              row.status !== 'completed') ||
                            downloadingFiles.has(row.fileName) ||
                            completedDownloads.has(row.fileName)
                          }
                          onClick={() =>
                            handleFileDownload(row.serverFileName, row.fileName)
                          }
                          title={
                            completedDownloads.has(row.fileName)
                              ? 'Download completed'
                              : 'Download file'
                          }
                        />
                      </Flex>
                    </Td>
                  </Tr>
                ))}
          </Tbody>
        </Table>
      </Box>
    );
  }
);

DownloadGrid.displayName = 'DownloadGrid';
