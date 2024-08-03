import { exec } from 'child_process';
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
  total: number;
  used: number;
  free: number;
  usagePercentage: number;
}[] = [];
const diskUsageBuffer: {
  time: string;
  total: number;
  used: number;
  free: number;
  usagePercentage: number;
}[] = [];

function recordCpuUsage() {
  const time = dayjs().format('HH:mm:ss');

  const cpuUsages = os.cpus().map((cpu, index) => {
    const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
    const idle = cpu.times.idle;
    const usage = 100 - (idle / total) * 100;
    return {
      [`core_${index + 1}`]: Number(usage.toFixed(2)),
    };
  });

  const totalUsage = cpuUsages.reduce((acc, usage) => {
    const usageValue = Object.values(usage)[0];
    return usageValue !== undefined ? acc + usageValue : acc;
  }, 0);

  const cpuUsageEntry = {
    time,
    ...Object.assign({}, ...cpuUsages),
    total_usage: Number((totalUsage / cpuUsages.length).toFixed(2)),
  };

  cpuUsageBuffer.push(cpuUsageEntry);

  if (cpuUsageBuffer.length > 600) {
    cpuUsageBuffer.shift();
  }
}

function recordMemoryUsage() {
  const time = dayjs().format('HH:mm:ss');

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

  const memoryUsageEntry = {
    time,
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    usagePercentage: Number(usagePercentage),
  };

  memoryUsageBuffer.push(memoryUsageEntry);

  if (memoryUsageBuffer.length > 600) {
    memoryUsageBuffer.shift();
  }
}

function recordDiskUsage() {
  return new Promise<void>((resolve, reject) => {
    exec(
      'df --block-size=1 --output=size,used,avail',
      (error, stdout, stderr) => {
        if (error) {
          reject(`오류 발생: ${error.message}`);
          return;
        }
        if (stderr) {
          reject(`표준 오류: ${stderr}`);
          return;
        }

        const lines = stdout.trim().split('\n');
        if (lines.length < 2) {
          reject('디스크 사용량 정보를 가져올 수 없습니다.');
          return;
        }

        const data = lines[1]
          ?.trim()
          .split(' ')
          .map((num) => Number(num))
          .filter((n) => !isNaN(n));
        if (!data || data.length < 3) {
          reject('디스크 사용량 데이터가 유효하지 않습니다.');
          return;
        }

        const time = dayjs().format('HH:mm:ss');
        const total = data[0];
        const used = data[5];
        const available = data[5];

        const usagePercentage = Number(
          (((used ?? 0) / (total ?? 1)) * 100).toFixed(2)
        );

        diskUsageBuffer.push({
          time,
          total: total ?? 0,
          used: used ?? 0,
          free: available ?? 0,
          usagePercentage,
        });

        resolve();
      }
    );
  });
}

function recordCollectionsCount() {
  return new Promise<void>(async (resolve, reject) => {
    const queryTotalCnt = `SELECT COUNT(TIME) TOTAL FROM PANETLOG`;
    let totalCnt = 0;
    try {
      await fetch(
        `${env.MACHBASE_URL}:${env.MACHBASE_PORT}/db/query?q=` +
          encodeURIComponent(queryTotalCnt)
      )
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          totalCnt = data.data.rows[0][0];

          console.log('totalCnt : ' + totalCnt);
        });
    } catch {
      console.log('error');
    }
    resolve();
  });
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
          total: z.number(),
          used: z.number(),
          free: z.number(),
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
            total: 0,
            used: 0,
            free: 0,
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
          total: z.number(),
          used: z.number(),
          free: z.number(),
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
            total: 0,
            used: 0,
            free: 0,
            usagePercentage: 0,
          },
        ]
      );
    }),
});

export async function GET() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

  const response = {
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    usagePercentage,
  };

  return NextResponse.json(response);
}
