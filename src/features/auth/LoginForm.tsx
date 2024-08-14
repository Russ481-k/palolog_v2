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
import { FormFieldsLogin, zFormFieldsLogin } from '@/features/auth/schemas';
import { LoginHint } from '@/features/devtools/LoginHint';
import { trpc } from '@/lib/trpc/client';

import { ADMIN_PATH } from '../admin/constants';
import {
  useOnVerificationError,
  useOnVerificationSuccess,
} from './VerificationForm';

type LoginFormProps = BoxProps & {
  buttonVariant?: ButtonProps['variant'];
};

export const LoginForm = ({
  buttonVariant = '@primary',
  ...rest
}: LoginFormProps) => {
  const { t } = useTranslation(['auth']);

  const onVerificationSuccess = useOnVerificationSuccess({
    defaultRedirect: ADMIN_PATH,
  });
  const onVerificationError = useOnVerificationError({
    onError: (error) => {
      return form.setError('password', {
        message: error,
      });
    },
  });

  const login = trpc.auth.login.useMutation({
    onSuccess: onVerificationSuccess,
    onError: onVerificationError,
  });

  const form = useForm<FormFieldsLogin>({
    mode: 'onBlur',
    resolver: zodResolver(zFormFieldsLogin()),
    defaultValues: {
      id: '',
      password: '',
    },
  });

  const onSubmit = (id: string, password: string) => {
    login.mutate({
      id,
      password,
    });
  };

  return (
    <Box {...rest}>
      <Form
        {...form}
        onSubmit={(values) => {
          onSubmit(values.id, values.password);
        }}
      >
        <Stack spacing={4}>
          <FormField
            type="text"
            control={form.control}
            name="id"
            size="sm"
            placeholder={t('auth:data.id.label')}
          />
          <FormField
            type="password"
            control={form.control}
            name="password"
            size="sm"
            placeholder={t('auth:data.password.label')}
          />
          <Flex>
            <Button
              isLoading={login.isLoading || login.isSuccess}
              type="submit"
              variant={buttonVariant}
              size="sm"
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
