import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions } from 'ag-charts-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';
import { env } from '@/env.mjs';

interface Props {
  data: Record<string, string | number>[];
}

export const DashboardStaticsCountsPerMonthByDomain = ({ data }: Props) => {
  const { colorMode } = useColorMode();

  const domains = env.NEXT_PUBLIC_DOMAINS?.split(',') ?? [];

  const countsPerDay = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: '장비별 월간 로그 총 수집량',
      },
      data,
      series: domains.map((domain: string) => ({
        type: 'bar',
        xKey: 'time',
        yKey: domain,
        stackGroup: 'domain',
        legendItemName: domain,
        yName: domain,
      })),
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
          keys: domains,
          title: {
            text: 'Total',
          },
        },
        {
          position: 'right',
          type: 'number',
          keys: ['countsPerMonthByDomain'],
          title: {
            text: 'Counts Per Month By Domain',
          },
        },
      ],
      height: 270,
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
      colSpan={3}
      overflow="hidden"
      height={{
        base: '270px',
        sm: '270px',
        md: '270px',
        lg: '270px',
        xl: '270px',
      }}
    >
      <AgChartsThemeChanged colorMode={colorMode} options={countsPerDay} />
    </GridItem>
  );
};
