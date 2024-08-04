import React, { useMemo, useRef } from 'react';

import {
  Flex,
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorMode,
} from '@chakra-ui/react';
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
  const getCollectionsCounts =
    trpc.dashboard.getCollectionsCounts.useInfiniteQuery({});
  const getThreatLogData = trpc.dashboard.getThreatLogData.useInfiniteQuery({});

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

  const collectionsCounts = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'Collections Counts',
      },
      interpolation: {
        type: 'smooth',
      },
      data: getCollectionsCounts.data?.pages[0],
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
    }),
    [getCollectionsCounts]
  );

  const threatLogData = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
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
      data: getThreatLogData.data?.pages[0],
      // Series: Defines which chart type and data to use
      series: [
        {
          type: 'donut',
          calloutLabelKey: 'asset',
          angleKey: 'amount',
          innerRadiusRatio: 0.7,
        } as AgDonutSeriesOptions,
      ],
      height: 400,
    }),
    [getThreatLogData]
  );

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
        borderRadius="lg"
        bg="blackAlpha.200"
        borderWidth={1}
        borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
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
        borderRadius="lg"
        bg="blackAlpha.200"
        borderWidth={1}
        borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
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
        borderRadius="lg"
        bg="blackAlpha.200"
        borderWidth={1}
        borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
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
        borderRadius="lg"
        bg="blackAlpha.200"
        borderWidth={1}
        borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
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
        borderRadius="lg"
        bg="blackAlpha.200"
        borderWidth={1}
        borderColor={colorMode === 'light' ? 'gray.200' : 'whiteAlpha.300'}
        colSpan={{
          base: 1,
          sm: 1,
          md: 1,
          lg: 1,
          xl: 3,
        }}
        overflow="hidden"
        height={{
          base: '400px',
          sm: '400px',
          md: '400px',
          lg: '400px',
          xl: '400px',
        }}
      >
        <Flex flexDir="column">
          <Tabs
            size="md"
            colorScheme="facebook"
            bgColor={colorMode === 'light' ? 'white' : ''}
          >
            <TabList>
              <Tab>Rescent 20 Rows</Tab>
              <Tab>Critical Rescent 7 Days</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} pt={1}>
                <div
                  className={
                    colorMode === 'light'
                      ? 'ag-theme-quartz'
                      : 'ag-theme-quartz-dark'
                  }
                  style={{
                    width: '100%',
                    height: '352px',
                    zIndex: 0,
                  }}
                >
                  {/*//@ts-expect-error Note: AgGridReact타입 충돌 예방으로 ts-expect-error 를 사용*/}
                  <AgGridReact
                    ref={gridRef}
                    rowData={[]}
                    columnDefs={[
                      {
                        headerName: 'No',
                        field: 'no',
                        width: 80,
                      },
                      {
                        headerName: 'Receive Time',
                        field: 'time',
                        sortable: true,
                        filter: true,
                        width: 170,
                        valueFormatter: (params: ValueFormatterParams) =>
                          dayjs(params.value).format('YYYY-MM-DD HH:mm:ss'),
                      },
                      {
                        headerName: 'Device Name',
                        field: 'DEVICE_NAME',
                        sortable: true,
                        filter: true,
                        width: 160,
                      },
                      {
                        headerName: 'Message',
                        field: 'message',
                        filter: true,
                        flex: 1,
                      },
                    ]}
                  />
                </div>
              </TabPanel>
              <TabPanel p={0}>
                <div
                  className={
                    colorMode === 'light'
                      ? 'ag-theme-quartz'
                      : 'ag-theme-quartz-dark'
                  }
                  style={{
                    width: '100%',
                    height: '352px',
                    zIndex: 0,
                    borderRadius: 0,
                    borderWidth: 0,
                  }}
                >
                  {/*//@ts-expect-error Note: AgGridReact타입 충돌 예방으로 ts-expect-error 를 사용*/}
                  <AgGridReact
                    ref={gridRef}
                    rowData={[]}
                    columnDefs={[
                      {
                        headerName: 'No',
                        field: 'no',
                        width: 80,
                      },
                      {
                        headerName: 'Receive Time',
                        field: 'time',
                        sortable: true,
                        filter: true,
                        width: 170,
                        valueFormatter: (params: ValueFormatterParams) =>
                          dayjs(params.value).format('YYYY-MM-DD HH:mm:ss'),
                      },
                      {
                        headerName: 'Device Name',
                        field: 'DEVICE_NAME',
                        sortable: true,
                        filter: true,
                        width: 160,
                      },
                      {
                        headerName: 'Message',
                        field: 'message',
                        filter: true,
                        flex: 1,
                      },
                    ]}
                    style={{ borderRadius: 0, borderWidth: 0 }}
                  />
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </GridItem>
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
