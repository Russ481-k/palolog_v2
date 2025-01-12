import { Box, Flex } from '@chakra-ui/react';

import type { DownloadStatus as DownloadStatusType } from '@/types/download';

import { defaultStatusDisplay, statusDisplayMap } from '../utils/statusMapping';

interface DownloadStatusProps {
  status: DownloadStatusType;
}

export const DownloadStatus = ({ status }: DownloadStatusProps) => {
  const displayInfo = statusDisplayMap.get(status) || defaultStatusDisplay;

  return (
    <Flex height="40px" alignItems="center">
      <Box
        px={2}
        borderRadius="md"
        bg={`${displayInfo.color}.100`}
        color={`${displayInfo.color}.700`}
        fontSize="sm"
        fontWeight="medium"
        textAlign="center"
        height="24px"
        width="120px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {displayInfo.text}
      </Box>
    </Flex>
  );
};
