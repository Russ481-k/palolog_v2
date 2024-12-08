import React from 'react';

import { Flex, Stack } from '@chakra-ui/react';

import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';

import { DashboardStatics } from './DashboardStatics';

export default function PageAdminDashboard() {
  return (
    <AdminLayoutPage containerMaxWidth="container.md">
      <AdminLayoutPageContent>
        <Flex flexDir="column">
          <Stack spacing={4}>
            <DashboardStatics />
          </Stack>
        </Flex>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
