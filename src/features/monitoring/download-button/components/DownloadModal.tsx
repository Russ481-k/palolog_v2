import {
  Box,
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
  const rowData: FileData[] = Object.entries(fileStatuses).map(
    ([name, status]) =>
      ({
        ...(status as FileStatus),
        fileName: name,
        lastModified: new Date().toISOString(),
        selected: selectedFiles.includes(name),
        timeRange: `${status.searchParams.timeFrom} ~ ${status.searchParams.timeTo}`,
      }) as FileData
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
