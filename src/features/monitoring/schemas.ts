import { z } from 'zod';

export type zLogs = z.infer<ReturnType<typeof zPaloLogs>>;
export const zPaloLogs = () =>
  z.object({
    ...Array.from({ length: 120 }, (_, i) => ({
      [`d${i.toString().padStart(3, '0')}`]: z.string().nullish(),
    })).reduce((acc, obj) => ({ ...acc, ...obj }), {}),
  });

export type FormFieldsPaloLogsParams = z.infer<
  ReturnType<typeof zPaloLogsParams>
>;
export const zPaloLogsParams = () =>
  z.object({
    menu: z.string().default('TRAFFIC'),
    timeFrom: z.string(),
    timeTo: z.string(),
    currentPage: z.number().min(1).default(1),
    limit: z.number().min(1).max(500000).default(100),
    cursor: z.string().cuid().optional(),
    searchTerm: z.string().default(''),
  });
