import React from 'react';

import { Grid, Text } from '@chakra-ui/react';

import { trpc } from '@/lib/trpc/client';

import { CpuUsageCard } from './statics/cards/CpuUsageCard';
import { DaemonStatusCard } from './statics/cards/DaemonStatusCard';
import { DailyTotalCard } from './statics/cards/DailyTotalCard';
import { DiskUsageCard } from './statics/cards/DiskUsageCard';
import { LogsPerSecondCard } from './statics/cards/LogsPerSecondCard';
import { MemoryUsageCard } from './statics/cards/MemoryUsageCard';
import { DashboardStaticsCountsPer10Days } from './statics/charts/DashboardStaticsCountsPer10Days';
import { DashboardStaticsCountsPerDayHourse } from './statics/charts/DashboardStaticsCountsPerDayHourse';
import { DashboardStaticsCountsPerMonth } from './statics/charts/DashboardStaticsCountsPerMonth';
import { DashboardStaticsCountsPerMonthByDomain } from './statics/charts/DashboardStaticsCountsPerMonthByDomain';

export const DashboardStatics = () => {
  const getChartMetrics = trpc.dashboard.getChartMetrics.useQuery();
  const getSystemMetrics = trpc.dashboard.getSystemMetrics.useQuery();
  const getLogMetrics = trpc.dashboard.getLogMetrics.useQuery();
  const cpuUsage = getSystemMetrics.data?.cpu_usage;
  const memoryUsage = getSystemMetrics.data?.memory_usage;
  const diskUsage = getSystemMetrics.data?.disk;
  const daemonStatus = getSystemMetrics.data?.daemon_status;

  const logsPerSecond = getLogMetrics.data?.logs_per_second;
  const logsPerDay = getLogMetrics.data?.logs_per_day;

  return (
    <Grid
      height="80vh"
      gap={3}
      templateColumns={{
        base: 'repeat(1, 6fr)',
        sm: 'repeat(2, 6fr)',
        md: 'repeat(3, 3fr)',
        lg: 'repeat(4, 2fr)',
        xl: 'repeat(6, 2fr)',
      }}
    >
      <LogsPerSecondCard logsPerSecond={logsPerSecond || 0} />
      <DailyTotalCard logsPerDay={logsPerDay || 0} />
      <DiskUsageCard diskUsage={diskUsage || { total: 0, used: 0, usage: 0 }} />
      <CpuUsageCard cpuUsage={cpuUsage || 0} />
      <MemoryUsageCard memoryUsage={memoryUsage || 0} />
      <DaemonStatusCard
        daemonStatus={daemonStatus || { dbms: 'inactive', parser: 'inactive' }}
      />
      <DashboardStaticsCountsPerDayHourse
        data={getChartMetrics.data?.hourly_totals ?? []}
      />
      <DashboardStaticsCountsPer10Days
        data={getChartMetrics.data?.last_10_days_daily_totals ?? []}
      />
      <DashboardStaticsCountsPerMonth
        data={getChartMetrics.data?.monthly_totals ?? []}
      />
      <DashboardStaticsCountsPerMonthByDomain
        data={getChartMetrics.data?.domain_monthly_totals ?? []}
      />
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
