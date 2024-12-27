import { useEffect, useRef, useState } from 'react';

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  CloseButton,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Text,
  useColorMode,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { AgGridReact } from 'ag-grid-react';

import { trpc } from '@/lib/trpc/client';
import { DownloadProgress, DownloadStatus } from '@/types/download';

interface DownloadButtonProps {
  searchId: string;
  totalRows: number;
  searchParams: {
    timeFrom: string;
    timeTo: string;
    menu: string;
    searchTerm: string;
  };
}

export const DownloadButton = ({
  searchId,
  totalRows,
  searchParams,
}: DownloadButtonProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();
  const gridRef = useRef<AgGridReact>(null);

  const [downloadId, setDownloadId] = useState<string>();
  const [downloadStatus, setDownloadStatus] = useState<DownloadProgress>();

  const toast = useToast();
  const [error, setError] = useState<string>();

  const startDownload = trpc.download.startDownload.useMutation({
    onSuccess: (data) => {
      setDownloadId(data.downloadId);
      setError(undefined);
    },
    onError: (error) => {
      setError(error.message);
      toast({
        title: 'Download Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const { data: progress } = trpc.download.getProgress.useQuery(
    { downloadId: downloadId ?? '' },
    {
      enabled: !!downloadId,
      refetchInterval: (data) =>
        data?.status === 'completed' || data?.status === 'failed'
          ? false
          : 1000,
    }
  );

  const { data: files } = trpc.download.getFiles.useQuery(
    { downloadId: downloadId ?? '' },
    { enabled: !!downloadId }
  );

  const downloadFile = trpc.download.downloadFile.useMutation();
  const cleanup = trpc.download.cleanup.useMutation();

  // 진행 상황 업데이트 개선
  useEffect(() => {
    if (progress) {
      setDownloadStatus(progress);
      if (progress.status === 'failed') {
        setError(progress.error);
        toast({
          title: 'Download Failed',
          description: progress.error,
          status: 'error',
          duration: null,
          isClosable: true,
        });
      }
    }
  }, [progress, toast]);

  const handleFileDownload = async (fileName: string) => {
    try {
      const { filePath } = await downloadFile.mutateAsync({ fileName });

      // 파일 다운로드 링크 생성 및 클릭
      const link = document.createElement('a');
      link.href = `/api/download?file=${encodeURIComponent(filePath)}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleDownload = () => {
    startDownload.mutate({
      searchId,
      totalRows,
      searchParams,
    });
    onOpen();
  };

  useEffect(() => {
    if (
      downloadStatus?.status === 'completed' ||
      downloadStatus?.status === 'failed'
    ) {
      const timer = setTimeout(
        async () => {
          if (downloadId) {
            await cleanup.mutateAsync({ downloadId });
          }
        },
        30 * 60 * 1000
      );

      return () => clearTimeout(timer);
    }
  }, [downloadStatus?.status, downloadId]);

  return (
    <>
      <Button
        size="xs"
        borderLeftRadius={0}
        onClick={handleDownload}
        isLoading={downloadStatus?.status === 'processing'}
        loadingText="Preparing..."
      >
        Download
      </Button>

      <Modal
        isOpen={isOpen}
        size="xxl"
        onClose={onClose}
        closeOnOverlayClick={false}
      >
        <ModalOverlay />
        <ModalContent my="auto">
          <ModalHeader>
            <Heading size="md">DOWNLOAD CENTER</Heading>
          </ModalHeader>
          <ModalCloseButton
            isDisabled={downloadStatus?.status === 'processing'}
          />

          <ModalBody minHeight="640px">
            <Flex direction="column" gap={4}>
              {error && (
                <Alert status="error">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Download Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Box>
                  <CloseButton
                    position="absolute"
                    right={2}
                    top={2}
                    onClick={() => setError(undefined)}
                  />
                </Alert>
              )}

              {/* 진행 상태 표시 개선 */}
              <Flex direction="column" gap={2}>
                <Progress
                  value={downloadStatus?.percentage ?? 0}
                  size="lg"
                  colorScheme={
                    downloadStatus?.status === 'completed'
                      ? 'green'
                      : downloadStatus?.status === 'failed'
                        ? 'red'
                        : 'blue'
                  }
                  isIndeterminate={downloadStatus?.status === 'preparing'}
                  hasStripe={downloadStatus?.status === 'processing'}
                  isAnimated={downloadStatus?.status === 'processing'}
                />

                <Text fontSize="sm" color="gray.500">
                  {downloadStatus?.status === 'preparing' &&
                    'Preparing download...'}
                  {downloadStatus?.status === 'processing' &&
                    `Processing: ${downloadStatus.processedRows.toLocaleString()} / ${downloadStatus.totalRows.toLocaleString()} rows`}
                  {downloadStatus?.status === 'completed' &&
                    'Download completed!'}
                  {downloadStatus?.status === 'failed' && 'Download failed'}
                </Text>

                {downloadStatus?.message && (
                  <Text fontSize="xs" color="gray.500">
                    {downloadStatus.message}
                  </Text>
                )}
              </Flex>

              {/* 파일 목록 */}
              {downloadStatus?.status === 'completed' && (
                <div
                  className={
                    colorMode === 'light'
                      ? 'ag-theme-quartz'
                      : 'ag-theme-quartz-dark'
                  }
                  style={{ width: '100%', height: '65vh' }}
                >
                  <AgGridReact
                    ref={gridRef}
                    rowData={files?.map((file: string, index: number) => ({
                      no: index + 1,
                      file,
                      actions: file,
                    }))}
                    columnDefs={[
                      { field: 'no', headerName: 'No', width: 80 },
                      { field: 'file', headerName: 'File', flex: 1 },
                      {
                        field: 'actions',
                        headerName: 'Actions',
                        width: 120,
                        cellRenderer: (params: { value: string }) => (
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={() => handleFileDownload(params.value)}
                          >
                            Download
                          </Button>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={onClose}
              isDisabled={downloadStatus?.status === 'processing'}
            >
              {downloadStatus?.status === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            {downloadStatus?.status === 'failed' && (
              <Button
                colorScheme="red"
                onClick={() => {
                  setError(undefined);
                  startDownload.mutate({
                    searchId,
                    totalRows,
                    searchParams,
                  });
                }}
              >
                Retry
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
