import { useEffect } from 'react';

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

import type { FileData, FileStatus, FileStatuses } from '../types';
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
  onFileDownload: (fileName: string) => void;
  gridTheme: string;
}

export const DownloadModal = ({
  isOpen,
  onClose,
  totalProgress,
  fileStatuses,
  selectedFiles,
  onFileSelection,
  onFileDownload,
  gridTheme,
}: DownloadModalProps) => {
  console.log('[DownloadModal] Render with fileStatuses:', fileStatuses);

  // Track fileStatuses changes
  useEffect(() => {
    Object.entries(fileStatuses).forEach(([fileName, status]) => {
      console.log('[DownloadModal] File status update:', {
        fileName,
        status: status.status,
        progress: status.progress,
        message: status.message,
        canDownload: status.status === 'ready' || status.status === 'completed',
      });
    });
  }, [fileStatuses]);

  const rowData: FileData[] = Object.entries(fileStatuses).map(
    ([name, status]) => {
      const data: FileData = {
        fileName: name,
        lastModified: new Date().toISOString(),
        selected: selectedFiles.includes(name),
        timeRange: `${status.searchParams.timeFrom} ~ ${status.searchParams.timeTo}`,
        status: status.status,
        progress: status.progress,
        message: status.message,
        processedRows: status.processedRows,
        totalRows: status.totalRows,
        processingSpeed: status.processingSpeed,
        estimatedTimeRemaining: status.estimatedTimeRemaining,
        size: status.size,
        searchParams: status.searchParams,
      };
      return data;
    }
  );

  console.log(
    '[DownloadModal] Final rowData:',
    rowData.map((r) => ({
      fileName: r.fileName,
      status: r.status,
      canDownload: r.status === 'ready' || r.status === 'completed',
    }))
  );

  const handleDownloadSelected = () => {
    selectedFiles.forEach((fileName) => {
      const fileStatus = fileStatuses[fileName];
      if (fileStatus) {
        console.log('[DownloadModal] Attempting download:', {
          fileName,
          status: fileStatus.status,
          message: fileStatus.message,
        });
        onFileDownload(fileName);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
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
                status={totalProgress?.status || ('pending' as DownloadStatus)}
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
                onClick={handleDownloadSelected}
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
