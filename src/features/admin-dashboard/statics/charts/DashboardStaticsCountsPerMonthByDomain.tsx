import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions } from 'ag-charts-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';
import { trpc } from '@/lib/trpc/client';

interface Props {
  data: Record<string, string | number>[];
}

export const DashboardStaticsCountsPerMonthByDomain = ({ data }: Props) => {
  const { colorMode } = useColorMode();
  const { data: domains = { domains: [] } } =
    trpc.dashboard.getDomains.useQuery();

  const countsPerDay = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: '장비별 월간 로그 총 수집량',
      },
      data,
      series: domains.domains.map((domain: string) => ({
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
          type: 'number',
          position: 'left',
          label: {
            formatter: (params) => {
              return `${(params.value / 1000000).toFixed(1)}M`;
            },
          },
          keys: domains.domains,
          title: {
            text: 'Total',
          },
        },
        {
          type: 'number',
          position: 'right',
          keys: ['countsPerMonthByDomain'],
          title: {
            text: 'Counts Per Month By Domain',
          },
        },
      ],
      height: 270,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, domains, colorMode]
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
