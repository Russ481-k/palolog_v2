import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Box,
  Checkbox,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorMode,
} from '@chakra-ui/react';
import dayjs from 'dayjs';
import { FaDownload } from 'react-icons/fa';

import { FileData } from '../types';
import { DownloadProgress } from './DownloadProgress';
import { DownloadStatus } from './DownloadStatus';

interface DownloadGridProps {
  rowData: FileData[];
  selectedFiles: string[];
  onFileSelection: (fileName: string, selected: boolean) => void;
  onFileDownload: (fileName: string) => void;
  gridTheme: string;
}

export const DownloadGrid = memo(
  ({
    rowData,
    selectedFiles,
    onFileSelection,
    onFileDownload,
  }: DownloadGridProps) => {
    const { colorMode } = useColorMode();
    const [selectAll, setSelectAll] = useState(false);
    const [updatedRows, setUpdatedRows] = useState<Set<string>>(new Set());

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
            fileName: row.fileName,
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
        setSelectAll(checked);
        if (checked) {
          rowData?.forEach((row) => {
            if (!selectedFiles.includes(row.fileName)) {
              onFileSelection(row.fileName, true);
            }
          });
        } else {
          selectedFiles?.forEach((fileName) => {
            onFileSelection(fileName, false);
          });
        }
      },
      [rowData, selectedFiles, onFileSelection]
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
          '.highlight-update': {
            transition: 'background-color 0.3s ease',
            backgroundColor: colorMode === 'dark' ? 'blue.900' : 'blue.50',
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
                  borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </Th>
              <Th {...styles.header} minWidth="260px">
                File Name
              </Th>
              <Th {...styles.header} width="280px">
                Time Range
              </Th>
              <Th {...styles.header} width="120px" isNumeric>
                Size
              </Th>
              <Th {...styles.header} width="200px">
                Last Modified
              </Th>
              <Th {...styles.header} width="140px">
                Status
              </Th>
              <Th {...styles.header} minWidth="220px">
                Progress
              </Th>
              <Th {...styles.header} width="100px">
                Download
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {rowData.map((row) => (
              <Tr
                key={row.fileName}
                className={
                  updatedRows.has(row.fileName) ? 'highlight-update' : ''
                }
                _hover={{
                  backgroundColor:
                    colorMode === 'dark' ? 'gray.700' : 'gray.50',
                }}
              >
                <Td {...styles.cell}>
                  <Checkbox
                    isChecked={selectedFiles.includes(row.fileName)}
                    borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                    padding={2}
                    onChange={(e) =>
                      onFileSelection(row.fileName, e.target.checked)
                    }
                  />
                </Td>
                <Td {...styles.cell}>{row.fileName}</Td>
                <Td {...styles.cell}>{row.timeRange}</Td>
                <Td {...styles.cell} isNumeric>
                  {(row.size / 1024).toFixed(2)} KB
                </Td>
                <Td {...styles.cell}>
                  {dayjs(row.lastModified).format('YYYY-MM-DD HH:mm:ss')}
                </Td>
                <Td {...styles.cell}>
                  <DownloadStatus status={row.status} />
                </Td>
                <Td {...styles.cell}>
                  <Flex width="580px" alignItems="center">
                    <DownloadProgress
                      progress={row.progress}
                      status={row.status}
                      processedRows={row.processedRows}
                      totalRows={row.totalRows}
                      processingSpeed={row.processingSpeed || 0}
                      estimatedTimeRemaining={row.estimatedTimeRemaining || 0}
                      message={row.message || ''}
                      size="sm"
                    />
                  </Flex>
                </Td>
                <Td {...styles.cell}>
                  <Flex alignItems="center" justifyContent="center">
                    <IconButton
                      aria-label="Download"
                      icon={<FaDownload />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      isDisabled={
                        row.status !== 'ready' && row.status !== 'completed'
                      }
                      onClick={() => onFileDownload(row.fileName)}
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
