import React, { useMemo } from 'react';

import { Box, GridItem, Text, useColorMode } from '@chakra-ui/react';
import { AgChartOptions } from 'ag-charts-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';

export const DiskUsageCard = ({ diskUsage }: { diskUsage: number }) => {
  const { colorMode } = useColorMode();
  const cpuUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      data: [
        {
          asset: 'available',
          amount: 100,
        },
        {
          asset: 'used',
          amount: diskUsage,
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
              text: String(diskUsage.toFixed(1)) + '%',
              spacing: 5,
              fontSize: 24,
              fontWeight: 'bold',
            },
          ],
        },
      ],
      height: 200,
    }),
    [diskUsage]
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
        <Box mb="-54px">
          <Text fontSize="lg" fontWeight="bold">
            Disk 사용량
          </Text>
        </Box>
        <Box />
        <AgChartsThemeChanged
          colorMode={colorMode}
          options={cpuUsageDataDonut}
        />
      </Box>
    </GridItem>
  );
};
