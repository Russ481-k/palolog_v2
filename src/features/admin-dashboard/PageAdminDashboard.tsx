import React from 'react';

import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';

import { DashboardStatics } from './DashboardStatics';

export default function PageAdminDashboard() {
  return (
    <AdminLayoutPage containerMaxWidth="container.md">
      <AdminLayoutPageContent>
        <DashboardStatics />
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
