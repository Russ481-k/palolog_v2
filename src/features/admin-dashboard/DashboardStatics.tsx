import React, { useMemo, useRef, useState } from 'react';

import { Grid, GridItem, Text, useColorMode } from '@chakra-ui/react';
import {
  AgChartOptions,
  AgDonutSeriesOptions,
  AgLineSeriesOptions,
} from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';

import { trpc } from '@/lib/trpc/client';

import { zLogs } from '../monitoring/schemas';

export const DashboardStatics = () => {
  const getCpuUsageData = trpc.dashboard.getCpuUsage.useInfiniteQuery({});
  const getDiskUsageData = trpc.dashboard.getDiskUsage.useInfiniteQuery({});
  const getMemoryUsageData = trpc.dashboard.getMemoryUsage.useInfiniteQuery({});

  console.log('getDiskUsageData : ', getDiskUsageData.data?.pages[0]);

  const cpuUsageData = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'CPU Usage',
      },
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
          yKey: 'core_2',
          yName: 'core_2',
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
      height: 400,
    }),
    [getCpuUsageData]
  );

  const diskUsageData = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'Disk Usage',
      },
      data: getDiskUsageData.data?.pages[0],
      // Series: Defines which chart type and data to use
      series: [
        {
          type: 'line',
          xKey: 'time',
          yKey: 'usagePercentage',
          yName: 'used',
          marker: {
            enabled: false,
          },
          interpolation: {
            type: 'smooth',
          },
        } as AgLineSeriesOptions,
      ],
      height: 400,
    }),
    [getDiskUsageData]
  );

  const memoryUsageData = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'Memory Usage',
      },
      data: getMemoryUsageData.data?.pages[0],
      series: [
        {
          type: 'line',
          xKey: 'time',
          yKey: 'usagePercentage',
          yName: 'used',
          interpolation: {
            type: 'smooth',
          },
          marker: {
            enabled: false,
          },
        } as AgLineSeriesOptions,
      ],
      height: 400,
    }),
    [getMemoryUsageData]
  );

  const [collectionsCounts] = useState<AgChartOptions>({
    theme: 'ag-polychroma',
    title: {
      text: 'Collections Counts',
    },
    subtitle: {
      text: String(dayjs().format('YYYY-MM-DD HH:mm:ss')),
    },
    // Data: Data to be displayed in the chart
    data: [
      {
        quarter: 'Q1',
        petrol: 200,
        diesel: 100,
      },
      {
        quarter: 'Q2',
        petrol: 300,
        diesel: 130,
      },
      {
        quarter: 'Q3',
        petrol: 350,
        diesel: 160,
      },
      {
        quarter: 'Q4',
        petrol: 400,
        diesel: 200,
      },
    ],
    // Series: Defines which chart type and data to use
    series: [
      {
        type: 'line',
        xKey: 'quarter',
        yKey: 'petrol',
        yName: 'Petrol',
      } as AgLineSeriesOptions,
      {
        type: 'line',
        xKey: 'quarter',
        yKey: 'diesel',
        yName: 'Diesel',
      } as AgLineSeriesOptions,
    ],
    height: 400,
  });
  const [threatLogData] = useState<AgChartOptions>({
    theme: 'ag-polychroma',
    title: {
      text: 'Threat LogData',
    },
    subtitle: {
      text: 'Top Categories',
    },
    // Data: Data to be displayed in the chart
    data: [
      { asset: 'Critical', amount: 60000 },
      { asset: 'High', amount: 40000 },
      { asset: 'Medium', amount: 7000 },
      { asset: 'Low', amount: 5000 },
      { asset: 'Informational', amount: 3000 },
    ],
    // Series: Defines which chart type and data to use
    series: [
      {
        type: 'donut',
        calloutLabelKey: 'asset',
        angleKey: 'amount',
        innerRadiusRatio: 0.7,
      } as AgDonutSeriesOptions,
    ],
  });
  const { colorMode } = useColorMode();

  const gridRef = useRef<AgGridReact<ColDef<zLogs>[]>>(null);

  const AgChartsThemeChanged = ({ options }: { options: AgChartOptions }) => {
    if (colorMode === 'light') {
      options.theme = 'ag-polychroma';
    } else if (colorMode === 'dark') {
      options.theme = 'ag-polychroma-dark';
    }
    return <AgCharts options={options} />;
  };

  return (
    <Grid
      height="80vh"
      gap={3}
      templateColumns={{
        base: 'repeat(1, 6fr)',
        sm: 'repeat(1, 6fr)',
        md: 'repeat(2, 3fr)',
        lg: 'repeat(3, 2fr)',
        xl: 'repeat(4, 2fr)',
      }}
    >
      <GridItem
        borderRadius="md"
        bg="blackAlpha.200"
        colSpan={1}
        overflow="hidden"
        height={{
          base: '400px',
          sm: '400px',
          md: '400px',
          lg: '400px',
          xl: '400px',
        }}
      >
        <AgChartsThemeChanged options={cpuUsageData} />
      </GridItem>
      <GridItem
        borderRadius="md"
        bg="blackAlpha.200"
        colSpan={1}
        overflow="hidden"
        height={{
          base: '400px',
          sm: '400px',
          md: '400px',
          lg: '400px',
          xl: '400px',
        }}
      >
        <AgChartsThemeChanged options={diskUsageData} />
      </GridItem>
      <GridItem
        borderRadius="md"
        bg="blackAlpha.200"
        colSpan={1}
        overflow="hidden"
        height={{
          base: '400px',
          sm: '400px',
          md: '400px',
          lg: '400px',
          xl: '400px',
        }}
      >
        <AgChartsThemeChanged options={memoryUsageData} />
      </GridItem>
      <GridItem
        borderRadius="md"
        bg="blackAlpha.200"
        colSpan={1}
        overflow="hidden"
        height={{
          base: '400px',
          sm: '400px',
          md: '400px',
          lg: '400px',
          xl: '400px',
        }}
      >
        <AgChartsThemeChanged options={collectionsCounts} />
      </GridItem>
      <GridItem
        borderRadius="md"
        bg="blackAlpha.200"
        colSpan={{
          base: 1,
          sm: 1,
          md: 1,
          lg: 1,
          xl: 3,
        }}
        overflow="hidden"
      >
        <div
          className={
            colorMode === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark'
          }
          style={{ width: '100%', height: '300px', zIndex: 0 }}
        >
          {/*//@ts-expect-error Note: AgGridReact타입 충돌 예방으로 ts-expect-error 를 사용*/}
          <AgGridReact
            ref={gridRef}
            rowData={[]}
            columnDefs={[
              {
                headerName: 'No',
                field: 'no',
                width: 60,
              },
              {
                headerName: 'Message',
                field: 'message',
                sortable: true,
                filter: true,
                flex: 1,
              },
              {
                headerName: 'Time',
                field: 'time',
                sortable: true,
                filter: true,
                width: 250,
                valueFormatter: (params: ValueFormatterParams) =>
                  dayjs(params.value).format('YYYY-MM-DD HH:mm:ss'),
              },
            ]}
          />
        </div>
      </GridItem>

      <GridItem borderRadius="md" bg="blackAlpha.200" overflow="hidden">
        <AgChartsThemeChanged options={threatLogData} />
      </GridItem>
      <Text
        fontSize="xs"
        gridColumn="1/-1"
        textAlign="center"
        color="gray.500"
        style={{ textWrap: 'balance' }}
      >
        Copyright 2024. Yun Su-Bin all rights reserved.
      </Text>
    </Grid>
  );
};
