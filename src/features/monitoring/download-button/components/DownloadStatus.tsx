import { memo, useMemo } from 'react';

import { Box, Flex, useColorMode } from '@chakra-ui/react';

import type { DownloadStatus as DownloadStatusType } from '@/types/download';

import { defaultStatusDisplay, statusDisplayMap } from '../utils/statusMapping';

interface DownloadStatusProps {
  status: DownloadStatusType;
}

export const DownloadStatus = memo(({ status }: DownloadStatusProps) => {
  const { colorMode } = useColorMode();
  const displayInfo = useMemo(
    () => statusDisplayMap.get(status) || defaultStatusDisplay,
    [status]
  );

  const colorScheme = useMemo(() => {
    const scheme = {
      light: {
        completed: { bg: 'green.100', color: 'green.800', shadow: 'green.50' },
        failed: { bg: 'red.100', color: 'red.800', shadow: 'red.50' },
        paused: { bg: 'orange.100', color: 'orange.800', shadow: 'orange.50' },
        pending: { bg: 'gray.100', color: 'gray.800', shadow: 'gray.50' },
        generating: {
          bg: 'purple.100',
          color: 'purple.800',
          shadow: 'purple.50',
        },
        progress: { bg: 'gray.100', color: 'gray.800', shadow: 'gray.50' },
        ready: { bg: 'teal.100', color: 'teal.800', shadow: 'teal.50' },
        downloading: { bg: 'blue.100', color: 'blue.800', shadow: 'blue.50' },
      },
      dark: {
        completed: { bg: 'green.800', color: 'green.100', shadow: 'green.900' },
        failed: { bg: 'red.800', color: 'red.100', shadow: 'red.900' },
        paused: { bg: 'orange.800', color: 'orange.100', shadow: 'orange.900' },
        pending: { bg: 'gray.700', color: 'gray.100', shadow: 'gray.800' },
        generating: {
          bg: 'purple.800',
          color: 'purple.100',
          shadow: 'purple.900',
        },
        progress: { bg: 'gray.800', color: 'gray.100', shadow: 'gray.900' },
        ready: { bg: 'teal.800', color: 'teal.100', shadow: 'teal.900' },
        downloading: { bg: 'blue.800', color: 'blue.100', shadow: 'blue.900' },
      },
    };
    return colorMode === 'dark' ? scheme.dark[status] : scheme.light[status];
  }, [colorMode, status]);

  return (
    <Flex height="40px" alignItems="center">
      <Box
        px={2}
        borderRadius="md"
        bg={colorScheme.bg}
        color={colorScheme.color}
        fontSize="sm"
        fontWeight="semibold"
        textAlign="center"
        height="24px"
        width="120px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="all 0.2s"
        boxShadow={`0 0 0 1px ${colorScheme.shadow}`}
        _hover={{
          transform: 'translateY(-1px)',
          boxShadow: `0 2px 4px ${colorScheme.shadow}`,
        }}
      >
        {displayInfo.text}
      </Box>
    </Flex>
  );
});

DownloadStatus.displayName = 'DownloadStatus';
