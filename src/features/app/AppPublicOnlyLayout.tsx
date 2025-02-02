'use client';

import { ReactNode } from 'react';

import { Box, Center, Flex, Text } from '@chakra-ui/react';

import { SlideIn } from '@/components/SlideIn';

type AppPublicOnlyLayout = {
  children: ReactNode;
};

export const AppPublicOnlyLayout = ({ children }: AppPublicOnlyLayout) => {
  return (
    <Flex flex={1} minW={0}>
      <Center
        flex={1}
        display={{ base: 'none', md: 'flex' }}
        color="white"
        bg="gray.900"
        _dark={{
          bg: 'gray.800',
        }}
      >
        <Text fontSize="3xl" as="b" w="16rem" mb="8" mx="auto" my={4}>
          EntaSys
        </Text>
      </Center>
      <Flex flex={1} minW={0} bg="gray.50" _dark={{ bg: 'gray.900' }}>
        <SlideIn>
          <Box px="4" py="4rem" w="22rem" maxW="full" m="auto">
            <Text
              fontSize="5xl"
              w="12rem"
              mb="8"
              mx="auto"
              display={{ base: 'block', md: 'none' }}
              my={4}
            >
              EntaSys
            </Text>
            {children}
          </Box>
        </SlideIn>
      </Flex>
    </Flex>
  );
};
