import React, { useContext, useEffect, useMemo } from 'react';

import {
  Box,
  Container,
  ContainerProps,
  Flex,
  FlexProps,
} from '@chakra-ui/react';
import Scrollbars from 'react-custom-scrollbars-2';

import {
  AppLayoutContextNavDisplayed,
  useAppLayoutHideNav,
} from '@/features/app/AppLayout';
import { trpc } from '@/lib/trpc/client';

type AppLayoutPageContextValue = {
  containerMaxWidth: ContainerProps['maxW'];
};

const AppLayoutPageContext =
  React.createContext<AppLayoutPageContextValue | null>(null);

const useAppLayoutPageContext = () => {
  const context = useContext(AppLayoutPageContext);
  if (context === null) {
    throw new Error('Missing parent <AppLayoutPage> component');
  }
  return context;
};

const PageContainer = ({ children, maxW, ...rest }: ContainerProps) => {
  const { containerMaxWidth } = useAppLayoutPageContext();

  return (
    <Container
      display="flex"
      flexDirection="column"
      flex="1"
      w="full"
      maxW={maxW ?? containerMaxWidth}
      {...rest}
    >
      {children}
    </Container>
  );
};

type AppLayoutPageProps = FlexProps & {
  showNavBar?: AppLayoutContextNavDisplayed;
  containerMaxWidth?: ContainerProps['maxW'];
  containerProps?: ContainerProps;
  nav?: React.ReactNode;
};

export const AppLayoutPage = ({
  showNavBar = true,
  containerMaxWidth = 'container.md',
  containerProps,
  children,
  ...rest
}: AppLayoutPageProps) => {
  useAppLayoutHideNav(showNavBar);

  const value = useMemo(
    () => ({
      containerMaxWidth,
    }),
    [containerMaxWidth]
  );

  const updateActivity = trpc.dashboard.updateActivity.useMutation();

  useEffect(() => {
    // 사용자 활동 감지 및 서버에 알림
    const updateLastActivity = () => {
      updateActivity.mutate();
    };

    // 이벤트 리스너 등록
    const events = [
      'mousedown',
      'keydown',
      'scroll',
      'mousemove',
      'touchstart',
    ];
    events.forEach((event) => {
      document.addEventListener(event, updateLastActivity);
    });

    // 초기 활동 시간 설정
    updateLastActivity();

    // 30분마다 주기적으로 활동 시간 업데이트
    const interval = setInterval(updateLastActivity, 1800000);

    // 클린업
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateLastActivity);
      });
      clearInterval(interval);
    };
  }, [updateActivity]);

  return (
    <AppLayoutPageContext.Provider value={value}>
      <Flex
        position="relative"
        pt="safe-top"
        as={Scrollbars}
        direction="column"
        flex={1}
        __css={{
          '& > *': {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          },
        }}
        {...rest}
      >
        <PageContainer pt={4} pb={16} {...containerProps}>
          {children}
        </PageContainer>
        <Box w="full" h="0" pb="safe-bottom" />
      </Flex>
    </AppLayoutPageContext.Provider>
  );
};
