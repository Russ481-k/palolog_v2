import { z } from 'zod';

import { zu } from '@/lib/zod/zod-utils';

export type Project = z.infer<ReturnType<typeof zProject>>;
export const zProject = () =>
  z.object({
    id: z.string().cuid(),
    name: zu.string.nonEmpty(z.string()),
    description: z.string().nullish(),
  });
