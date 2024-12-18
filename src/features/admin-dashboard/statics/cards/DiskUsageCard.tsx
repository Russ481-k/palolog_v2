import React, { useMemo } from 'react';

import { Box, Flex, GridItem, Text, useColorMode } from '@chakra-ui/react';
import { AgChartOptions } from 'ag-charts-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';

export const DiskUsageCard = ({
  diskUsage,
}: {
  diskUsage: { total: number; used: number; usage: number };
}) => {
  const { colorMode } = useColorMode();
  const cpuUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      data: [
        {
          asset: 'available',
          amount: 100 - diskUsage.usage,
        },
        {
          asset: 'used',
          amount: diskUsage.usage,
        },
      ],
      series: [
        {
          type: 'donut',
          calloutLabelKey: 'asset',
          angleKey: 'amount',
          innerRadiusRatio: 0.85,
          innerLabels: [
            {
              text: String(diskUsage.usage.toFixed(1)) + '%',
              spacing: 0,
              fontSize: 18,
              fontWeight: 'bold',
            },
          ],
        },
      ],
      legend: {
        enabled: false,
      },
      height: 170,
      width: 120,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diskUsage, colorMode]
  );

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
        m="auto"
        alignItems="center"
        textAlign="center"
        justifyContent="center"
        height="220px"
      >
        <Box>
          <Text fontSize="lg" fontWeight="bold">
            Disk 사용량
          </Text>
        </Box>
        <Flex justifyContent="center" alignItems="center" w="100%" h="100px">
          <Box width="50%">
            <Text fontSize={14} fontWeight="bold">
              Total : {diskUsage.total}GB
            </Text>
            <Text fontSize={14} fontWeight="bold">
              Used : {diskUsage.used}GB
            </Text>
          </Box>
          <Box width="50%">
            <AgChartsThemeChanged
              colorMode={colorMode}
              options={cpuUsageDataDonut}
            />
          </Box>
        </Flex>
        <Box />
      </Box>
    </GridItem>
  );
};
