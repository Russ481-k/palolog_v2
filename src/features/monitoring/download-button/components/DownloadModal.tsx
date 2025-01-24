import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';

import type { DownloadStatus } from '@/types/download';

import type { FileData, FileStatuses } from '../types';
import { DownloadGrid } from './DownloadGrid';
import { DownloadProgress } from './DownloadProgress';

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
  onFileDownload: (serverFileName: string, clientFileName: string) => void;
  onDownloadSelected: () => void;
  gridTheme: string;
  failedDownloads: Set<string>;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  fileStatuses,
  selectedFiles,
  onFileSelection,
  onFileDownload,
  onDownloadSelected,
  gridTheme,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

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
    return Object.entries(fileStatuses).map(([downloadId, status]) => ({
      id: downloadId,
      downloadId: status.downloadId,
      fileName: status.clientFileName || '',
      serverFileName: status.fileName,
      selected: selectedFiles.includes(downloadId),
      timeRange:
        status.firstReceiveTime && status.lastReceiveTime
          ? `${status.firstReceiveTime} ~ ${status.lastReceiveTime}`
          : 'Calculating...',
      status: status.status,
      progress: status.progress,
      message: status.message || '',
      processedRows: status.processedRows,
      totalRows: status.totalRows,
      processingSpeed: status.processingSpeed || 0,
      estimatedTimeRemaining: status.estimatedTimeRemaining || 0,
      size: status.size || 0,
      firstReceiveTime: status.firstReceiveTime,
      lastReceiveTime: status.lastReceiveTime,
    }));
  }, [fileStatuses, selectedFiles]);

  // Calculate overall progress excluding pending files
  const calculatedTotalProgress = useMemo(() => {
    const activeFiles = Object.values(fileStatuses);

    if (activeFiles.length === 0) {
      return null;
    }

    const totalProcessedRows = activeFiles.reduce(
      (sum, status) => sum + status.processedRows,
      0
    );
    const totalRows = activeFiles.reduce(
      (sum, status) => sum + status.totalRows,
      0
    );

    const progress = totalRows > 0 ? (totalProcessedRows / totalRows) * 100 : 0;

    // Calculate average speed and estimated time
    const totalSpeed = activeFiles.reduce(
      (sum, status) =>
        sum +
        (status.processingSpeed && status.processingSpeed > 0
          ? status.processingSpeed
          : 0),
      0
    );
    const avgSpeed = totalSpeed / activeFiles.length;
    const remainingRows = totalRows - totalProcessedRows;
    const estimatedTime = avgSpeed > 0 ? remainingRows / avgSpeed : 0;

    // Determine overall status
    let overallStatus: DownloadStatus = 'generating';
    if (progress >= 100) {
      overallStatus = 'completed';
    } else if (activeFiles.some((f) => f.status === 'failed')) {
      overallStatus = 'failed';
    } else if (activeFiles.some((f) => f.status === 'downloading')) {
      overallStatus = 'downloading';
    } else if (activeFiles.every((f) => f.status === 'ready')) {
      overallStatus = 'ready';
    }

    return {
      status: overallStatus,
      progress,
      processedRows: totalProcessedRows,
      totalRows,
      processingSpeed: avgSpeed,
      estimatedTimeRemaining: estimatedTime,
      message:
        progress >= 100
          ? 'All files completed'
          : `Processing ${activeFiles.length} files...`,
    };
  }, [fileStatuses]);

  // Determine if the grid should show loading state
  const isGridLoading = useMemo(() => {
    return Object.keys(fileStatuses).length === 0;
  }, [fileStatuses]);

  const handleDownloadSelected = async () => {
    setIsDownloading(true);
    try {
      await onDownloadSelected();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      size="6xl"
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent maxW="90vw" m="auto">
        <ModalHeader>Download Center</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={3} align="stretch">
            <Box>
              <DownloadProgress
                status={calculatedTotalProgress?.status ?? 'generating'}
                progress={calculatedTotalProgress?.progress ?? 0}
                processedRows={calculatedTotalProgress?.processedRows ?? 0}
                totalRows={calculatedTotalProgress?.totalRows ?? 0}
                processingSpeed={calculatedTotalProgress?.processingSpeed ?? 0}
                estimatedTimeRemaining={
                  calculatedTotalProgress?.estimatedTimeRemaining ?? 0
                }
                message={calculatedTotalProgress?.message ?? ''}
                isLoading={!calculatedTotalProgress}
              />
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">
                {
                  Object.values(fileStatuses).filter(
                    (f) => f.status === 'ready'
                  ).length
                }{' '}
                / {Object.keys(fileStatuses).length} files ready
              </Text>
            </Box>
            <DownloadGrid
              rowData={rowData}
              selectedFiles={selectedFiles}
              onFileSelection={onFileSelection}
              onFileDownload={onFileDownload}
              gridTheme={gridTheme}
              isLoading={isGridLoading}
            />
            <Flex justifyContent="flex-end" gap={2}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSelected}
                isDisabled={selectedFiles.length === 0}
                isLoading={isDownloading}
                loadingText="Downloading..."
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
