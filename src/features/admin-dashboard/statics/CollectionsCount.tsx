import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions, AgLineSeriesOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { trpc } from '@/lib/trpc/client';

export const DashboardStaticsCollectionsCount = () => {
  const getCountsPerSec = trpc.dashboard.getCountsPerSec.useInfiniteQuery({});
  const getCountsPerDay = trpc.dashboard.getCountsPerDay.useInfiniteQuery({});

  const { colorMode } = useColorMode();

  const AgChartsThemeChanged = ({ options }: { options: AgChartOptions }) => {
    if (colorMode === 'light') {
      options.theme = 'ag-polychroma';
    } else if (colorMode === 'dark') {
      options.theme = 'ag-polychroma-dark';
    }
    return <AgCharts options={options} />;
  };

  const countsPerSec = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: 'Collections Counts Per Second',
      },
      data: getCountsPerSec.data?.pages[0],
      series: [
        {
          type: 'line',
          xKey: 'time',
          yKey: 'total',
          yName: 'Total',
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
        {
          type: 'line',
          xKey: 'time',
          yKey: 'countsPerSec',
          yName: 'Counts Per Sec',
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
          position: 'left',
          type: 'number',
          label: {
            format: '#{.0f} M',
          },
          keys: ['total'],
          title: {
            text: 'Total',
          },
        },
        {
          position: 'right',
          type: 'number',
          keys: ['countsPerSec'],
          title: {
            text: 'Counts Per Second',
          },
        },
      ],
      height: 400,
    }),
    [getCountsPerSec]
  );

  const countsPerDay = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: 'Collections Counts Per Day',
      },
      data: getCountsPerDay.data?.pages[0],
      series: [
        {
          type: 'line',
          xKey: 'time',
          yKey: 'countsPerDay',
          yName: 'Counts Per Day',
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
      ],
      height: 400,
    }),
    [getCountsPerDay]
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
      <AgChartsThemeChanged options={countsPerSec} />
      <AgChartsThemeChanged options={countsPerDay} />
    </GridItem>
  );
};
