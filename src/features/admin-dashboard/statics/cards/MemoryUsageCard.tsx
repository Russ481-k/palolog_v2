import React from 'react';

import { Box, GridItem, Text, useColorMode } from '@chakra-ui/react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export const MemoryUsageCard = ({ memoryUsage }: { memoryUsage: number }) => {
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
        base: '220px',
        sm: '220px',
        md: '220px',
        lg: '220px',
        xl: '220px',
      }}
    >
      <Box
        display="grid"
        alignItems="center"
        textAlign="center"
        justifyContent="center"
        height="220px"
      >
        <Box>
          <Text fontSize="xl" fontWeight="bold">
            Memory 사용량
          </Text>
          <Text fontSize="sm" fontWeight="regular">
            Memory Usage
          </Text>
        </Box>
        <Text fontSize={46} fontWeight="extrabold">
          {memoryUsage.toFixed(2)} %
        </Text>
        <Box />
      </Box>
    </GridItem>
  );
};
