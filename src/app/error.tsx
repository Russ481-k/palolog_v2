'use client';

import { ErrorPage } from '@/components/ErrorPage';

import { Providers } from './Providers';

export default function Error() {
  return (
    <Providers>
      <ErrorPage errorCode={500} />
    </Providers>
  );
}
