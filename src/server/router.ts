import { createTRPCRouter } from '@/server/config/trpc';
import { accountRouter } from '@/server/routers/account';
import { authRouter } from '@/server/routers/auth';
import { dashboardRouter } from '@/server/routers/dashboard';
import { usersRouter } from '@/server/routers/users';

import { downloadRouter } from './routers/download';
import { licenseRouter } from './routers/license';
import { projectsRouter } from './routers/projects';

/**
 * This is the primary router for your server.
 *
 * All routers added in /src/server/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  account: accountRouter,
  auth: authRouter,
  projects: projectsRouter,
  users: usersRouter,
  download: downloadRouter,
  license: licenseRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
