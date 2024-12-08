import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions, AgLineSeriesOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';
import { trpc } from '@/lib/trpc/client';

export const DashboardStaticsMemory = () => {
  // const getMemoryUsageData = trpc.dashboard.getMemoryUsage.useInfiniteQuery({});

  const { colorMode } = useColorMode();

  const memoryUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'Memory',
      },
      data: [
        {
          asset: 'available',
          amount: 100 - 1,
        },
        {
          asset: 'used',
          amount: 1,
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
              text: 'Memory used percentage',
              fontWeight: 'bold',
            },
            {
              text: String(20) + '%',
              spacing: 4,
              fontSize: 42,
            },
          ],
        },
      ],
      height: 400,
    }),
    []
  );
  const memoryUsageData = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      data: [],
      series: [
        {
          type: 'line',
          xKey: 'time',
          yKey: 'usagePercentage',
          yName: 'usagePercentage',
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
      ],
      axes: [
        {
          type: 'category',
          position: 'bottom',
        },
        {
          type: 'number',
          position: 'left',
          label: {
            format: '#{.1f}%',
          },
          title: {
            text: 'Usage Percentage',
          },
        },
      ],
      height: 400,
    }),
    []
  );
  return (
    <GridItem
      borderRadius="lg"
      bg="blackAlpha.200"
      borderWidth={1}
      borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
      colSpan={1}
      overflow="hidden"
      height={{
        base: '800px',
        sm: '800px',
        md: '800px',
        lg: '800px',
        xl: '800px',
      }}
    >
      <AgChartsThemeChanged
        colorMode={colorMode}
        options={memoryUsageDataDonut}
      />
      <AgChartsThemeChanged colorMode={colorMode} options={memoryUsageData} />
    </GridItem>
  );
};
