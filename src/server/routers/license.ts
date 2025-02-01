import { TRPCError } from '@trpc/server';

import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

import { licenseCheck } from '../middleware/licenseCheck';

export const licenseRouter = createTRPCRouter({
  check: protectedProcedure()
    .use(licenseCheck)
    .query(async ({ ctx }) => {
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

      await ctx.db.systemLicense.update({
        where: { id: license.id },
        data: { lastCheckedAt: new Date() },
      });

      if (!ctx.license) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'License context not found',
        });
      }

      return {
        daysLeft: ctx.license.daysLeft,
        isExpired: ctx.license.isExpired,
        shouldWarn: ctx.license.shouldWarn,
      };
    }),
});

export type LicenseRouter = typeof licenseRouter;
