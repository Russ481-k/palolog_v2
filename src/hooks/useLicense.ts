import { useEffect } from 'react';

import { useToast } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

import { trpc } from '@/lib/trpc/client';

export function useLicense() {
  const toast = useToast();
  const router = useRouter();
  const { data: license } = trpc.license.check.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // 5분마다 체크
    retry: false,
    onError: () => {
      router.push('/license-expired');
    },
  });

  useEffect(() => {
    if (license?.shouldWarn) {
      toast({
        id: 'license-warning',
        title: '라이센스 만료 예정',
        description: `라이센스가 ${license.daysLeft}일 후 만료됩니다.`,
        status: 'warning',
        duration: null,
        isClosable: true,
        position: 'top-right',
      });
    }

    if (license?.isExpired) {
      router.push('/license-expired');
    }
  }, [license, toast, router]);

  return license;
}
