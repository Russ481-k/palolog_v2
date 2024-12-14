import React from 'react';

import { Box, GridItem, Text, useColorMode } from '@chakra-ui/react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export const DailyTotalCard = ({ logsPerDay }: { logsPerDay: number }) => {
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
            일별 로그량(lpd)
          </Text>
          <Text fontSize="sm" fontWeight="regular">
            Log Per Day
          </Text>
        </Box>
        <Text fontSize={46} fontWeight="extrabold">
          {logsPerDay >= 1000000
            ? Math.floor(logsPerDay / 1000000).toLocaleString() + ' M'
            : logsPerDay >= 100000
              ? Math.floor(logsPerDay / 1000).toLocaleString() + ' K'
              : logsPerDay.toLocaleString()}{' '}
          건
        </Text>
        <Box />
      </Box>
    </GridItem>
  );
};
