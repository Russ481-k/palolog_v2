import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';

export default function Error() {
  const router = useRouter();

  return (
    <Box textAlign="center" py={10}>
      <Heading>Something went wrong!</Heading>
      <Text mt={4}>An error has occurred.</Text>
      <Button onClick={() => router.push('/')} mt={4}>
        Return Home
      </Button>
    </Box>
  );
}
