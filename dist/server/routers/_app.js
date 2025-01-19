import { router } from '../trpc';
import { downloadRouter } from './download';

export const appRouter = router({
  download: downloadRouter,
});
