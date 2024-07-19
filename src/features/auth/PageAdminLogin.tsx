import React from 'react';

import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

import { LoginForm } from '@/features/auth/LoginForm';

export default function PageAdminLogin() {
  const { t } = useTranslation(['auth']);

  return (
    <Card boxShadow="card">
      <CardHeader pb={0}>
        <Heading size="md">{t('auth:login.adminTitle')}</Heading>
      </CardHeader>
      <CardBody>
        <LoginForm />
      </CardBody>
    </Card>
  );
}
