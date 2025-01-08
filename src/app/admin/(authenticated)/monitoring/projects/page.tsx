'use client';

import { Suspense } from 'react';

import dynamic from 'next/dynamic';

const PageAdminProjects = dynamic(
  () => import('@/features/monitoring/PageProjects'),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export default function Page() {
  return (
    <Suspense>
      <PageAdminProjects />
    </Suspense>
  );
}
