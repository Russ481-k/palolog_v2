'use client';

import { Suspense } from 'react';

import PageAdminDatabaseCreate from '@/features/database/PageAdminDatabaseCreate';

export default function Page() {
  return (
    <Suspense>
      <PageAdminDatabaseCreate />
    </Suspense>
  );
}
