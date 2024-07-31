'use client';

import { Suspense } from 'react';

import PageAdminMenuCreate from '@/features/menus/PageAdminMenuCreate';

export default function Page() {
  return (
    <Suspense>
      <PageAdminMenuCreate />
    </Suspense>
  );
}
