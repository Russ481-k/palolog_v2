import React from 'react';

import { Box, GridItem, Text, useColorMode } from '@chakra-ui/react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export const LogsPerSecondCard = ({
  logsPerSecond,
}: {
  logsPerSecond: number;
}) => {
  const { colorMode } = useColorMode();

  return (
    <GridItem
      borderRadius="lg"
      bg={colorMode === 'light' ? 'white' : 'whiteAlpha.50'}
      borderWidth={1}
      borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
      colSpan={1}
      overflow="hidden"
      height={{
        base: '260px',
        sm: '260px',
        md: '260px',
        lg: '260px',
        xl: '260px',
      }}
    >
      <Box
        display="grid"
        m="auto"
        alignItems="center"
        textAlign="center"
        justifyContent="center"
        height="260px"
      >
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            초당 로그량(lps)
          </Text>
          <Text fontSize="sm" fontWeight="regular">
            Log Per Second
          </Text>
        </Box>
        <Text fontSize={46} fontWeight="extrabold">
          {logsPerSecond.toLocaleString()} 건
        </Text>
        <Box />
      </Box>
    </GridItem>
  );
};
