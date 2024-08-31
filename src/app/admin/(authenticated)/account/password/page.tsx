'use client';

import { Suspense } from 'react';

import PageAdminPassword from '@/features/account/PageAdminPassword';

export default function Page() {
  return (
    <Suspense>
      <PageAdminPassword />
    </Suspense>
  );
}
