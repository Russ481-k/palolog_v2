import React, { useMemo } from 'react';

import { GridItem, useColorMode } from '@chakra-ui/react';
import { AgChartOptions, AgDonutSeriesOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { trpc } from '@/lib/trpc/client';

export const DashboardStaticsThreatLogData = () => {
  const getThreatLogData = trpc.dashboard.getThreatLogData.useInfiniteQuery({});

  const { colorMode } = useColorMode();

  const AgChartsThemeChanged = ({ options }: { options: AgChartOptions }) => {
    if (colorMode === 'light') {
      options.theme = 'ag-polychroma';
    } else if (colorMode === 'dark') {
      options.theme = 'ag-polychroma-dark';
    }
    return <AgCharts options={options} />;
  };

  const threatLogData = useMemo<AgChartOptions>(
    () => ({
      title: {
        text: 'Threat LogData',
      },
      interpolation: {
        type: 'smooth',
      },
      subtitle: {
        text: 'Top Categories',
      },
      // Data: Data to be displayed in the chart
      data: getThreatLogData.data?.pages[0]?.pop(),
      // Series: Defines which chart type and data to use
      series: [
        {
          type: 'donut',
          calloutLabelKey: 'severity',
          angleKey: 'amount',
          innerRadiusRatio: 0.7,
        } as AgDonutSeriesOptions,
      ],
      innerLabels: [
        {
          text: 'Memory used percentage',
          fontWeight: 'bold',
        },
        {
          text: String(getThreatLogData.data?.pages[0]?.pop()),
          spacing: 4,
          fontSize: 42,
        },
      ],
      height: 400,
    }),
    [getThreatLogData]
  );

  return (
    <GridItem
      borderRadius="lg"
      bg="blackAlpha.200"
      borderWidth={1}
      borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
      overflow="hidden"
      height={{
        base: '400px',
        sm: '400px',
        md: '400px',
        lg: '400px',
        xl: '400px',
      }}
    >
      <AgChartsThemeChanged options={threatLogData} />
    </GridItem>
  );
};
