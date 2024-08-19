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
  const getCountsPerSec = trpc.dashboard.getCountsPerSec.useInfiniteQuery({});
  const getCountsPerDay = trpc.dashboard.getCountsPerDay.useInfiniteQuery({});
  const getThreatLogData = trpc.dashboard.getThreatLogData.useInfiniteQuery({});
  const getSystemLog = trpc.dashboard.getSystemLog.useInfiniteQuery({});

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
  const cpuUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      data: [
        {
          asset: 'available',
          amount:
            100 - (getCpuUsageData.data?.pages?.[0]?.[0]?.total_usage ?? 0),
        },
        {
          asset: 'used',
          amount: getCpuUsageData.data?.pages?.[0]?.[0]?.total_usage,
        },
      ],
      title: {
        text: 'CPU Usage',
      },
      series: [
        {
          type: 'donut',
          calloutLabelKey: 'asset',
          angleKey: 'amount',
          innerRadiusRatio: 0.85,
          innerLabels: [
            {
              text: 'CPU used percentage',
              fontWeight: 'bold',
            },
            {
              text:
                String(
                  getCpuUsageData.data?.pages?.[0]?.[0]?.total_usage ?? 0
                ) + '%',
              spacing: 4,
              fontSize: 42,
            },
          ],
        },
      ],
      height: 400,
    }),
    [getCpuUsageData]
  );
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
      axes: [
        {
          type: 'category',
          position: 'bottom',
        },
        {
          type: 'number',
          position: 'left',
          label: {
            format: '#{.1f}%',
          },
          title: {
            text: 'Usage Percentage',
          },
        },
      ],
      height: 400,
    }),
    [getCpuUsageData]
  );

  const diskUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'Disk Usage',
      },
      data: [
        {
          asset: 'available',
          amount:
            100 -
            (getDiskUsageData.data?.pages?.[0]?.[0]?.usagePercentage ?? 0),
        },
        {
          asset: 'used',
          amount: getDiskUsageData.data?.pages?.[0]?.[0]?.usagePercentage,
        },
      ],
      series: [
        {
          type: 'donut',
          calloutLabelKey: 'asset',
          angleKey: 'amount',
          innerRadiusRatio: 0.85,
          innerLabels: [
            {
              text: 'Disk used percentage',
              fontWeight: 'bold',
            },
            {
              text:
                String(
                  getDiskUsageData.data?.pages?.[0]?.[0]?.usagePercentage ?? 0
                ) + '%',
              spacing: 4,
              fontSize: 42,
            },
          ],
        },
      ],
      height: 400,
    }),
    [getDiskUsageData]
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
          yName: 'usagePercentage',
          marker: {
            enabled: false,
          },
          interpolation: {
            type: 'smooth',
          },
        } as AgLineSeriesOptions,
      ],
      axes: [
        {
          type: 'category',
          position: 'bottom',
        },
        {
          type: 'number',
          position: 'left',
          label: {
            format: '#{.1f}%',
          },
          title: {
            text: 'Usage Percentage',
          },
        },
      ],
      height: 400,
    }),
    [getDiskUsageData]
  );

  const memoryUsageDataDonut = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
      title: {
        text: 'Memory Usage',
      },
      data: [
        {
          asset: 'available',
          amount:
            100 -
            (getMemoryUsageData.data?.pages?.[0]?.[0]?.usagePercentage ?? 0),
        },
        {
          asset: 'used',
          amount: getMemoryUsageData.data?.pages?.[0]?.[0]?.usagePercentage,
        },
      ],
      series: [
        {
          type: 'donut',
          calloutLabelKey: 'asset',
          angleKey: 'amount',
          innerRadiusRatio: 0.85,
          innerLabels: [
            {
              text: 'Memory used percentage',
              fontWeight: 'bold',
            },
            {
              text:
                String(
                  getMemoryUsageData.data?.pages?.[0]?.[0]?.usagePercentage ?? 0
                ) + '%',
              spacing: 4,
              fontSize: 42,
            },
          ],
        },
      ],
      height: 400,
    }),
    [getMemoryUsageData]
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
          yName: 'usagePercentage',
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
          type: 'number',
          position: 'left',
          label: {
            format: '#{.1f}%',
          },
          title: {
            text: 'Usage Percentage',
          },
        },
      ],
      height: 400,
    }),
    [getMemoryUsageData]
  );

  const countsPerSec = useMemo<AgChartOptions>(
    () => ({
      theme: 'ag-polychroma',
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
      theme: 'ag-polychroma',
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
        <AgChartsThemeChanged options={cpuUsageDataDonut} />
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
          base: '800px',
          sm: '800px',
          md: '800px',
          lg: '800px',
          xl: '800px',
        }}
      >
        <AgChartsThemeChanged options={diskUsageDataDonut} />
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
          base: '800px',
          sm: '800px',
          md: '800px',
          lg: '800px',
          xl: '800px',
        }}
      >
        <AgChartsThemeChanged options={memoryUsageDataDonut} />
        <AgChartsThemeChanged options={memoryUsageData} />
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
                  <AgGridReact
                    ref={gridRef}
                    rowData={getSystemLog.data?.pages[0]?.recent20Rows ?? []}
                    columnDefs={[
                      {
                        headerName: 'Receive Time',
                        field: 'receiveTime',
                        sortable: true,
                        filter: true,
                        width: 170,
                        valueFormatter: (params: ValueFormatterParams) =>
                          dayjs(params.value / 1000000).format(
                            'YYYY-MM-DD HH:mm:ss'
                          ),
                      },
                      {
                        headerName: 'Device Name',
                        field: 'deviceName',
                        sortable: true,
                        filter: true,
                        width: 160,
                      },
                      {
                        headerName: 'Serial Number',
                        field: 'serial',
                        filter: true,
                        width: 160,
                      },
                      {
                        headerName: 'Description',
                        field: 'description',
                        filter: true,
                        flex: 1,
                      },
                    ]}
                  />
                </div>
              </TabPanel>
              <TabPanel p={0} pt={1}>
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
                  <AgGridReact
                    ref={gridRef}
                    rowData={getSystemLog.data?.pages[0]?.critical7Days ?? []}
                    columnDefs={[
                      {
                        headerName: 'Receive Time',
                        field: 'receiveTime',
                        sortable: true,
                        filter: true,
                        width: 170,
                        valueFormatter: (params: ValueFormatterParams) =>
                          dayjs(params.value / 1000000).format(
                            'YYYY-MM-DD HH:mm:ss'
                          ),
                      },
                      {
                        headerName: 'Device Name',
                        field: 'deviceName',
                        sortable: true,
                        filter: true,
                        width: 160,
                      },
                      {
                        headerName: 'Serial Number',
                        field: 'serial',
                        filter: true,
                        flex: 1,
                      },
                      {
                        headerName: 'Description',
                        field: 'description',
                        filter: true,
                        flex: 1,
                      },
                    ]}
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
