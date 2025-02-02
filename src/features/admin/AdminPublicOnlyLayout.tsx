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
        <Box px="4" py="4rem" w="22rem" maxW="full" m="auto" width={800}>
          <Flex pb={8} justifyContent="center" width={800}>
            <Flex>
              <Text fontSize="6xl" fontWeight={100} textAlign="center" mr={4}>
                Welcome to
              </Text>
              <Text fontSize="6xl" textAlign="center" mr={5}>
                EntaSys
              </Text>
            </Flex>
          </Flex>
          <Flex justifyContent="center">{children}</Flex>
        </Box>
      </SlideIn>
    </Viewport>
  );
};
