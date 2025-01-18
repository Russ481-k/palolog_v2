import { memo, useMemo } from 'react';

import {
  Box,
  HStack,
  Progress,
  Text,
  Tooltip,
  VStack,
  useColorMode,
} from '@chakra-ui/react';

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

export const DownloadProgress = memo(
  ({
    progress,
    status,
    processedRows,
    totalRows,
    estimatedTimeRemaining,
    processingSpeed,
    message,
    size = 'md',
  }: DownloadProgressProps) => {
    const { colorMode } = useColorMode();
    const spacing = size === 'sm' ? 1 : 2;
    const fontSize = size === 'sm' ? 'xs' : 'sm';

    // Memoize formatted values
    const formattedValues = useMemo(() => {
      const speed = processingSpeed
        ? processingSpeed > 1000
          ? `${(processingSpeed / 1000).toFixed(1)}k rows/s`
          : `${Math.round(processingSpeed)} rows/s`
        : null;

      const time = estimatedTimeRemaining
        ? estimatedTimeRemaining < 60
          ? `${Math.round(estimatedTimeRemaining)}s`
          : `${Math.floor(estimatedTimeRemaining / 60)}m ${Math.round(estimatedTimeRemaining % 60)}s`
        : null;

      const rows =
        processedRows !== undefined && totalRows !== undefined
          ? `${processedRows.toLocaleString()} / ${totalRows.toLocaleString()}`
          : null;

      return { speed, time, rows };
    }, [processingSpeed, estimatedTimeRemaining, processedRows, totalRows]);

    // Memoize progress bar color scheme
    const colorScheme = useMemo(() => {
      const scheme = {
        light: {
          progress: 'gray',
          completed: 'green',
          failed: 'red',
          paused: 'orange',
          generating: 'purple',
          downloading: 'blue',
          ready: 'teal',
          pending: 'gray',
        },
        dark: {
          progress: 'gray',
          completed: 'green',
          failed: 'red',
          paused: 'orange',
          generating: 'purple',
          downloading: 'blue',
          ready: 'teal',
          pending: 'gray',
        },
      };
      return colorMode === 'dark' ? scheme.dark[status] : scheme.light[status];
    }, [colorMode, status]);

    // Reset progress when transitioning from generating to ready
    const displayProgress = status === 'ready' ? 0 : progress;

    return (
      <VStack spacing={spacing} align="stretch" width="100%" flex="1">
        <Box pt={2}>
          <Tooltip
            label={message || status}
            isDisabled={!message && status === 'completed'}
            placement="top"
            hasArrow
          >
            <Progress
              value={displayProgress}
              size={size}
              colorScheme={colorScheme}
              isIndeterminate={status === 'generating' || status === 'ready'}
              borderRadius="md"
              transition="all 0.2s"
              bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'blackAlpha.100'}
            />
          </Tooltip>
        </Box>
        <HStack
          height="18px"
          justify="space-between"
          fontSize={fontSize}
          color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
          spacing={2}
        >
          <Text>
            {status === 'generating'
              ? 'Generating...'
              : status === 'ready'
                ? 'Ready'
                : `${Math.round(displayProgress)}%`}
          </Text>
          {formattedValues.rows && (
            <Tooltip label="Processed / Total Rows" hasArrow>
              <Text>{formattedValues.rows}</Text>
            </Tooltip>
          )}
          {formattedValues.speed && status !== 'ready' && (
            <Tooltip label="Processing Speed" hasArrow>
              <Text>{formattedValues.speed}</Text>
            </Tooltip>
          )}
          {formattedValues.time && status !== 'ready' && (
            <Tooltip label="Estimated Time Remaining" hasArrow>
              <Text>{formattedValues.time}</Text>
            </Tooltip>
          )}
          {message && (
            <Tooltip label={message} hasArrow>
              <Text noOfLines={1} maxW="200px">
                {message}
              </Text>
            </Tooltip>
          )}
        </HStack>
      </VStack>
    );
  }
);

DownloadProgress.displayName = 'DownloadProgress';
