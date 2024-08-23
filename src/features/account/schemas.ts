import { z } from 'zod';

import { zUser } from '@/features/users/schemas';

export type UserAccount = z.infer<ReturnType<typeof zUserAccount>>;
export const zUserAccount = () =>
  zUser().pick({
    id: true,
    name: true,
    email: true,
    authorizations: true,
    language: true,
  });

export type FormFieldsAccountId = z.infer<
  ReturnType<typeof zFormFieldsAccountId>
>;
export const zFormFieldsAccountId = () => zUser().pick({ id: true });

export type FormFieldsAccountProfile = z.infer<
  ReturnType<typeof zFormFieldsAccountProfile>
>;
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

export type FormFieldsAccountPassword = z.infer<
  ReturnType<typeof zFormFieldsAccountPassword>
>;
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
