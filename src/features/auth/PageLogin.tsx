import React from 'react';

import {
  Button,
  Divider,
  HStack,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

import { LinkApp } from '@/features/app/LinkApp';
import { LoginForm } from '@/features/auth/LoginForm';

export default function PageLogin() {
  const { t } = useTranslation(['auth', 'common']);

  return (
    <Stack spacing={6}>
      <Stack spacing={1}>
        <Heading size="md">{t('auth:login.appTitle')}</Heading>
        <Text fontSize="sm" color="text-dimmed">
          {t('auth:login.appSubTitle')}
        </Text>
      </Stack>
      <Button variant="@primary" size="lg" as={LinkApp} href="/register">
        {t('auth:login.actions.register')}
      </Button>
      <HStack>
        <Divider flex={1} />
        <Text
          fontSize="xs"
          color="gray.400"
          fontWeight="bold"
          textTransform="uppercase"
        >
          {t('common:or')}
        </Text>
        <Divider flex={1} />
      </HStack>

      <LoginForm buttonVariant="@secondary" />
    </Stack>
  );
}
