import React from 'react';

import { Alert, AlertIcon, AlertTitle, Flex, Stack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';

import { DashboardStatics } from './DashboardStatics';

export default function PageAdminDashboard() {
  const { t } = useTranslation(['adminDashboard']);
  return (
    <AdminLayoutPage containerMaxWidth="container.md">
      <AdminLayoutPageContent>
        <Flex flexDir="column">
          <Stack spacing={4}>
            <Alert status="success" colorScheme="brand" borderRadius="md">
              <AlertIcon />
              <Flex alignItems="center" justifyContent="space-between" flex={1}>
                <AlertTitle fontSize="lg">
                  {t('adminDashboard:title')}
                </AlertTitle>
                {/* <Select size="sm"></Select> */}
              </Flex>
            </Alert>
            <DashboardStatics />
          </Stack>
        </Flex>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
