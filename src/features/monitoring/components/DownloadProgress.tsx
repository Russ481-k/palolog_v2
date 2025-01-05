import { Box, HStack, Progress, Text, VStack } from '@chakra-ui/react';

import { DownloadStatus } from '@/types/download';

interface DownloadProgressProps {
  progress: number;
  status: DownloadStatus;
  processedRows?: number;
  totalRows?: number;
  estimatedTimeRemaining?: number;
  message?: string;
  size?: 'sm' | 'md';
}

export const DownloadProgress = ({
  progress,
  status,
  processedRows,
  totalRows,
  estimatedTimeRemaining,
  message,
  size = 'md',
}: DownloadProgressProps) => {
  const spacing = size === 'sm' ? 1 : 2;
  const fontSize = size === 'sm' ? 'xs' : 'sm';

  return (
    <VStack spacing={spacing} align="stretch" width="100%">
      <Box pt={2}>
        <Progress
          value={progress}
          size={size}
          colorScheme="blue"
          isIndeterminate={status === 'pending'}
          borderRadius="md"
        />
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
          <Text>
            {processedRows.toLocaleString()} / {totalRows.toLocaleString()} rows
          </Text>
        )}
        {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
          <Text>{Math.round(estimatedTimeRemaining)}s remaining</Text>
        )}
        {message && <Text>{message}</Text>}
      </HStack>
    </VStack>
  );
};
