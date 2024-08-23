import React from 'react';

import { Heading } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

import { AdminAccountNav } from '@/features/account/AdminAccountNav';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';

import { AccountPasswordForm } from './AccountPasswordForm';

export default function PageAdminPassword() {
  const { t } = useTranslation(['common', 'account']);

  return (
    <AdminLayoutPage containerMaxWidth="container.md" nav={<AdminAccountNav />}>
      <AdminLayoutPageContent>
        <Heading size="md" mb="4">
          {t('account:password.title')}
        </Heading>
        <AccountPasswordForm />
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
