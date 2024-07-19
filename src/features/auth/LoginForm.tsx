import React from 'react';

import {
  Box,
  BoxProps,
  Button,
  ButtonProps,
  Flex,
  Stack,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Form, FormField } from '@/components/Form';
import { useToastError } from '@/components/Toast';
import { FormFieldsLogin, zFormFieldsLogin } from '@/features/auth/schemas';
import { LoginHint } from '@/features/devtools/LoginHint';
import { trpc } from '@/lib/trpc/client';
import type { RouterOutputs } from '@/lib/trpc/types';

import { ADMIN_PATH } from '../admin/constants';
import {
  useOnVerificationCodeError,
  useOnVerificationCodeSuccess,
} from './VerificationCodeForm';

type LoginFormProps = BoxProps & {
  buttonVariant?: ButtonProps['variant'];
};

export const LoginForm = ({
  buttonVariant = '@primary',
  ...rest
}: LoginFormProps) => {
  const { t } = useTranslation(['auth']);
  const toastError = useToastError();

  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => onSuccess(data, form.getValues('id')),
    onError: () => {
      toastError({
        title: t('auth:login.feedbacks.loginError.title'),
      });
    },
  });

  const form = useForm<FormFieldsLogin>({
    mode: 'onBlur',
    resolver: zodResolver(zFormFieldsLogin()),
    defaultValues: {
      id: '',
      password: '',
    },
  });

  const onSuccess = (data: RouterOutputs['auth']['login'], userId: string) => {
    validate.mutate({
      code: '000000',
      token: data.token,
      userId,
    });
  };

  const onVerificationCodeSuccess = useOnVerificationCodeSuccess({
    defaultRedirect: ADMIN_PATH,
  });
  const onVerificationCodeError = useOnVerificationCodeError({
    onError: (error) => {
      return form.setError('password', {
        message: error,
      });
    },
  });

  const validate = trpc.auth.loginValidate.useMutation({
    onSuccess: onVerificationCodeSuccess,
    onError: onVerificationCodeError,
  });

  return (
    <Box {...rest}>
      <Form
        {...form}
        onSubmit={(values) => {
          login.mutate({ id: values.id, password: values.password });
        }}
      >
        <Stack spacing={4}>
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
          <Flex>
            <Button
              isLoading={login.isLoading || login.isSuccess}
              type="submit"
              variant={buttonVariant}
              size="lg"
              flex={1}
            >
              {t('auth:login.actions.login')}
            </Button>
          </Flex>

          <LoginHint />
        </Stack>
      </Form>
    </Box>
  );
};
