import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { zProject } from '@/features/monitoring/schemas';
import { createTRPCRouter, protectedProcedure } from '@/server/config/trpc';

export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure({ authorizations: ['ADMIN'] })
    .meta({
      openapi: {
        method: 'GET',
        path: '/projects',
        protect: true,
        tags: ['projects'],
      },
    })
    .input(
      z
        .object({
          dateFrom: z.string().optional().default(JSON.stringify(Date.now())),
          dateTo: z.string().optional().default(JSON.stringify(Date.now())),
          cursor: z.string().cuid().optional(),
          limit: z.number().min(1).max(100).default(20),
          searchTerm: z.string().optional(),
        })
        .default({})
    )
    .output(
      z.object({
        items: z.array(zProject()),
        nextCursor: z.string().cuid().nullish(),
        total: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        name: {
          contains: input.searchTerm,
          mode: 'insensitive',
        },
      } satisfies Prisma.ProjectWhereInput;

      const [total, projects] = await ctx.db.$transaction([
        ctx.db.project.count({ where }),
        ctx.db.project.findMany({
          take: input.limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          where,
        }),
      ]);

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (projects.length > input.limit) {
        const nextProject = projects.pop();
        nextCursor = nextProject?.id;
      }
      return { items: projects, nextCursor, total };
    }),
});
