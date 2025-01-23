import React, { useMemo } from 'react';

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

  const encryptedCopyright = useMemo(() => {
    const text = [
      67, 111, 112, 121, 114, 105, 103, 104, 116, 32, 50, 48, 50, 52, 46, 32,
      89, 117, 110, 32, 83, 117, 45, 66, 105, 110, 32, 97, 108, 108, 32, 114,
      105, 103, 104, 116, 115, 32, 114, 101, 115, 101, 114, 118, 101, 100, 46,
    ];
    const key = [19, 28, 37, 46, 55, 64, 73, 82, 91];
    return (
      text
        // @ts-expect-error don't want to implement
        .map((char, i) => String.fromCharCode(char ^ key[i % key.length]))
        .join('')
    );
  }, []);

  const warning = useMemo(() => {
    if (!encryptedCopyright) return '';
    const text = encryptedCopyright
      ?.split('')
      .map((char) => char.charCodeAt(0));
    const key = [19, 28, 37, 46, 55, 64, 73, 82, 91];
    if (!text) return '';
    return (
      text
        // @ts-expect-error don't want to implement
        .map((char, i) => String.fromCharCode(char ^ key[i % key.length]))
        .join('')
    );
  }, [encryptedCopyright]);

  return (
    <Grid
      height="100%"
      minHeight="60vh"
      gap={3}
      templateColumns={{
        base: 'repeat(1, 6fr)',
        sm: 'repeat(2, 6fr)',
        md: 'repeat(3, 2fr)',
        lg: 'repeat(3, 2fr)',
        xl: 'repeat(6, 1fr)',
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
      <Text fontSize="xs" gridColumn="1/-1" textAlign="center" color="gray.500">
        {warning}
      </Text>
    </Grid>
  );
};
