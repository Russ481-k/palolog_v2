import { ReactNode } from 'react';

import { Metadata } from 'next';

import { Document } from '@/app/Document';
import { Providers } from '@/app/Providers';
import { getEnvHintTitlePrefix } from '@/features/devtools/EnvHint';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    template: `${getEnvHintTitlePrefix()} %s`,
    default: `${getEnvHintTitlePrefix()} PaloLog [web]`,
  },
  applicationName: 'PaloLog [web]',
  description: 'Opinionated UI starter',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <Document>
      <Providers>{children}</Providers>
    </Document>
  );
}
