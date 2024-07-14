'use client';

import { Suspense } from 'react';

import PageProjects from '@/features/monitoring/PageProjects';

export default function Page() {
  return (
    <Suspense>
      <PageProjects />
    </Suspense>
  );
}
