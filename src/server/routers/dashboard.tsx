import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { exec } from 'child_process';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import fs from 'fs';
import https from 'https';
import { NextResponse } from 'next/server';
import os from 'os';
import { z } from 'zod';

import { env } from '@/env.mjs';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

export const prisma = new PrismaClient();

interface OpenSearchHitsResponse {
  hits: {
    total: {
      value: number;
    };
  };
}

async function queryOpenSearch(
  query: Record<string, unknown>,
  date: string = '*'
) {
  const options = {
    hostname: env.OPENSEARCH_URL.replace('https://', ''),
    port: env.OPENSEARCH_PORT,
    path: `/logstash-logs-${date}/_search`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(
          `${env.OPENSEARCH_USERNAME}:${env.OPENSEARCH_PASSWORD}`
        ).toString('base64'),
    },
    ca: fs.readFileSync('/home/vtek/palolog_v2/ca-cert.pem'),
    rejectUnauthorized: true,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(query));
    req.end();
  });
}

async function getDiskUsage(): Promise<number> {
  return new Promise((resolve) => {
    exec(
      "df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1",
      (_, stdout) => {
        resolve(Number(stdout.trim()) || 0);
      }
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

async function getLogCountFromOpenSearch() {
  const now = dayjs();
  const oneMinuteAgo = now.subtract(1, 'minute');

  const query = {
    size: 0,
    aggs: {
      domains: {
        terms: {
          field: 'domain.keyword',
          size: 50,
        },
        aggs: {
          log_count: {
            value_count: {
              field: '@timestamp',
            },
          },
        },
      },
    },
    query: {
      range: {
        '@timestamp': {
          gte: oneMinuteAgo.toISOString(),
          lt: now.toISOString(),
        },
      },
    },
  };

  const result = (await queryOpenSearch(query)) as {
    aggregations: {
      domains: {
        buckets: Array<{
          key: string;
          doc_count: number;
          log_count: { value: number };
        }>;
      };
    };
  };

  // 각 도메인별로 로그 카운트 저장
  for (const bucket of result.aggregations.domains.buckets) {
    await prisma.logCount.create({
      data: {
        count: bucket.doc_count,
        domain: bucket.key,
        timestamp: now.toDate(),
      },
    });
    console.log(
      `Saved log count for domain ${bucket.key}: ${bucket.doc_count}`
    );
  }

  return result.aggregations.domains.buckets.reduce(
    (total, bucket) => total + bucket.doc_count,
    0
  );
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

// 디스크 용량 체크 및 데이터 삭제 로직 추가
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

// 1분마다 도메인별 로그 수�� 및 디스크 용량 체크
setInterval(async () => {
  try {
    await getLogCountFromOpenSearch();
    await checkDiskUsageAndDeleteOldLogs(); // 디스크 용량 체크 및 데이터 삭제 호출
  } catch (error) {
    console.error('Error collecting log counts:', error);
  }
}, 60 * 1000);

dayjs.extend(utc);
dayjs.extend(timezone);

// Set the default timezone to KST
dayjs.tz.setDefault('Asia/Seoul');

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

  // 로그 수를 수동으로 입력하는 TRPC 프로시저 추가
  inputLogCount: protectedProcedure()
    .input(
      z.object({
        logCount: z.number().min(0),
        domain: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const now = dayjs().tz('Asia/Seoul'); // Get current time in KST
      try {
        await prisma.logCount.create({
          data: {
            count: input.logCount,
            domain: input.domain,
            timestamp: now.toDate(),
          },
        });
        return {
          success: true,
          message: `Log count ${input.logCount} saved for domain ${input.domain}`,
        };
      } catch (error) {
        console.error('Error saving log count:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save log count.',
        });
      }
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
      const now = dayjs();
      const oneSecondAgo = now.subtract(10, 'second');

      const logsPerSecondQuery = {
        size: 10,
        query: {
          range: {
            '@timestamp': {
              gte: oneSecondAgo.toISOString(),
              lte: now.toISOString(),
            },
          },
        },
      };

      const logsPerSecondResult = (await queryOpenSearch(
        logsPerSecondQuery,
        now.format('YYYY.MM.DD')
      )) as OpenSearchHitsResponse;
      const logsPerSecond = Math.round(
        logsPerSecondResult?.hits.total.value / 10
      );

      const logsPerDay = await new Promise<number>((resolve) => {
        const command = `curl -X GET "https://localhost:9200/logstash-logs-$(date +%Y.%m.%d)/_count" -u "admin:admin" --insecure`;
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
            countsPerDay: z.number(),
          })
        ),
        monthly_totals: z.array(
          z.object({ time: z.string(), total: z.number() })
        ),
        domain_monthly_totals: z.array(
          z.object({ time: z.string(), total: z.number() })
        ),
      })
    )
    .query(async () => {
      const now = dayjs().tz('Asia/Seoul'); // Get current time in KST
      const monthStart = now.subtract(1, 'month').toDate();
      const last10DaysStart = now.subtract(10, 'days').toDate();
      const last24HoursStart = now.subtract(24, 'hours').toDate();

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
          if (!acc[hour]) {
            acc[hour] = 0; // Initialize count if not present
          }
          acc[hour] += 1; // Increment count
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
          acc[date] = (acc[date] || 0) + 1; // Increment count
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

      const domainCount = domainDistribution.reduce(
        (acc, log) => {
          const domain = log.domain; // Assuming you have a 'domain' field
          acc[domain] = (acc[domain] || 0) + log.count; // Increment count
          return acc;
        },
        {} as Record<string, number>
      );
      const domainMetrics = Object.entries(domainCount)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, count]) => ({
          date,
          count,
        }));

      return {
        hourly_totals: hourlyMetrics.map((metric) => ({
          time: metric.hour,
          total: metric.count,
        })),
        last_10_days_daily_totals: last10DaysDailyMetrics.map((metric) => ({
          time: metric.date,
          total: metric.count,
          countsPerDay: metric.count,
        })),
        monthly_totals: monthlyMetrics.map((metric) => ({
          time: metric.date,
          total: metric.count,
        })),
        domain_monthly_totals: domainMetrics.map((metric) => ({
          time: metric.date,
          total: metric.count,
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
