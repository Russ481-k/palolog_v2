'use client';

import { ErrorPage } from '@/components/ErrorPage';

import { Providers } from './Providers';

export default function NotFound() {
  return (
    <Providers>
      <ErrorPage errorCode={404} />
    </Providers>
  );
}
