'use client';

import { PropsWithChildren, Suspense } from 'react';

import { CacheProvider } from '@chakra-ui/next-js';
import { ChakraProvider, createStandaloneToast } from '@chakra-ui/react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';

import { NextLoader } from '@/app/NextLoader';
import { Viewport } from '@/components/Viewport';
import { EnvHint } from '@/features/devtools/EnvHint';
import i18n from '@/lib/i18n/client';
import { TrpcProvider } from '@/lib/trpc/TrpcProvider';
import theme from '@/theme';

const { ToastContainer } = createStandaloneToast();

export function Providers({ children }: PropsWithChildren) {
  return (
    <Suspense>
      <I18nextProvider i18n={i18n}>
        <CacheProvider>
          <ChakraProvider theme={theme} resetCSS>
            <TrpcProvider>
              <NextLoader />
              <Viewport>{children}</Viewport>
              <EnvHint />
              <ReactQueryDevtools initialIsOpen={false} />
              <ToastContainer />
            </TrpcProvider>
          </ChakraProvider>
        </CacheProvider>
      </I18nextProvider>
    </Suspense>
  );
}
