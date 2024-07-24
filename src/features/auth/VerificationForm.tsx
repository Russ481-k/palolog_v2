import { useQueryClient } from '@tanstack/react-query';
import { TRPCClientErrorLike } from '@trpc/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useTranslation } from 'react-i18next';

import { getValidationRetryDelayInSeconds } from '@/features/auth/utils';
import { trpc } from '@/lib/trpc/client';
import { AppRouter } from '@/lib/trpc/types';

export const useOnVerificationSuccess = ({
  defaultRedirect = '/',
}: {
  defaultRedirect: string;
}) => {
  const router = useRouter();
  const trpcUtils = trpc.useUtils();
  const queryCache = useQueryClient();
  const searchParams = useSearchParams();
  return async () => {
    queryCache.clear();

    // Optimistic Update
    trpcUtils.auth.checkAuthenticated.setData(undefined, {
      isAuthenticated: true,
    });

    router.push(searchParams.get('redirect') || defaultRedirect || '/');
  };
};

export const useOnVerificationError = ({
  onError,
}: {
  onError: (error: string) => void;
}) => {
  const { t } = useTranslation(['auth']);
  const [attempts, setAttemps] = useQueryState(
    'attemps',
    parseAsInteger.withDefault(0)
  );

  return async (error: TRPCClientErrorLike<AppRouter>) => {
    if (error.data?.code === 'UNAUTHORIZED') {
      const seconds = getValidationRetryDelayInSeconds(attempts);

      setAttemps((s) => s + 1);

      await new Promise((r) => {
        setTimeout(r, seconds * 1_000);
      });

      onError(t('auth:data.verificationCode.unknown'));

      return;
    }

    if (error.data?.code === 'BAD_REQUEST') {
      onError(t('auth:data.verificationCode.invalid'));
      return;
    }

    onError(t('auth:data.verificationCode.unknown'));
  };
};
