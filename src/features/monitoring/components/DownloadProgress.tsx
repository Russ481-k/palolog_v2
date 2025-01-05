import { useMemo } from 'react';

import { Box, HStack, Progress, Text, Tooltip, VStack } from '@chakra-ui/react';

import { DownloadStatus } from '@/types/download';

interface DownloadProgressProps {
  progress: number;
  status: DownloadStatus;
  processedRows?: number;
  totalRows?: number;
  estimatedTimeRemaining?: number;
  processingSpeed?: number;
  message?: string;
  size?: 'sm' | 'md';
}

export const DownloadProgress = ({
  progress,
  status,
  processedRows,
  totalRows,
  estimatedTimeRemaining,
  processingSpeed,
  message,
  size = 'md',
}: DownloadProgressProps) => {
  const spacing = size === 'sm' ? 1 : 2;
  const fontSize = size === 'sm' ? 'xs' : 'sm';

  const formattedSpeed = useMemo(() => {
    if (!processingSpeed) return null;
    return processingSpeed > 1000
      ? `${(processingSpeed / 1000).toFixed(1)}k rows/s`
      : `${Math.round(processingSpeed)} rows/s`;
  }, [processingSpeed]);

  const formattedTime = useMemo(() => {
    if (!estimatedTimeRemaining) return null;
    if (estimatedTimeRemaining < 60) {
      return `${Math.round(estimatedTimeRemaining)}s`;
    }
    const minutes = Math.floor(estimatedTimeRemaining / 60);
    const seconds = Math.round(estimatedTimeRemaining % 60);
    return `${minutes}m ${seconds}s`;
  }, [estimatedTimeRemaining]);

  return (
    <VStack spacing={spacing} align="stretch" width="100%">
      <Box pt={2}>
        <Tooltip
          label={message || status}
          isDisabled={!message && status === 'completed'}
        >
          <Progress
            value={progress}
            size={size}
            colorScheme={
              status === 'completed'
                ? 'green'
                : status === 'failed'
                  ? 'red'
                  : status === 'paused'
                    ? 'orange'
                    : 'blue'
            }
            isIndeterminate={status === 'pending'}
            borderRadius="md"
          />
        </Tooltip>
      </Box>
      <HStack
        height="18px"
        justify="space-between"
        fontSize={fontSize}
        color="gray.600"
      >
        <Text>
          {status === 'pending' ? 'Preparing...' : `${Math.round(progress)}%`}
        </Text>
        {processedRows !== undefined && totalRows !== undefined && (
          <Tooltip label="Processed / Total Rows">
            <Text>
              {processedRows.toLocaleString()} / {totalRows.toLocaleString()}
            </Text>
          </Tooltip>
        )}
        {formattedSpeed && (
          <Tooltip label="Processing Speed">
            <Text>{formattedSpeed}</Text>
          </Tooltip>
        )}
        {formattedTime && (
          <Tooltip label="Estimated Time Remaining">
            <Text>{formattedTime}</Text>
          </Tooltip>
        )}
        {message && (
          <Tooltip label={message}>
            <Text noOfLines={1} maxW="200px">
              {message}
            </Text>
          </Tooltip>
        )}
      </HStack>
    </VStack>
  );
};
