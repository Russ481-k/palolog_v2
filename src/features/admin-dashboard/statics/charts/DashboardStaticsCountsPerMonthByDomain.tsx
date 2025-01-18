import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions } from 'ag-charts-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { AgChartsThemeChanged } from '@/components/AgChartsThemeChanged';

interface DomainData {
  domain: string;
  data: Array<{
    time: string;
    total: number;
  }>;
}

export const DashboardStaticsCountsPerMonthByDomain = ({
  data,
}: {
  data: DomainData[];
}) => {
  const { colorMode } = useColorMode();

  const chartData = useMemo(() => {
    // 모든 시간대 추출
    const timeSet = new Set<string>();
    data?.forEach((domain) => {
      domain.data?.forEach((item) => timeSet.add(item.time));
    });
    const times = Array.from(timeSet).sort();

    // 차트 데이터 구성
    return times.map((time) => {
      const entry: Record<string, string | number> = { time };
      data?.forEach((domain) => {
        const monthData = domain.data.find((d) => d.time === time);
        entry[domain.domain] = monthData?.total ?? 0;
      });
      return entry;
    });
  }, [data]);

  const countsPerDay = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: '장비별 월간 로그 총 수집량',
      },
      data: chartData,
      series: data.map((domain) => ({
        type: 'bar',
        xKey: 'time',
        yKey: domain.domain,
        stacked: true,
        yName: domain.domain,
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
          title: {
            text: 'Total (M)',
          },
        },
      ],
      legend: {
        position: 'bottom',
      },
      height: 480,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, chartData, colorMode]
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
