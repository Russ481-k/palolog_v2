import React from 'react';

import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

import { LoginForm } from '@/features/auth/LoginForm';

export default function PageAdminLogin() {
  const { t } = useTranslation(['auth']);

  return (
    <Card boxShadow="card" w={360}>
      <CardHeader pt={4} pb={0} textAlign="center">
        <Heading size="sm" fontWeight={400}>
          {t('auth:login.adminTitle')}
        </Heading>
      </CardHeader>
      <CardBody pt={3}>
        <LoginForm />
      </CardBody>
    </Card>
  );
}
