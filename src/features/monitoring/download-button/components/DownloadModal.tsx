import { useCallback, useEffect, useMemo } from 'react';

import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';

import type { DownloadStatus } from '@/types/download';

import type { FileData, FileStatuses } from '../types';
import { DownloadGrid } from './DownloadGrid';
import { DownloadProgress } from './DownloadProgress';
import { DownloadStatus as DownloadStatusComponent } from './DownloadStatus';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalProgress:
    | {
        progress: number;
        status: DownloadStatus;
        processedRows: number;
        totalRows: number;
        processingSpeed: number;
        estimatedTimeRemaining: number;
        message: string;
      }
    | null
    | undefined;
  fileStatuses: FileStatuses;
  selectedFiles: string[];
  onFileSelection: (fileName: string, selected: boolean) => void;
  onFileDownload: (fileName: string) => void;
  onDownloadSelected: () => void;
  gridTheme: string;
}

interface GridRowData {
  id: string;
  fileName: string;
  status: DownloadStatus;
  progress: number;
  processedRows: number;
  totalRows: number;
  message: string;
  selected: boolean;
}

export const DownloadModal = ({
  isOpen,
  onClose,
  totalProgress,
  fileStatuses,
  selectedFiles,
  onFileSelection,
  onFileDownload,
  onDownloadSelected,
  gridTheme,
}: DownloadModalProps) => {
  // Track fileStatuses changes
  useEffect(() => {
    Object.entries(fileStatuses)?.forEach(([downloadId, status]) => {
      console.log('[DownloadModal] File status update:', {
        downloadId,
        clientFileName: status.clientFileName,
        status: status.status,
        progress: status.progress,
        message: status.message,
        canDownload: status.status === 'ready' || status.status === 'completed',
      });
    });
  }, [fileStatuses]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    // 모달이 닫힐 때 cleanup 실행
    console.log('[DownloadModal] Modal closing, cleaning up...');
    onClose();
  }, [onClose]);

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isOpen) {
        event.preventDefault();
        event.returnValue = '';
        handleModalClose();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, handleModalClose]);

  // Memoize rowData to prevent unnecessary re-renders
  const rowData: FileData[] = useMemo(() => {
    return Object.entries(fileStatuses).map(([name, status]) => ({
      downloadId: status.downloadId,
      clientFileName: status.clientFileName || '',
      lastModified: new Date().toISOString(),
      selected: selectedFiles.includes(name),
      timeRange: `${status.searchParams?.timeFrom || ''} ~ ${status.searchParams?.timeTo || ''}`,
      status: status.status,
      progress: status.progress,
      message: status.message,
      processedRows: status.processedRows,
      totalRows: status.totalRows,
      processingSpeed: status.processingSpeed,
      estimatedTimeRemaining: status.estimatedTimeRemaining,
      size: status.size,
      searchParams: status.searchParams,
    }));
  }, [fileStatuses, selectedFiles]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      size="6xl"
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent maxW="90vw" m="auto">
        <ModalHeader>Download Progress</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={3} align="stretch">
            <Box>
              <Text fontSize="sm" mb={2}>
                Overall Progress
              </Text>
              <DownloadProgress
                progress={totalProgress?.progress || 0}
                status={
                  totalProgress?.status || ('generating' as DownloadStatus)
                }
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
            <DownloadGrid
              rowData={rowData}
              selectedFiles={selectedFiles}
              onFileSelection={onFileSelection}
              onFileDownload={onFileDownload}
              gridTheme={gridTheme}
            />
            <Flex justifyContent="flex-end" gap={2}>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadSelected}
                isDisabled={selectedFiles.length === 0}
              >
                Download Selected ({selectedFiles.length})
              </Button>
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            </Flex>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
