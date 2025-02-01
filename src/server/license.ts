import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/config/trpc';
import { generateLicenseKey, verifyLicense } from '@/utils/license';

export const licenseRouter = createTRPCRouter({
  verify: protectedProcedure()
    .input(
      z.object({
        licenseKey: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const license = verifyLicense(input.licenseKey);

        if (!license) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Invalid license',
          });
        }

        return { license };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid request',
        });
      }
    }),

  generate: publicProcedure()
    .input(
      z.object({
        deviceId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const activatedAt = new Date().toISOString();
        const licenseKey = generateLicenseKey(input.deviceId, activatedAt);

        return { licenseKey };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate license',
        });
      }
    }),
});

export type LicenseRouter = typeof licenseRouter;
