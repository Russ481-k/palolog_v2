import { createTRPCRouter } from '@/server/config/trpc';

import { downloadRouter } from './download';
import { searchSessionRouter } from './search-sessions';

export const appRouter = createTRPCRouter({
  download: downloadRouter,
  searchSessions: searchSessionRouter,
});
