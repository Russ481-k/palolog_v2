'use client';

import { PropsWithChildren } from 'react';

import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, createStandaloneToast } from '@chakra-ui/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';

import { Viewport } from '@/components/Viewport';
import { EnvHint } from '@/features/devtools/EnvHint';
import i18n from '@/lib/i18n/client';
import { TrpcProvider } from '@/lib/trpc/TrpcProvider';
import theme from '@/theme';

const { ToastContainer } = createStandaloneToast();

export function Providers({ children }: PropsWithChildren) {
  return (
    <I18nextProvider i18n={i18n}>
      <CacheProvider>
        <ChakraProvider theme={theme} resetCSS>
          <TrpcProvider>
            <Viewport>{children}</Viewport>
            <EnvHint />
            <ReactQueryDevtools initialIsOpen={false} />
            <ToastContainer />
          </TrpcProvider>
        </ChakraProvider>
      </CacheProvider>
    </I18nextProvider>
  );
}
