'use client';

import { ReactNode } from 'react';

import { Box, Flex, Text } from '@chakra-ui/react';

import { SlideIn } from '@/components/SlideIn';
import { Viewport } from '@/components/Viewport';

type AdminPublicOnlyLayout = {
  children: ReactNode;
};

export const AdminPublicOnlyLayout = ({ children }: AdminPublicOnlyLayout) => {
  return (
    <Viewport bg="gray.50" _dark={{ bg: 'gray.900' }}>
      <SlideIn>
        <Box px="4" py="4rem" w="22rem" maxW="full" m="auto">
          <Flex pb={4}>
            <Text fontSize="3xl" as="b">
              PaloLog
            </Text>
          </Flex>
          {children}
        </Box>
      </SlideIn>
    </Viewport>
  );
};
