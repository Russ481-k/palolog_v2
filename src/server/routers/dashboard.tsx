import { exec } from 'child_process';
import { NextResponse } from 'next/server';
import os from 'os';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

// 데이터 버퍼를 저장할 객체
const cpuUsageBuffer: { core: number; usage: string }[][] = [];
const memoryUsageBuffer: {
  total: number;
  used: number;
  free: number;
  usagePercentage: string;
}[] = [];
const diskUsageBuffer: {
  total: number;
  used: number;
  free: number;
  usagePercentage: string;
}[] = [];

// CPU 사용량을 기록하는 함수
function recordCpuUsage() {
  const cpuUsages = os.cpus().map((cpu, index) => {
    const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
    const idle = cpu.times.idle;
    const usage = 100 - (idle / total) * 100;
    return {
      core: index,
      usage: usage.toFixed(2),
    };
  });

  cpuUsageBuffer.push(cpuUsages);
}

// 메모리 사용량을 기록하는 함수
function recordMemoryUsage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usagePercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

  memoryUsageBuffer.push({
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    usagePercentage,
  });
}

// 디스크 사용량을 기록하는 함수
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

        const data = lines[1]?.trim().split(' ').map(Number);
        if (!data || data.length < 3) {
          reject('디스크 사용량 데이터가 유효하지 않습니다.');
          return;
        }

        const [total, used, available] = data;
        const usagePercentage = (((used ?? 0) / (total ?? 1)) * 100).toFixed(2);

        diskUsageBuffer.push({
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

// 주기적으로 데이터 기록
setInterval(async () => {
  recordCpuUsage();
  recordMemoryUsage();
  await recordDiskUsage();
}, 1000); // 1초마다 기록

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
    .output(z.array(z.object({ core: z.number(), usage: z.string() })))
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting CPU usage');
      return cpuUsageBuffer.slice(-1)[0] || [];
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
    .output(
      z.object({
        total: z.number(),
        used: z.number(),
        free: z.number(),
        usagePercentage: z.string(),
      })
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting memory usage');
      return (
        memoryUsageBuffer.slice(-1)[0] || {
          total: 0,
          used: 0,
          free: 0,
          usagePercentage: '0.00',
        }
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
    .output(
      z.object({
        total: z.number(),
        used: z.number(),
        free: z.number(),
        usagePercentage: z.string(),
      })
    )
    .query(async ({ ctx }) => {
      ctx.logger.info('Getting disk usage');
      return (
        diskUsageBuffer.slice(-1)[0] || {
          total: 0,
          used: 0,
          free: 0,
          usagePercentage: '0.00',
        }
      );
    }),
});

// Next.js API Route 추가
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
