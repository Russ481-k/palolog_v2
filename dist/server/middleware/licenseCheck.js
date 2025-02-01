import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { middleware } from '../config/trpc';

// Dayjs 타임존 설정
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');
export const licenseCheck = middleware(async ({ ctx, next }) => {
  const license = await ctx.db.systemLicense.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!license) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No valid license found',
    });
  }
  const now = dayjs().tz('Asia/Seoul');
  const expiresAt = dayjs(license.expiresAt).tz('Asia/Seoul');
  const daysLeft = expiresAt.diff(now, 'day');
  if (daysLeft <= 0) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'License expired',
    });
  }
  return next({
    ctx: Object.assign(Object.assign({}, ctx), {
      license: {
        daysLeft,
        isExpired: false,
        shouldWarn: daysLeft <= 7,
      },
    }),
  });
});
