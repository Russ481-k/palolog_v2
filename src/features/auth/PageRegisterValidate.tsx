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
import { useRtl } from '@/hooks/useRtl';
import { trpc } from '@/lib/trpc/client';

export default function PageRegisterValidate() {
  const { t } = useTranslation(['common', 'auth']);
  const { rtlValue } = useRtl();
  const router = useRouter();

  const form = useForm<{
    id: string;
    name: string;
    email: string;
    language: string;
  }>({
    mode: 'onBlur',
    defaultValues: {
      id: '',
      name: '',
      email: '',
      language: 'en',
    },
  });

  const onSubmit: SubmitHandler<{
    id: string;
    name: string;
    email: string;
    language: string;
  }> = ({
    id,
    name,
    email,
    language,
  }: {
    id: string;
    name: string;
    email: string;
    language: string;
  }) => {
    validate.mutate({ id, name, email, language });
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
          type="text"
          control={form.control}
          name="name"
          size="lg"
          placeholder={t('auth:data.name.label')}
        />
        <FormField
          type="email"
          control={form.control}
          name="email"
          size="lg"
          placeholder={t('auth:data.email.label')}
        />
        <FormField
          type="text"
          control={form.control}
          name="language"
          size="lg"
          placeholder={t('auth:data.language.label')}
        />
      </Form>
    </Stack>
  );
}
