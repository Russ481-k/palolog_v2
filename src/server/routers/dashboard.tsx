import dayjs from 'dayjs';
import fs from 'fs';
import https from 'https';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import os from 'os';
import { z } from 'zod';

import { env } from '@/env.mjs';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

const cpuUsageBuffer: Array<{
  time: string;
  total_usage: number;
  core_1: number;
  core_2: number;
  core_3: number;
  core_4: number;
  core_5: number;
  core_6: number;
}> = [];
const memoryUsageBuffer: Array<{ time: string; usagePercentage: number }> = [];
const diskUsageBuffer: Array<{ time: string; usagePercentage: number }> = [];
const threatCountBuffer: Array<{ severity: string; amount: number }[]> = [];
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
const collectionsCountPerSecBuffer: Array<{
  time: string;
  countsPerSec: number;
  total: number;
}> = [];
const collectionsCountPerDayBuffer: Array<{
  time: string;
  countsPerDay: number;
}> = [];

// async function fetchOpenSearch(index: string, query: Record<string, unknown>) {
//   const response = await fetch(`${env.OPENSEARCH_URL}/${index}/_search`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(query),
//     agent: new https.Agent({
//       rejectUnauthorized: false,
//     }),
//   });

//   if (!response.ok) {
//     throw new Error(`Failed to fetch data from OpenSearch: ${response.status}`);
//   }
//   return response.json();
// }

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
