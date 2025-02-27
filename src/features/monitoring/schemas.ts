import { z } from 'zod';

import { columnNames } from './versions/11.0/colNameList_11.0';

// Logs 스키마
export type zLogs = z.infer<ReturnType<typeof zEntaSys>>;
export const zEntaSys = () =>
  z.object(
    columnNames.reduce(
      (acc, columnName: string) => {
        acc[columnName] = z.string().nullable().optional();
        return acc;
      },
      {} as Record<string, z.ZodTypeAny>
    )
  );

// Params 스키마
export type FormFieldsEntaSysParams = z.infer<
  ReturnType<typeof zEntaSysParams>
>;
export const zEntaSysParams = () =>
  z.object({
    menu: z.string().default('TRAFFIC'),
    timeFrom: z.string(),
    timeTo: z.string(),
    currentPage: z.number().min(1).default(1),
    limit: z.number().min(1).max(500000).default(100),
    cursor: z.string().cuid().optional(),
    searchTerm: z.string().default(''),
  });
