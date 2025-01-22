import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { NextResponse } from 'next/server';
import os from 'os';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

import { makeOpenSearchRequest } from '../lib/opensearch';

// Dayjs 설정
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');
// 전역 상수
export const prisma = new PrismaClient();
// 시스템 터링 관련 함수
async function getDiskUsage() {
  return new Promise((resolve) => {
    exec("df -BG / | tail -1 | awk '{print $2,$3,$5}'", (_, stdout) => {
      const [total, used, usagePercent] = stdout.trim().split(/\s+/);
      const totalGB = parseInt(
        total !== null && total !== void 0 ? total : '0'
      );
      const usedGB = parseInt(used !== null && used !== void 0 ? used : '0');
      const usage = parseInt(
        usagePercent !== null && usagePercent !== void 0 ? usagePercent : '0'
      );
      resolve({
        total: isNaN(totalGB) ? 0 : totalGB,
        used: isNaN(usedGB) ? 0 : usedGB,
        usage: isNaN(usage) ? 0 : usage,
      });
    });
  });
}
async function checkDaemonStatus() {
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
// 스케줄러 수정
setInterval(async () => {
  // 매일 자정에 일간 총량 측정
  if (dayjs().hour() === 0 && dayjs().minute() === 0) {
    try {
      // await measureTotalLogs('daily');
    } catch (error) {
      console.error('Error measuring daily total:', error);
    }
  }
  // 매월 1일 자정에 월간 총량 측정
  if (dayjs().date() === 1 && dayjs().hour() === 0 && dayjs().minute() === 0) {
    try {
      // await measureTotalLogs('monthly');
    } catch (error) {
      console.error('Error measuring monthly total:', error);
    }
  }
}, 60 * 1000);
// 디스크 관리 관련 함수
async function checkDiskUsageAndDeleteOldLogs() {
  try {
    const diskUsage = await getDiskUsage();
    if (diskUsage.usage >= 20) {
      // console.log('Disk usage is above 80%. Starting controlled deletion...');
      console.log('Disk usage is above 20%. Starting controlled deletion...');

      // 한 번에 삭제할 최대 인덱스 수 제한
      const MAX_DELETIONS_PER_CYCLE = 20;
      let deletionCount = 0;

      const oldestIndices = await getOldestIndices();

      for (const index of oldestIndices) {
        if (deletionCount >= MAX_DELETIONS_PER_CYCLE) {
          break;
        }

        try {
          await deleteIndex(index);
          console.log(`Successfully deleted index ${index}`);
          deletionCount++;

          // 현재 디스크 사용량 확인
          const currentUsage = await getDiskUsage();
          if (currentUsage.usage < 10) {
            console.log(
              'Disk usage is now below 70%. Stopping deletion cycle.'
            );
            break;
          }
        } catch (error) {
          console.error(`Failed to delete index ${index}:`, error);
          continue;
        }
      }

      // 최종 디스크 사용량 로깅
      const finalUsage = await getDiskUsage();
      console.log(
        `Deletion cycle completed. Current disk usage: ${finalUsage.usage}%`
      );
    }
  } catch (error) {
    console.error('Error in checkDiskUsageAndDeleteOldLogs:', error);
  }
}
async function deleteOldestLogCounts() {
  const oldestIndices = await getOldestIndices();
  for (const index of oldestIndices) {
    await deleteIndex(index);
    console.log(`Deleted index ${index}`);
  }
}
async function getOldestIndices() {
  const indices = await listIndices();
  const validIndices = indices.filter((index) => index.startsWith('20'));
  if (validIndices.length === 0) return [];
  // Parse date and index number from index name
  const indexMap = validIndices.map((index) => {
    const [date, ...rest] = index.split('_');
    return {
      index,
      date: dayjs(date, 'YYYY.MM.DD.HH'),
      indexNum: parseInt(rest.join('_').split('_').pop() || '0'),
    };
  });
  // Sort by date then by index number
  return indexMap
    .sort((a, b) => {
      const dateCompare = a.date.unix() - b.date.unix();
      if (dateCompare === 0) {
        return a.indexNum - b.indexNum;
      }
      return dateCompare;
    })
    .map((item) => item.index);
}
async function listIndices() {
  const result = await makeOpenSearchRequest(
    '/_cat/indices?format=json',
    'GET'
  );
  return result
    .filter((item) => item.index && typeof item.index === 'string')
    .map((item) => item.index);
}
async function deleteIndex(indexName) {
  try {
    await makeOpenSearchRequest(`/${indexName}`, 'DELETE');
  } catch (error) {
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
// 시스템 메트릭스 관련 함수
async function getCpuUsage() {
  return new Promise((resolve) => {
    exec(
      // 모든 활성 상태의 CPU 사용률을 합산
      "mpstat 1 1 | grep 'Average:' | awk '{print $3 + $4 + $5 + $6 + $7 + $8 + $9}'",
      (_, stdout) => {
        const cpuUsage = parseFloat(stdout.trim());
        if (isNaN(cpuUsage) || cpuUsage < 0 || cpuUsage > 100) {
          resolve(0);
        } else {
          resolve(Number(cpuUsage.toFixed(1)));
        }
      }
    );
  });
}
async function getMemoryUsage() {
  return new Promise((resolve) => {
    exec("free | grep Mem | awk '{print ($3/$2) * 100}'", (_, stdout) => {
      const memUsage = parseFloat(stdout.trim());
      resolve(isNaN(memUsage) ? 0 : memUsage);
    });
  });
}
// Function to query the device_name_index
export const getDomainIndexContents = async () => {
  var _a, _b, _c, _d;
  try {
    const result = await makeOpenSearchRequest(
      `/domain_index/_search`,
      'POST',
      {
        size: 1000,
        query: { match_all: {} },
      }
    );
    if (
      (_d =
        (_c =
          (_b =
            (_a = result.hits) === null || _a === void 0 ? void 0 : _a.hits) ===
            null || _b === void 0
            ? void 0
            : _b[0]) === null || _c === void 0
          ? void 0
          : _c._source) === null || _d === void 0
        ? void 0
        : _d.domains
    ) {
      return result.hits.hits[0]._source.domains;
    }
    return [];
  } catch (error) {
    console.error('Error querying domain_index:', error);
    return [];
  }
};
export const dashboardRouter = createTRPCRouter({
  getDomains: protectedProcedure()
    .output(z.object({ domains: z.array(z.string()) }))
    .query(async () => {
      const domains = await getDomainIndexContents();
      return { domains };
    }),
  // 시스템 메트릭스 조회
  getSystemMetrics: protectedProcedure()
    .output(
      z.object({
        cpu_usage: z.number(),
        memory_usage: z.number(),
        disk: z.object({
          total: z.number(),
          used: z.number(),
          usage: z.number(),
        }),
        daemon_status: z.object({
          dbms: z.enum(['active', 'inactive']),
          parser: z.enum(['active', 'inactive']),
        }),
      })
    )
    .query(async () => {
      const [cpuUsage, memoryUsage, disk, daemon_status] = await Promise.all([
        getCpuUsage(),
        getMemoryUsage(),
        getDiskUsage(),
        checkDaemonStatus(),
      ]);
      return {
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk,
        daemon_status,
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
      const now = dayjs().tz('Asia/Seoul');
      const thirtySecondsAgo = now.subtract(30, 'second');
      const oneMinuteAgo = thirtySecondsAgo.subtract(60, 'second');
      const domains = await getDomainIndexContents();
      const currentHour = now.format('YYYY.MM.DD.HH');
      // 초당 로그 수 계산
      const logsPerSecondPromises = domains.map(async (domain) => {
        const domainPattern = domain
          .toLowerCase()
          .replace(/\./g, '-')
          .replace(/[^a-z0-9\-]/g, '_');
        const result = await makeOpenSearchRequest(
          `/${currentHour}*_${domainPattern}/_count`,
          'POST',
          {
            query: {
              bool: {
                must: [
                  {
                    range: {
                      '@timestamp': {
                        gte: oneMinuteAgo.toISOString(),
                        lt: thirtySecondsAgo.toISOString(),
                      },
                    },
                  },
                ],
              },
            },
          }
        );
        return !!result.count ? result.count / 60 : 0; // 60초 동안의 로그를 초당 평균으로 변환
      });
      // 일간 로그 수 계산
      const currentDate = now.format('YYYY.MM.DD');
      const logsPerDayPromises = domains.map(async (domain) => {
        var _a;
        const domainPattern = domain
          .toLowerCase()
          .replace(/\./g, '-')
          .replace(/[^a-z0-9\-]/g, '_');
        const indices = `${currentDate}*_${domainPattern}`;
        const result = await makeOpenSearchRequest(`/${indices}/_count`, 'GET');
        return (_a = result.count) !== null && _a !== void 0 ? _a : 0;
      });
      const logsPerSecond = await Promise.all(logsPerSecondPromises);
      const logsPerDay = await Promise.all(logsPerDayPromises);
      return {
        logs_per_second: Math.round(logsPerSecond.reduce((a, b) => a + b, 0)),
        logs_per_day: logsPerDay.reduce((a, b) => a + b, 0),
      };
    }),
  getChartMetrics: protectedProcedure().query(async () => {
    var _a, _b, _c;
    const now = dayjs().tz('Asia/Seoul');
    const domains = await getDomainIndexContents();
    // 시간별 데이터 (최근 24시간)
    const hourlyResult = await makeOpenSearchRequest('/_search', 'POST', {
      size: 0,
      query: {
        range: {
          '@timestamp': {
            gte: now.subtract(24, 'hours').format(),
            lte: now.format(),
          },
        },
      },
      aggs: {
        logs_per_hour: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '1h',
            time_zone: '+09:00',
            format: 'yyyy-MM-dd HH:mm:ss',
            extended_bounds: {
              min: now.subtract(24, 'hours').valueOf(),
              max: now.valueOf(),
            },
            min_doc_count: 0,
          },
        },
      },
    });
    // 일별 데이터 (최근 10일)
    const dailyResult = await makeOpenSearchRequest('/_search', 'POST', {
      size: 0,
      query: {
        range: {
          '@timestamp': {
            gte: 'now-10d/d',
            lte: 'now/d',
          },
        },
      },
      aggs: {
        logs_per_day: {
          date_histogram: {
            field: '@timestamp',
            calendar_interval: 'day',
            time_zone: '+09:00',
            format: 'yyyy-MM-dd',
            extended_bounds: {
              min: 'now-10d/d',
              max: 'now/d',
            },
            min_doc_count: 0,
          },
        },
      },
    });
    // 월별 데이터 (최근 12개월)
    const monthlyResult = await makeOpenSearchRequest('/_search', 'POST', {
      size: 0,
      query: {
        range: {
          '@timestamp': {
            gte: 'now-1y/M',
            lte: 'now/M',
          },
        },
      },
      aggs: {
        logs_per_month: {
          date_histogram: {
            field: '@timestamp',
            calendar_interval: 'month',
            time_zone: '+09:00',
            format: 'yyyy-MM',
            extended_bounds: {
              min: 'now-1y/M',
              max: 'now/M',
            },
            min_doc_count: 0,
          },
        },
      },
    });
    // 도메인별 월간 데이터 (최근 12개월)
    const domainMonthlyPromises = domains.map(async (domain) => {
      const domainPattern = domain
        .toLowerCase()
        .replace(/\./g, '-')
        .replace(/[^a-z0-9\-]/g, '_');
      // 최근 12개월의 데이터를 가져오기
      const monthlyPromises = Array.from({ length: 12 }, async (_, i) => {
        var _a;
        const targetMonth = now.subtract(11 - i, 'months');
        const monthPattern = targetMonth.format('YYYY.MM');
        const result = await makeOpenSearchRequest(
          `/${monthPattern}*_${domainPattern}*/_count`,
          'GET'
        );
        return {
          time: targetMonth.format('YYYY-MM'),
          total: (_a = result.count) !== null && _a !== void 0 ? _a : 0,
        };
      });
      const monthlyData = await Promise.all(monthlyPromises);
      return {
        domain,
        data: monthlyData,
      };
    });
    const domainMonthlyResults = await Promise.all(domainMonthlyPromises);
    return {
      hourly_totals:
        ((_a = hourlyResult.aggregations.logs_per_hour) === null ||
        _a === void 0
          ? void 0
          : _a.buckets.map((bucket) => ({
              time: bucket.key_as_string,
              total: bucket.doc_count,
            }))) || [],
      last_10_days_daily_totals:
        ((_b = dailyResult.aggregations.logs_per_day) === null || _b === void 0
          ? void 0
          : _b.buckets.map((bucket) => ({
              time: bucket.key_as_string,
              total: bucket.doc_count,
            }))) || [],
      monthly_totals:
        ((_c = monthlyResult.aggregations.logs_per_month) === null ||
        _c === void 0
          ? void 0
          : _c.buckets.map((bucket) => ({
              time: bucket.key_as_string,
              total: bucket.doc_count,
            }))) || [],
      domain_monthly_totals: domainMonthlyResults,
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
