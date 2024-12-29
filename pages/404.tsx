import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function NotFound() {
  const router = useRouter();

  return (
    <Box textAlign="center" py={10}>
      <Heading>Page Not Found</Heading>
      <Text mt={4}>The page you are looking for does not exist.</Text>
      <Button onClick={() => router.push('/')} mt={4}>
        Return Home
      </Button>
    </Box>
  );
}
