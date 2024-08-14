import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { useFormContext } from 'react-hook-form';

import { env } from '@/env.mjs';

import { VALIDATION_PASSWORD_MOCKED } from '../auth/utils';

export const LoginHint = () => {
  const form = useFormContext();
  const mockedId = 'admin';
  const mockedPw = VALIDATION_PASSWORD_MOCKED;

  if (env.NEXT_PUBLIC_NODE_ENV !== 'development' && !env.NEXT_PUBLIC_IS_DEMO)
    return null;

  return (
    <Alert status="info">
      <AlertIcon />
      <AlertTitle textTransform="capitalize">
        {env.NEXT_PUBLIC_IS_DEMO ? 'Demo mode' : env.NEXT_PUBLIC_NODE_ENV}
      </AlertTitle>
      <AlertDescription>
        Enjoy the features! You can sign in with{' '}
        <ChakraLink
          as="button"
          type="button"
          fontWeight="bold"
          onClick={() => {
            form.setValue('id', mockedId);
            form.setValue('password', mockedPw);
          }}
        >
          {mockedId}
        </ChakraLink>
      </AlertDescription>
    </Alert>
  );
};
