import React from 'react';

import { Box, GridItem, Text, useColorMode } from '@chakra-ui/react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export const CpuUsageCard = ({ cpuUsage }: { cpuUsage: number }) => {
  const { colorMode } = useColorMode();

  return (
    <GridItem
      borderRadius="lg"
      bg={colorMode === 'light' ? 'white' : '#182232'}
      borderWidth={1}
      borderColor={
        cpuUsage >= 80
          ? 'red.400'
          : colorMode === 'light'
            ? 'gray.200'
            : 'whiteAlpha.300'
      }
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
        m="auto"
        alignItems="center"
        textAlign="center"
        justifyContent="center"
        height="220px"
      >
        <Box>
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={
              cpuUsage >= 80
                ? 'red.400'
                : colorMode === 'light'
                  ? 'gray.800'
                  : 'white'
            }
          >
            CPU 사용량
          </Text>
          <Text
            fontSize="sm"
            fontWeight="regular"
            color={
              cpuUsage >= 80
                ? 'red.400'
                : colorMode === 'light'
                  ? 'gray.800'
                  : 'white'
            }
          >
            CPU Usage
          </Text>
        </Box>
        <Text
          fontSize={46}
          fontWeight="extrabold"
          color={
            cpuUsage >= 80
              ? 'red.500'
              : colorMode === 'light'
                ? 'gray.800'
                : 'white'
          }
        >
          {cpuUsage.toFixed(2)} %
        </Text>
        <Box />
      </Box>
    </GridItem>
  );
};
