import { ReactNode } from 'react';

import { ColorModeScript } from '@chakra-ui/react';

import { AVAILABLE_LANGUAGES } from '@/lib/i18n/constants';
import theme from '@/theme';

export const Document = ({ children }: { children: ReactNode }) => {
  // 서버에서 기본 언어를 'ko'로 설정
  const defaultLanguage = 'ko';
  const defaultDir =
    AVAILABLE_LANGUAGES.find(({ key }) => key === defaultLanguage)?.dir ??
    'ltr';

  return (
    <html lang={defaultLanguage} dir={defaultDir} suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link
          rel="mask-icon"
          href="/safari-pinned-tab.svg"
          color={theme.colors.gray?.['800']}
        />
      </head>
      <body>
        <ColorModeScript type="cookie" />
        <main>{children}</main>
      </body>
    </html>
  );
};
