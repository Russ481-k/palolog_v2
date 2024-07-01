import { ReactNode } from 'react';

import { Metadata } from 'next';

import { Document } from '@/app/Document';
import { NextLoader } from '@/app/NextLoader';
import { getEnvHintTitlePrefix } from '@/features/devtools/EnvHint';

export const metadata: Metadata = {
  title: {
    template: `${getEnvHintTitlePrefix()} %s`,
    default: `${getEnvHintTitlePrefix()} PaloLog [web]`,
  },
  applicationName: 'PaloLog [web]',
  description: 'Opinionated UI starter',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Document>
      <NextLoader />
      {children}
    </Document>
  );
}
