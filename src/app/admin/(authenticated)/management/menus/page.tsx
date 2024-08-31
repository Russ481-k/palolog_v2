'use client';

import { Suspense } from 'react';

import PageAdminMenus from '@/features/menus/PageAdminMenus';

export default function Page() {
  return (
    <Suspense>
      <PageAdminMenus />
    </Suspense>
  );
}
