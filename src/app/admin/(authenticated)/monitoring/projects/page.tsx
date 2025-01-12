'use client';

import { Suspense } from 'react';

import { Box, Spinner } from '@chakra-ui/react';
import dynamic from 'next/dynamic';

const PageAdminProjects = dynamic(
  () => import('@/features/monitoring/PageProjects'),
  {
    ssr: false,
    loading: () => (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        h="100vh"
        margin="auto"
      >
        <Spinner />
      </Box>
    ),
  }
);

export default function Page() {
  return (
    <Suspense>
      <PageAdminProjects />
    </Suspense>
  );
}
