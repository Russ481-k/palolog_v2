import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions, AgLineSeriesOptions } from 'ag-charts-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';
import { trpc } from '@/lib/trpc/client';

export const DashboardStaticsCountsPerMonth = () => {
  const { colorMode } = useColorMode();

  const countsPerDay = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: '월간 로그 총 수집량',
      },
      data: [],
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
          yKey: 'countsPerDay',
          yName: 'Counts Per Day',
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
          keys: ['countsPerDay'],
          title: {
            text: 'Counts Per Day',
          },
        },
      ],
      height: 320,
    }),
    []
  );

  return (
    <GridItem
      borderRadius="lg"
      bg="blackAlpha.200"
      borderWidth={1}
      borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
      colSpan={3}
      overflow="hidden"
      height={{
        base: '320px',
        sm: '320px',
        md: '320px',
        lg: '320px',
        xl: '320px',
      }}
    >
      <AgChartsThemeChanged colorMode={colorMode} options={countsPerDay} />
    </GridItem>
  );
};
