import React from 'react';

import { Button, ButtonGroup, Stack } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ErrorPage } from '@/components/ErrorPage';
import { Form, FormField } from '@/components/Form';
import { LoaderFull } from '@/components/LoaderFull';
import { useToastError, useToastSuccess } from '@/components/Toast';
import {
  FormFieldsAccountPassword,
  zFormFieldsAccountPassword,
} from '@/features/account/schemas';
import { trpc } from '@/lib/trpc/client';

export const AccountPasswordForm = () => {
  const { t } = useTranslation(['common', 'account']);
  const trpcUtils = trpc.useUtils();
  const account = trpc.account.get.useQuery(undefined, {
    staleTime: Infinity,
  });

  const toastSuccess = useToastSuccess();
  const toastError = useToastError();

  const updateAccountPassword = trpc.account.updatePassword.useMutation({
    onSuccess: async () => {
      await trpcUtils.account.invalidate();
      toastSuccess({
        title: t('account:password.feedbacks.updateSuccess.title'),
      });
    },
    onError: () => {
      toastError({
        title: t('account:password.feedbacks.updateError.title'),
      });
    },
  });

  const form = useForm<FormFieldsAccountPassword>({
    mode: 'onBlur',
    resolver: zodResolver(zFormFieldsAccountPassword()),
    values: {
      id: account.data?.id ?? '',
      password: '',
      newPassword: '',
      passwordConfirm: '',
    },
  });

  const onSubmit: SubmitHandler<FormFieldsAccountPassword> = (values) => {
    updateAccountPassword.mutate(values);
  };

  return (
    <>
      {account.isLoading && <LoaderFull />}
      {account.isError && <ErrorPage />}
      {account.isSuccess && (
        <Stack spacing={4}>
          <Form {...form} onSubmit={onSubmit}>
            <Stack spacing={4}>
              <FormField
                control={form.control}
                name="id"
                type="text"
                label={t('account:data.id.label')}
              />
              <FormField
                control={form.control}
                name="password"
                type="password"
                label={t('account:data.password.label')}
              />
              <FormField
                control={form.control}
                name="newPassword"
                type="password"
                label={t('account:data.newPassword.label')}
              />
              <FormField
                control={form.control}
                name="passwordConfirm"
                type="password"
                label={t('account:data.passwordConfirm.label')}
              />
              <ButtonGroup spacing={3}>
                <Button
                  type="submit"
                  variant="@primary"
                  isLoading={updateAccountPassword.isLoading}
                >
                  {t('account:password.actions.update')}
                </Button>
                {form.formState.isDirty && (
                  <Button onClick={() => form.reset()}>
                    {t('common:actions.cancel')}
                  </Button>
                )}
              </ButtonGroup>
            </Stack>
          </Form>
        </Stack>
      )}
    </>
  );
};
