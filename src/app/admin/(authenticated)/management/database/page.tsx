'use client';

import { Suspense } from 'react';

import PageAdminDatabase from '@/features/database/PageAdminDatabase';

export default function Page() {
  return (
    <Suspense>
      <PageAdminDatabase />
    </Suspense>
  );
}
