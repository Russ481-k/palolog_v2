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
        } as AgBarSeriesOptions,
      ],
      axes: [
        {
          type: 'category',
          position: 'bottom',
          label: {
            formatter: (params) => {
              const [date, time] = params.value.split(' ');
              return `${date.slice(5)} ${time.slice(0, 5)}`;
            },
          },
        },
        {
          position: 'left',
          type: 'number',
          label: {
            formatter: (params) => {
              return `${(params.value / 1000000).toFixed(1)}M`;
            },
          },
          keys: ['total'],
          title: {
            text: 'Total (M)',
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
      height: 480,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, colorMode]
  );

  return (
    <GridItem
      borderRadius="lg"
      bg="blackAlpha.200"
      borderWidth={1}
      borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
      colSpan={{ base: 1, sm: 2, md: 3, lg: 3, xl: 3 }}
      overflow="hidden"
      height={{
        base: '480px',
        sm: '480px',
        md: '480px',
        lg: '480px',
        xl: '480px',
      }}
    >
      <AgChartsThemeChanged colorMode={colorMode} options={countsPerDay} />
    </GridItem>
  );
};
