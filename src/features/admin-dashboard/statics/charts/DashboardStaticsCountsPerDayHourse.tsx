import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgBarSeriesOptions, AgChartOptions } from 'ag-charts-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';

export const DashboardStaticsCountsPerDayHourse = ({
  data,
}: {
  data: { time: string; total: number }[];
}) => {
  const { colorMode } = useColorMode();
  const countsPerDay = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: '일간 로그 총 수집량',
      },
      data: data,
      series: [
        {
          type: 'bar',
          xKey: 'time',
          yKey: 'total',
          yName: 'Total',
          marker: {
            enabled: false,
          },
        } as AgBarSeriesOptions,
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
            format: '#{.0f} 건',
          },
          keys: ['total'],
          title: {
            text: 'Total',
          },
        },
        {
          position: 'right',
          type: 'number',
          keys: ['countsPerHour'],
          title: {
            text: 'Counts Per Hour',
          },
        },
      ],
      height: 260,
    }),
    [data]
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
        base: '260px',
        sm: '260px',
        md: '260px',
        lg: '260px',
        xl: '260px',
      }}
    >
      <AgChartsThemeChanged colorMode={colorMode} options={countsPerDay} />
    </GridItem>
  );
};
