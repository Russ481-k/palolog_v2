import { t } from 'i18next';
import { z } from 'zod';

import { zu } from '@/lib/zod/zod-utils';

export type MenuStatus = z.infer<ReturnType<typeof zMenuStatus>>;
export const zMenuStatus = () =>
  z.enum(['DISABLED', 'ENABLED', 'NOT_VERIFIED']).catch('DISABLED');

export type Menu = z.infer<ReturnType<typeof zMenu>>;
export const zMenu = () =>
  z.object({
    name: zu.string.nonEmpty(
      z.string({
        required_error: t('menus:data.name.required'),
      })
    ),
    description: zu.string.nonEmpty(
      z.string({
        required_error: t('menus:data.description.required'),
      })
    ),
    columns: z.array(z.string()).default([]),
  });

export type FormFieldMenu = z.infer<ReturnType<typeof zFormFieldsMenu>>;
export const zFormFieldsMenu = () =>
  zMenu()
    .pick({
      name: true,
      description: true,
    })
    .required();
