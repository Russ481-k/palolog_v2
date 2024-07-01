'use client';

import { Suspense } from 'react';

import PageAdminProjects from '@/features/monitoring/PageAdminProjects';

export default function Page() {
  return (
    <Suspense>
      <PageAdminProjects />
    </Suspense>
  );
}
