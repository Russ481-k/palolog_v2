import dayjs from 'dayjs';
import { NextResponse } from 'next/server';
import os from 'os';
import { z } from 'zod';

import { env } from '@/env.mjs';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

const cpuUsageBuffer: {
  time: string;
  total_usage: number;
  core_1: number;
  core_2: number;
  core_3: number;
  core_4: number;
  core_5: number;
  core_6: number;
}[] = [];
const memoryUsageBuffer: {
  time: string;
  usagePercentage: number;
}[] = [];
const diskUsageBuffer: {
  time: string;
  usagePercentage: number;
}[] = [];
const collectionsCountPerSecBuffer: {
  time: string;
  countsPerSec: number;
  total: number;
}[] = [];
const collectionsCountPerDayBuffer: {
  time: string;
  countsPerDay: number;
}[] = [];
const threatCountBuffer: Array<
  {
    severity: string;
    amount: number;
  }[]
> = [];

const recent20Rows: Array<{
  receiveTime: number;
  deviceName: string;
  serial: string;
  description: string;
}> = [];
const critical7Days: Array<{
  receiveTime: number;
  deviceName: string;
  serial: string;
  description: string;
}> = [];
let CollectionsCountsPerSecBuff: number = 0;
let CollectionsCountsPerDayBuff: number = 0;
let lastPushDate: string = '';

function recordCpuUsage() {
  const time = dayjs().format('HH:mm:ss');

  const cpuUsages = os.cpus().map((cpu, index) => {
    const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
    const idle = cpu.times.idle;
    const usage = 100 - (idle / total) * 100;
    return {
      [`core_${index + 1}`]: Number(usage.toFixed(3)),
    };
  });

  const totalUsage = cpuUsages.reduce((acc, usage) => {
    const usageValue = Object.values(usage)[0];
    return usageValue !== undefined ? acc + usageValue : acc;
  }, 0);

  const cpuUsageEntry = {
    time,
    ...Object.assign({}, ...cpuUsages),
    total_usage: Number((totalUsage / cpuUsages.length).toFixed(3)),
  };

  cpuUsageBuffer.push(cpuUsageEntry);

  if (cpuUsageBuffer.length > 600) {
    cpuUsageBuffer.shift();
  }
}

function recordMemoryUsage() {
  const queryMemoryUsage = `select%20/*%2B%20SCAN_BACKWARD(tag)%20*/%20value%20from%20TAG%20where%20name%20=%20%27monitor.mem.used_percent%27%20limit%201`;

  try {
    fetch(
      `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` + queryMemoryUsage
    )
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        const time = dayjs().format('HH:mm:ss');
        const usagePercentage = data.data.rows[0][0];
        memoryUsageBuffer.push({
          time,
          usagePercentage,
        });
        if (memoryUsageBuffer.length > 600) {
          memoryUsageBuffer.shift();
        }
      });
  } catch {
    console.log('Record Memory Usage Error');
  }
}

function recordDiskUsage() {
  const queryDiskUsage = `select%20/*%2B%20SCAN_BACKWARD(tag)%20*/%20value%20from%20TAG%20where%20name%20=%20%27monitor.disk./boot/database.used_percent%27%20limit%201`;

  try {
    fetch(
      `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` + queryDiskUsage
    )
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        const time = dayjs().format('HH:mm:ss');
        const usagePercentage = data.data.rows[0][0];
        diskUsageBuffer.push({
          time,
          usagePercentage,
        });
        if (diskUsageBuffer.length > 600) {
          diskUsageBuffer.shift();
        }
      });
  } catch {
    console.log('Record Disk Usage Error');
  }
}

function recordCollectionsCount() {
  const queryTotalCnt = `SELECT COUNT(*) TOTAL FROM PANETLOG`;
  let totalCnt = 0;
  let countsPerSec = 0;
  try {
    fetch(
      `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
        encodeURIComponent(queryTotalCnt)
    )
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        totalCnt = data.data.rows[0][0];
        countsPerSec = totalCnt - CollectionsCountsPerSecBuff;
        collectionsCountPerSecBuffer.push({
          time: dayjs().format('HH:mm:ss'),
          countsPerSec: countsPerSec,
          total: totalCnt / 1000000,
        });

        const currentDate = dayjs().format('YYYY-MM-DD');
        if (lastPushDate !== currentDate) {
          const countsPerDay = totalCnt - CollectionsCountsPerDayBuff;
          collectionsCountPerDayBuffer.push({
            time: currentDate,
            countsPerDay,
          });
          lastPushDate = currentDate;
        }

        CollectionsCountsPerDayBuff = totalCnt;
        CollectionsCountsPerSecBuff = totalCnt;
        if (collectionsCountPerSecBuffer.length > 600) {
          collectionsCountPerSecBuffer.shift();
        }
        if (collectionsCountPerDayBuffer.length > 30) {
          collectionsCountPerDayBuffer.shift();
        }
      });
  } catch {
    console.log('Record Collections Count Error');
  }
}

function recordThreatCount() {
  const queryThreatCnt = `SELECT SEVERITY, COUNT(*) AS AMOUNT FROM PANETLOG WHERE TYPE='THREAT' GROUP BY SEVERITY ORDER BY AMOUNT DESC`;
  try {
    fetch(
      `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
        encodeURIComponent(queryThreatCnt)
    )
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        const logs = data.data;

        let threatCount: Array<{ severity: string; amount: number }> = [];
        for (let i = 0; i < logs.rows.length; i++) {
          threatCount.push({
            severity: logs.rows[i][0] as string,
            amount: logs.rows[i][1] as number,
          });
        }
        if (logs.rows.length === threatCount.length) {
          threatCountBuffer.push(threatCount);
          threatCount = [];
        }
        if (threatCountBuffer.length > 600) {
          threatCountBuffer.shift();
        }
      });
  } catch {
    console.log('Record Collections Count Error');
  }
}
function recordThreatLogCount() {
  const queryDashboardLogs = `SELECT DEVICE_NAME, SERIAL, RECEIVE_TIME, SESSION_END_REASON FROM PANETLOG WHERE 1=1 AND TYPE = 'URL' LIMIT 20 `;
  const queryDashboardCritical = `SELECT DEVICE_NAME, SERIAL, RECEIVE_TIME, SESSION_END_REASON FROM PANETLOG WHERE 1=1 AND TYPE = 'URL' AND SEVERITY = 'CRITICAL' DURATION FROM TO_DATE('${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}', 'YYYY-MM-DD') TO TO_DATE('${dayjs().format('YYYY-MM-DD')}', 'YYYY-MM-DD')`;
  try {
    fetch(
      `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
        encodeURIComponent(queryDashboardLogs)
    )
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        const logs = data.data;
        for (let i = 0; i < logs.rows.length; i++) {
          recent20Rows.push({
            receiveTime: logs.rows[i][2] as number,
            deviceName: logs.rows[i][0] as string,
            serial: logs.rows[i][1] as string,
            description: logs.rows[i][3] as string,
          });
        }
        if (recent20Rows.length > 20) {
          recent20Rows.shift();
        }
      })
      .catch((e) => {
        console.log('Error : ' + e);
      });

    fetch(
      `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
        encodeURIComponent(queryDashboardCritical)
    )
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        const logs = data.data;
        for (let i = 0; i < logs.rows.length; i++) {
          critical7Days.push({
            receiveTime: logs.rows[i][2] as number,
            deviceName: logs.rows[i][0] as string,
            serial: logs.rows[i][1] as string,
            description: logs.rows[i][3] as string,
          });
        }
        if (critical7Days.length > 20) {
          critical7Days.shift();
        }
      })
      .catch((e) => {
        console.log('Error : ' + e);
      });
  } catch {
    console.log('Error');
  }
}

let intervalId: NodeJS.Timeout;

function startRecording() {
  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(async () => {
    await recordCpuUsage();
    await recordMemoryUsage();
    await recordDiskUsage();
    await recordThreatCount();
    await recordThreatLogCount();
    await recordCollectionsCount();
  }, 1000);
}

startRecording();

export const dashboardRouter = createTRPCRouter({
  getCpuUsage: protectedProcedure()
    .meta({
      openapi: {
        method: 'GET',
        path: '/dashboard/cpu-usage',
        protect: true,
        tags: ['dashboard'],
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          time: z.string(),
          core_1: z.number(),
          core_2: z.number(),
          core_3: z.number(),
          core_4: z.number(),
          core_5: z.number(),
          core_6: z.number(),
          total_usage: z.number(),
        })
      )
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting CPU usage');
      return (
        cpuUsageBuffer ?? [
          {
            time: dayjs().format('HH:mm:ss'),
            core_1: 0,
            core_2: 0,
            core_3: 0,
            core_4: 0,
            core_5: 0,
            core_6: 0,
            total_usage: 0,
          },
        ]
      );
    }),

  getMemoryUsage: protectedProcedure()
    .meta({
      openapi: {
        method: 'GET',
        path: '/dashboard/memory-usage',
        protect: true,
        tags: ['dashboard'],
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          time: z.string(),
          usagePercentage: z.number(),
        })
      )
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting memory usage');
      return (
        memoryUsageBuffer ?? [
          {
            time: '',
            usagePercentage: 0,
          },
        ]
      );
    }),

  getDiskUsage: protectedProcedure()
    .meta({
      openapi: {
        method: 'GET',
        path: '/dashboard/disk-usage',
        protect: true,
        tags: ['dashboard'],
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          time: z.string(),
          usagePercentage: z.number(),
        })
      )
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting disk usage');
      return (
        diskUsageBuffer || [
          {
            time: '',
            usagePercentage: 0,
          },
        ]
      );
    }),
  getCountsPerSec: protectedProcedure()
    .meta({
      openapi: {
        method: 'GET',
        path: '/dashboard/counts-per-sec',
        protect: true,
        tags: ['dashboard'],
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          time: z.string(),
          countsPerSec: z.number(),
          total: z.number(),
        })
      )
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting counts per sec');
      return (
        collectionsCountPerSecBuffer || [
          {
            time: '',
            countsPerSec: 0,
            total: 0,
          },
        ]
      );
    }),

  getCountsPerDay: protectedProcedure()
    .meta({
      openapi: {
        method: 'GET',
        path: '/dashboard/counts-per-day',
        protect: true,
        tags: ['dashboard'],
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          time: z.string(),
          countsPerDay: z.number(),
        })
      )
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting counts per day');
      return (
        collectionsCountPerDayBuffer || [
          {
            time: '',
            countsPerDay: 0,
          },
        ]
      );
    }),

  getThreatLogData: protectedProcedure()
    .meta({
      openapi: {
        method: 'GET',
        path: '/dashboard/threat-counts',
        protect: true,
        tags: ['dashboard'],
      },
    })
    .input(z.object({}))
    .output(
      z.array(
        z.array(
          z.object({
            severity: z.string(),
            amount: z.number(),
          })
        )
      )
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting disk usage');
      return (
        threatCountBuffer || [
          [
            {
              severity: 'low',
              amount: 0,
            },
            {
              severity: 'informational',
              amount: 0,
            },
            {
              severity: 'critical',
              amount: 0,
            },
          ],
        ]
      );
    }),

  getSystemLog: protectedProcedure()
    .meta({
      openapi: {
        method: 'GET',
        path: '/dashboard/system-log',
        protect: true,
        tags: ['dashboard'],
      },
    })
    .input(z.object({}))
    .output(
      z.object({
        recent20Rows: z.array(
          z.object({
            receiveTime: z.number(),
            deviceName: z.string(),
            serial: z.string(),
            description: z.string(),
          })
        ),
        critical7Days: z.array(
          z.object({
            receiveTime: z.number(),
            deviceName: z.string(),
            serial: z.string(),
            description: z.string(),
          })
        ),
      })
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting system log');
      return {
        recent20Rows,
        critical7Days,
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
