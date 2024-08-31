import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions, AgLineSeriesOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { trpc } from '@/lib/trpc/client';

export const DashboardStaticsCpu = () => {
  const getCpuUsageData = trpc.dashboard.getCpuUsage.useInfiniteQuery({});

  const { colorMode } = useColorMode();

  const AgChartsThemeChanged = ({ options }: { options: AgChartOptions }) => {
    if (colorMode === 'light') {
      options.theme = 'ag-polychroma';
    } else if (colorMode === 'dark') {
      options.theme = 'ag-polychroma-dark';
    }
    return <AgCharts options={options} />;
  };
  const cpuUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      data: [
        {
          asset: 'available',
          amount:
            100 - (getCpuUsageData.data?.pages?.[0]?.[0]?.total_usage ?? 0),
        },
        {
          asset: 'used',
          amount: getCpuUsageData.data?.pages?.[0]?.[0]?.total_usage,
        },
      ],
      title: {
        text: 'CPU',
      },
      series: [
        {
          type: 'donut',
          calloutLabelKey: 'asset',
          angleKey: 'amount',
          innerRadiusRatio: 0.85,
          innerLabels: [
            {
              text: 'CPU used percentage',
              fontWeight: 'bold',
            },
            {
              text:
                String(
                  getCpuUsageData.data?.pages?.[0]?.[0]?.total_usage ?? 0
                ) + '%',
              spacing: 4,
              fontSize: 42,
            },
          ],
        },
      ],
      height: 400,
    }),
    [getCpuUsageData]
  );
  const cpuUsageData = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      data: getCpuUsageData.data?.pages[0],
      series: [
        {
          type: 'line',
          xKey: 'time',
          yKey: 'total_usage',
          yName: 'Total Usage',
          strokeWidth: 3,
          marker: {
            enabled: false,
          },
          interpolation: {
            type: 'smooth',
          },
        } as AgLineSeriesOptions,
        {
          type: 'line',
          xKey: 'time',
          yKey: 'core_1',
          yName: 'core_1',
          interpolation: {
            type: 'smooth',
          },
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
        {
          type: 'line',
          xKey: 'time',
          interpolation: {
            type: 'smooth',
          },
          yKey: 'core_2',
          yName: 'core_2',
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
        {
          type: 'line',
          xKey: 'time',
          yKey: 'core_3',
          yName: 'core_3',
          interpolation: {
            type: 'smooth',
          },
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
        {
          type: 'line',
          xKey: 'time',
          yKey: 'core_4',
          yName: 'core_4',
          interpolation: {
            type: 'smooth',
          },
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
        {
          type: 'line',
          xKey: 'time',
          yKey: 'core_5',
          yName: 'core_5',
          interpolation: {
            type: 'smooth',
          },
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
        {
          type: 'line',
          xKey: 'time',
          yKey: 'core_6',
          yName: 'core_6',
          interpolation: {
            type: 'smooth',
          },
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
    [getCpuUsageData]
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
      <AgChartsThemeChanged options={cpuUsageDataDonut} />
      <AgChartsThemeChanged options={cpuUsageData} />
    </GridItem>
  );
};
