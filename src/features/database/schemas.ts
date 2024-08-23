import { t } from 'i18next';
import { z } from 'zod';

import { zu } from '@/lib/zod/zod-utils';

export type DatabaseStatus = z.infer<ReturnType<typeof zDatabaseStatus>>;
export const zDatabaseStatus = () =>
  z.enum(['DISABLED', 'ENABLED', 'NOT_VERIFIED']).catch('DISABLED');

export type Database = z.infer<ReturnType<typeof zDatabase>>;
export const zDatabase = () =>
  z.object({
    name: zu.string.nonEmpty(
      z.string({
        required_error: t('database:data.name.required'),
      })
    ),
    description: zu.string.nonEmpty(
      z.string({
        required_error: t('database:data.description.required'),
      })
    ),
    columns: z.array(z.string()).default([]),
  });

export type FormFieldDatabase = z.infer<ReturnType<typeof zFormFieldsDatabase>>;
export const zFormFieldsDatabase = () =>
  zDatabase()
    .pick({
      name: true,
      description: true,
    })
    .required();
