import {
  Box,
  Flex,
  HStack,
  Progress,
  Skeleton,
  Text,
  useColorMode,
} from '@chakra-ui/react';

import { DownloadStatus } from '@/types/download';

interface DownloadProgressProps {
  progress: number;
  status: DownloadStatus;
  processedRows: number;
  totalRows: number;
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const getColorScheme = (status: DownloadStatus): string => {
  switch (status) {
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'downloading':
      return 'blue';
    case 'ready':
      return 'teal';
    case 'generating':
      return 'purple';
    case 'progress':
      return 'purple';
    default:
      return 'gray';
  }
};

export const DownloadProgress = ({
  progress,
  status,
  processedRows,
  totalRows,
  processingSpeed = 0,
  estimatedTimeRemaining = 0,
  size = 'md',
  isLoading = false,
}: DownloadProgressProps) => {
  const { colorMode } = useColorMode();
  const colorScheme = getColorScheme(status);
  const progressHeight =
    size === 'sm' ? '8px' : size === 'lg' ? '16px' : '12px';

  return (
    <Box width="100%">
      {isLoading ? (
        <Skeleton height={progressHeight} mb={1} borderRadius="full" />
      ) : (
        <Progress
          value={progress}
          size={size}
          colorScheme={colorScheme}
          borderRadius="full"
          backgroundColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
          mb={1}
          transition="width 1.2s ease-in-out"
          sx={{
            '& > div:first-of-type': {
              transition: 'width 1.2s ease-in-out',
            },
          }}
          hasStripe={status === 'downloading' || status === 'generating'}
          isAnimated={status === 'downloading' || status === 'generating'}
        />
      )}
      <Flex fontSize="xs" color="gray.500" justifyContent="space-between">
        <Text fontWeight="medium">{progress.toFixed(1)}%</Text>
        <HStack spacing={2} gap={2} divider={<Text color="gray.400">•</Text>}>
          <Text>{processingSpeed.toFixed(0)} rows/s</Text>
          <Text>
            {progress !== 100 ? estimatedTimeRemaining.toFixed(0) : 0}s
            remaining
          </Text>
        </HStack>
        <Text fontWeight="medium">
          {processedRows.toLocaleString()} / {totalRows.toLocaleString()} rows
        </Text>
      </Flex>
    </Box>
  );
};
