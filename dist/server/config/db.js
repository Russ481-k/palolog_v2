import { PrismaClient } from '@prisma/client';

import { env } from '@/env.mjs';

var _a;

const globalForPrisma = globalThis;
const levels = {
  trace: ['query', 'error', 'warn', 'info'],
  debug: ['error', 'warn', 'info'],
  info: ['error', 'warn', 'info'],
  warn: ['error', 'warn'],
  error: ['error'],
  fatal: ['error'],
};
export const db =
  (_a = globalForPrisma.prisma) !== null && _a !== void 0
    ? _a
    : new PrismaClient({
        log: levels[env.LOGGER_LEVEL],
      });
if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
