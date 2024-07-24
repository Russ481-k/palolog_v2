import { z } from 'zod';

import { zUser } from '@/features/users/schemas';

export type FormFieldsLogin = z.infer<ReturnType<typeof zFormFieldsLogin>>;
export const zFormFieldsLogin = () =>
  zUser().pick({ id: true, password: true });

export type FormFieldsRegister = z.infer<
  ReturnType<typeof zFormFieldsRegister>
>;
export const zFormFieldsRegister = () =>
  zUser()
    .pick({ id: true, password: true, email: true, name: true, language: true })
    .required();

export type FormFieldsVerification = z.infer<
  ReturnType<typeof zFormFieldsVerification>
>;
export const zFormFieldsVerification = () =>
  z.object({
    id: z.string(),
    password: z.string(),
    name: z.string(),
  });
