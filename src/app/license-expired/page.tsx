'use client';

import { Button, Flex, Heading, Text, useColorMode } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

export default function LicenseExpiredPage() {
  const router = useRouter();
  const { colorMode } = useColorMode();
  return (
    <Flex direction="column" align="center" justify="center" h="100vh" gap={4}>
      <Heading size="lg">라이센스가 만료되었습니다</Heading>
      <Text>서비스를 계속 사용하시려면 관리자에게 문의하세요.</Text>
      <Text fontSize="sm" color="gray.500">
        라이센스 갱신 후 다시 시도해 주세요.
      </Text>
      <Button
        colorScheme={colorMode === 'light' ? 'teal' : 'gray'}
        onClick={() => router.push('/')}
        mt={4}
      >
        메인으로 돌아가기
      </Button>
    </Flex>
  );
}
