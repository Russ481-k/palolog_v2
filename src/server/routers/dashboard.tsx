import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { NextResponse } from 'next/server';
import os from 'os';
import { z } from 'zod';

import { env } from '@/env.mjs';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

import { searchOpenSearchWithScroll } from './projects';

// Dayjs 설정
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

// 전역 상수
export const prisma = new PrismaClient();
const now = dayjs().tz('Asia/Seoul').subtract(10, 'second');

// 타입 정의
interface OpenSearchHitsResponse {
  scrollResponse: {
    hits: {
      total: {
        value: number;
      };
      hits: Array<{
        _source: Record<string, string>;
      }>;
    };
  };
}

// 시스템 모니터링 관련 함수
async function getDiskUsage(): Promise<number> {
  return new Promise((resolve) => {
    exec("df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1", (_, stdout) =>
      resolve(Number(stdout.trim()) || 0)
    );
  });
}

async function checkDaemonStatus(): Promise<{
  dbms: 'active' | 'inactive';
  parser: 'active' | 'inactive';
}> {
  return new Promise((resolve) => {
    exec(
      "docker inspect opensearch | jq '.[0].State.Health.Status'",
      (_, stdout) => {
        const dbmsActive =
          stdout.trim() === `"healthy"` ? 'active' : 'inactive';
        exec(
          "docker inspect logstash | jq '.[0].State.Status'",
          (_, stdout) => {
            const parserActive =
              stdout.trim() === `"running"` ? 'active' : 'inactive';
            resolve({ dbms: dbmsActive, parser: parserActive });
          }
        );
      }
    );
  });
}

// 로그 수집 관련 함수
async function getLogCountFromOpenSearch() {
  const oneMinuteAgo = now.subtract(1, 'minute');
  const domains = env.DOMAINS?.split(',') ?? [];

  for (const domain of domains) {
    try {
      const query = {
        size: 1,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: oneMinuteAgo.toISOString(),
                    lt: now.toISOString(),
                    format: 'strict_date_optional_time',
                    time_zone: '+09:00',
                  },
                },
              },
              { match: { domain } },
            ],
          },
        },
      };

      const totalDomainResult = (await searchOpenSearchWithScroll(
        query,
        now.format('YYYY.MM.DD')
      )) as { scrollResponse: { hits: { total: { value: number } } } };

      if (!totalDomainResult.scrollResponse) {
        console.error(
          `Error fetching logs for host ${domain}:`,
          totalDomainResult
        );
        continue;
      }

      const count = totalDomainResult.scrollResponse.hits.total.value ?? 0;
      await insertLogCount(domain, count);
    } catch (error) {
      console.error(`Error collecting log counts for host ${domain}:`, error);
    }
  }
}

async function insertLogCount(domain: string, count: number) {
  await prisma.logCount.create({
    data: { domain, count, timestamp: now.toISOString() },
  });
}

// 데이터 집계 관련 함수
async function aggregateHourlyLogs() {
  const previousHour = now.subtract(1, 'hour').startOf('hour');
  const currentHour = now.startOf('hour');
  await aggregateLogs(previousHour, currentHour);
}

async function aggregateDailyLogs() {
  const previousDay = now.subtract(1, 'day').startOf('day');
  const currentDay = now.startOf('day');
  await aggregateLogs(previousDay, currentDay);
}

async function aggregateMonthlyLogs() {
  const previousMonth = now.subtract(1, 'month').startOf('month');
  const currentMonth = now.startOf('month');
  await aggregateLogs(previousMonth, currentMonth);
}

async function aggregateLogs(startTime: dayjs.Dayjs, endTime: dayjs.Dayjs) {
  const logCounts = await prisma.logCount.groupBy({
    by: ['domain'],
    where: {
      timestamp: {
        gte: startTime.toDate(),
        lt: endTime.toDate(),
      },
    },
    _sum: { count: true },
  });

  await prisma.$transaction([
    prisma.logCount.deleteMany({
      where: {
        timestamp: {
          gte: startTime.toDate(),
          lt: endTime.toDate(),
        },
      },
    }),
    ...logCounts.map((log) =>
      prisma.logCount.create({
        data: {
          domain: log.domain,
          count: log._sum.count ?? 0,
          timestamp: startTime.toDate(),
        },
      })
    ),
  ]);
}

// 디스크 관리 관련 함수
async function checkDiskUsageAndDeleteOldLogs() {
  let diskUsage = await getDiskUsage();
  if (diskUsage >= 80) {
    console.log('Disk usage is above 80%. Deleting old log counts...');
    while (diskUsage >= 70) {
      await deleteOldestLogCounts();
      diskUsage = await getDiskUsage();
    }
    console.log('Disk usage is now below 70%.');
  }
}

async function deleteOldestLogCounts() {
  const oldestIndex = await getOldestIndexName();
  if (oldestIndex) {
    await deleteIndex(oldestIndex);
    console.log(`Deleted index ${oldestIndex}`);
  }
}

async function getOldestIndexName(): Promise<string | undefined> {
  const indices = await listIndices();
  return indices.sort((a, b) => dayjs(a).unix() - dayjs(b).unix())[0];
}

async function listIndices(): Promise<string[]> {
  const response = await fetch('https://localhost:9200/_cat/indices?v&pretty', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
    },
  });
  const data = await response.json();
  return data.map((index: { index: string }) => index.index);
}

async function deleteIndex(indexName: string) {
  const response = await fetch(`https://localhost:9200/${indexName}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64'),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to delete index ${indexName}`);
  }
}

// 1분마다 디스크 용량 체크
setInterval(async () => {
  try {
    await checkDiskUsageAndDeleteOldLogs();
  } catch (error) {
    console.error('Error checking disk usage:', error);
  }
}, 60 * 1000);

// 초기 로그 카운트 수집
setInterval(async () => {
  try {
    await getLogCountFromOpenSearch();
  } catch (error) {
    console.error('Error collecting log counts:', error);
  }
}, 60 * 1000);

// 스케줄러 설정
setInterval(async () => {
  // 매 시간 정각
  if (now.minute() === 0) {
    try {
      await aggregateHourlyLogs();
    } catch (error) {
      console.error('Error aggregating hourly logs:', error);
    }
  }

  // 매일 00시
  if (now.hour() === 0 && now.minute() === 0) {
    try {
      await aggregateDailyLogs();
    } catch (error) {
      console.error('Error aggregating daily logs:', error);
    }
  }

  // 매월 1일 00시
  if (now.date() === 1 && now.hour() === 0 && now.minute() === 0) {
    try {
      await aggregateMonthlyLogs();
    } catch (error) {
      console.error('Error aggregating monthly logs:', error);
    }
  }
}, 60 * 1000); // 1분마다 체크

export const dashboardRouter = createTRPCRouter({
  // 시스템 메트릭스 조회
  getSystemMetrics: protectedProcedure()
    .output(
      z.object({
        cpu_usage: z.number(),
        memory_usage: z.number(),
        disk_usage: z.number(),
        daemon_status: z.object({
          dbms: z.enum(['active', 'inactive']),
          parser: z.enum(['active', 'inactive']),
        }),
      })
    )
    .query(async () => {
      const cpuUsage = os.loadavg()[0] ?? 0;
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      const diskUsage = await getDiskUsage(); // Function to get disk usage
      const daemon_status = await checkDaemonStatus(); // Function to check daemon status

      return {
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        daemon_status: daemon_status,
      };
    }),

  // 로그 트릭스 조회
  getLogMetrics: protectedProcedure()
    .output(
      z.object({
        logs_per_second: z.number(),
        logs_per_day: z.number(),
      })
    )
    .query(async () => {
      const oneSecondAgo = now.subtract(2, 'second');

      const logsPerSecondQuery = {
        size: 1024,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: oneSecondAgo.toISOString(),
                    lt: now.toISOString(),
                    format: 'strict_date_optional_time',
                    time_zone: '+09:00',
                  },
                },
              },
            ],
          },
        },
      };
      const logsPerSecondResult = (await searchOpenSearchWithScroll(
        logsPerSecondQuery,
        now.format('YYYY.MM.DD')
      )) as OpenSearchHitsResponse;
      const logsPerSecond = Math.round(
        logsPerSecondResult.scrollResponse.hits.total.value / 2
      );
      const logsPerDay = await new Promise<number>((resolve) => {
        const command = `curl -X GET "https://localhost:9200/logstash-logs-${now.format('YYYY.MM.DD')}/_count" -u "admin:admin" --insecure`;
        exec(command, (error, stdout) => {
          if (error) {
            resolve(0);
            return;
          }
          try {
            const result = JSON.parse(stdout);
            resolve(result.count || 0);
          } catch (e) {
            resolve(0);
          }
        });
      });
      return { logs_per_second: logsPerSecond, logs_per_day: logsPerDay };
    }),

  getChartMetrics: protectedProcedure()
    .output(
      z.object({
        hourly_totals: z.array(
          z.object({ time: z.string(), total: z.number() })
        ),
        last_10_days_daily_totals: z.array(
          z.object({
            time: z.string(),
            total: z.number(),
          })
        ),
        monthly_totals: z.array(
          z.object({ time: z.string(), total: z.number() })
        ),
        domain_monthly_totals: z.array(
          z.record(z.union([z.string(), z.number()]))
        ),
      })
    )
    .query(async () => {
      const monthStart = now.subtract(1, 'month').startOf('month').toDate();
      const last10DaysStart = now.subtract(10, 'days').startOf('day').toDate();
      const last24HoursStart = now
        .subtract(24, 'hours')
        .startOf('hour')
        .toDate();

      // Fetch logs for the last 24 hours
      const logsLast24Hours = await prisma.logCount.findMany({
        where: {
          timestamp: {
            gte: last24HoursStart, // Use Date object
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      // Calculate hourly totals in chronological order
      const hourlyTotals = logsLast24Hours.reduce(
        (acc, log) => {
          const hour = dayjs(log.timestamp)
            .tz('Asia/Seoul')
            .format('YYYY-MM-DD HH:00'); // Format to hour in KST
          acc[hour] = (acc[hour] || 0) + log.count; // Increment count
          return acc;
        },
        {} as Record<string, number>
      );
      // Convert to array format in chronological order
      const hourlyMetrics = Object.entries(hourlyTotals)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([hour, count]) => ({
          hour,
          count,
        }));

      // Fetch daily totals for the last 10 days
      const last10DaysDailyTotals = await prisma.logCount.findMany({
        where: {
          timestamp: {
            gte: last10DaysStart,
            lt: now.toDate(),
          },
        },
      });

      const dailyCounts = last10DaysDailyTotals.reduce(
        (acc, log) => {
          const date = dayjs(log.timestamp)
            .tz('Asia/Seoul')
            .format('YYYY-MM-DD'); // Format to date in KST
          acc[date] = (acc[date] || 0) + log.count; // Increment count
          return acc;
        },
        {} as Record<string, number>
      );
      const last10DaysDailyMetrics = Object.entries(dailyCounts)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, count]) => ({
          date,
          count,
        }));

      // Fetch monthly totals
      const monthlyTotals = await prisma.logCount.findMany({
        where: {
          timestamp: {
            gte: monthStart,
            lt: now.toDate(),
          },
        },
      });
      const monthlyCounts = monthlyTotals.reduce(
        (acc, log) => {
          const date = dayjs(log.timestamp).tz('Asia/Seoul').format('YYYY-MM'); // Format to date in KST
          acc[date] = (acc[date] || 0) + log.count; // Increment count
          return acc;
        },
        {} as Record<string, number>
      );

      const monthlyMetrics = Object.entries(monthlyCounts)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, count]) => ({
          date,
          count,
        }));

      // Fetch domain distribution
      const domainDistribution = await prisma.logCount.findMany({
        where: {
          timestamp: {
            gte: monthStart, // Use Date object
          },
        },
      });

      const domainMetrics = Object.entries(
        domainDistribution.reduce<Record<string, Record<string, number>>>(
          (acc, log) => {
            const date = dayjs(log.timestamp).format('YYYY-MM');
            const domain = log.domain;
            acc[date] = {
              ...acc[date],
              [domain]: (acc[date]?.[domain] || 0) + log.count,
            };
            return acc;
          },
          {}
        )
      );

      return {
        hourly_totals: hourlyMetrics.map((metric) => ({
          time: metric.hour,
          total: metric.count,
        })),
        last_10_days_daily_totals: last10DaysDailyMetrics.map((metric) => ({
          time: metric.date,
          total: metric.count,
        })),
        monthly_totals: monthlyMetrics.map((metric) => ({
          time: metric.date,
          total: metric.count,
        })),
        domain_monthly_totals: domainMetrics.map(([date, domains]) => ({
          time: date,
          ...domains,
        })),
      };
    }),
});

export async function GET() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercentage = ((usedMemory / totalMemory) * 100).toFixed(3);

  const response = {
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    usagePercentage,
  };
  return NextResponse.json(response);
}
