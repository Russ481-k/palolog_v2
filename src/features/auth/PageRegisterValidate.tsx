import React from 'react';

import { Button, Stack } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';

import { Form, FormField } from '@/components/Form';
import { APP_PATH } from '@/features/app/constants';
import {
  useOnVerificationError,
  useOnVerificationSuccess,
} from '@/features/auth/VerificationForm';
import {
  FormFieldsVerification,
  zFormFieldsVerification,
} from '@/features/auth/schemas';
import { useRtl } from '@/hooks/useRtl';
import { trpc } from '@/lib/trpc/client';

export default function PageRegisterValidate() {
  const { t } = useTranslation(['common', 'auth']);
  const { rtlValue } = useRtl();
  const router = useRouter();

  const form = useForm<FormFieldsVerification>({
    mode: 'onBlur',
    resolver: zodResolver(zFormFieldsVerification()),
    defaultValues: {
      id: '',
      password: '',
      name: '',
    },
  });

  const onSubmit: SubmitHandler<FormFieldsVerification> = ({
    id,
    password,
    name,
  }: {
    id: string;
    password: string;
    name: string;
  }) => {
    validate.mutate({ id, password, name });
  };

  const onVerificationSuccess = useOnVerificationSuccess({
    defaultRedirect: APP_PATH,
  });
  const onVerificationError = useOnVerificationError({
    onError: (error) => form.setError('name', { message: error }),
  });

  const validate = trpc.auth.register.useMutation({
    onSuccess: onVerificationSuccess,
    onError: onVerificationError,
  });

  return (
    <Stack spacing={6}>
      <Button
        me="auto"
        size="sm"
        leftIcon={rtlValue(<LuArrowLeft />, <LuArrowRight />)}
        onClick={() => router.back()}
      >
        {t('common:actions.back')}
      </Button>

      <Form {...form} onSubmit={onSubmit}>
        <FormField
          type="text"
          control={form.control}
          name="id"
          size="lg"
          placeholder={t('auth:data.id.label')}
        />
        <FormField
          type="password"
          control={form.control}
          name="password"
          size="lg"
          placeholder={t('auth:data.password.label')}
        />
        <FormField
          type="text"
          control={form.control}
          name="name"
          size="lg"
          placeholder={t('auth:data.name.label')}
        />
      </Form>
    </Stack>
  );
}
