import { z } from 'zod';

import { zUser } from '@/features/users/schemas';

export const zUserAccount = () =>
  zUser().pick({
    id: true,
    name: true,
    email: true,
    authorizations: true,
    language: true,
  });
export const zFormFieldsAccountId = () => zUser().pick({ id: true });
export const zFormFieldsAccountProfile = () =>
  zUserAccount()
    .pick({
      id: true,
      email: true,
      name: true,
      language: true,
      authorizations: true,
    })
    .extend({
      password: z.string(),
    })
    .required();
export const zFormFieldsAccountPassword = () =>
  zUserAccount()
    .pick({
      id: true,
    })
    .extend({
      password: z.string(),
      newPassword: z.string(),
      passwordConfirm: z.string(),
    })
    .required();
