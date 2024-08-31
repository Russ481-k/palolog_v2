import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions, AgLineSeriesOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { trpc } from '@/lib/trpc/client';

export const DashboardStaticsDisk = () => {
  const getDiskUsageData = trpc.dashboard.getDiskUsage.useInfiniteQuery({});

  const { colorMode } = useColorMode();

  const AgChartsThemeChanged = ({ options }: { options: AgChartOptions }) => {
    if (colorMode === 'light') {
      options.theme = 'ag-polychroma';
    } else if (colorMode === 'dark') {
      options.theme = 'ag-polychroma-dark';
    }
    return <AgCharts options={options} />;
  };

  const diskUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'Disk',
      },
      data: [
        {
          asset: 'available',
          amount:
            100 -
            (getDiskUsageData.data?.pages?.[0]?.[0]?.usagePercentage ?? 0),
        },
        {
          asset: 'used',
          amount: getDiskUsageData.data?.pages?.[0]?.[0]?.usagePercentage,
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
              text: 'Disk used percentage',
              fontWeight: 'bold',
            },
            {
              text:
                String(
                  getDiskUsageData.data?.pages?.[0]?.[0]?.usagePercentage ?? 0
                ) + '%',
              spacing: 4,
              fontSize: 42,
            },
          ],
        },
      ],
      height: 400,
    }),
    [getDiskUsageData]
  );
  const diskUsageData = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      data: getDiskUsageData.data?.pages[0],
      // Series: Defines which chart type and data to use
      series: [
        {
          type: 'line',
          xKey: 'time',
          yKey: 'usagePercentage',
          yName: 'usagePercentage',
          marker: {
            enabled: false,
          },
          interpolation: {
            type: 'smooth',
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
    [getDiskUsageData]
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
      <AgChartsThemeChanged options={diskUsageDataDonut} />
      <AgChartsThemeChanged options={diskUsageData} />
    </GridItem>
  );
};
