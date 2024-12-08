import React from 'react';

import { Box, GridItem, Text, useColorMode } from '@chakra-ui/react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export const CpuUsageCard = ({ cpuUsage }: { cpuUsage: number }) => {
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
            CPU 사용량
          </Text>
          <Text fontSize="sm" fontWeight="regular">
            CPU Usage
          </Text>
        </Box>
        <Text fontSize={46} fontWeight="extrabold">
          {cpuUsage.toFixed(2)} %
        </Text>
        <Box />
      </Box>
    </GridItem>
  );
};
