import React from 'react';

import {
  Avatar,
  Button,
  Flex,
  HStack,
  Heading,
  LinkBox,
  LinkOverlay,
  Stack,
  Tag,
  Text,
} from '@chakra-ui/react';
import { useQueryState } from 'nuqs';
import { Trans, useTranslation } from 'react-i18next';
import { LuPlus } from 'react-icons/lu';

import {
  DataList,
  DataListCell,
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListText,
} from '@/components/DataList';
import { ResponsiveIconButton } from '@/components/ResponsiveIconButton';
import { SearchInput } from '@/components/SearchInput';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';
import { LinkAdmin } from '@/features/admin/LinkAdmin';
import { AdminNav } from '@/features/management/ManagementNav';
import { trpc } from '@/lib/trpc/client';

export default function PageAdminMenus() {
  const { t } = useTranslation(['menus']);
  const [searchTerm, setSearchTerm] = useQueryState('s', { defaultValue: '' });

  const account = trpc.account.get.useQuery();

  // const menus = trpc.menus.getAll.useInfiniteQuery(
  //   { searchTerm },
  //   {
  //     getNextPageParam: (lastPage) => lastPage.nextCursor,
  //   }
  // );

  return (
    <AdminLayoutPage containerMaxWidth="container.xl" nav={<AdminNav />}>
      <AdminLayoutPageContent>
        <Stack spacing={4}>
          <HStack spacing={4} alignItems={{ base: 'end', md: 'center' }}>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              rowGap={2}
              columnGap={4}
              alignItems={{ base: 'start', md: 'center' }}
              flex={1}
            >
              <Heading flex="none" size="md">
                {/* {t('menus:list.title')} */}
              </Heading>
              <SearchInput
                size="sm"
                value={searchTerm}
                onChange={(value) => setSearchTerm(value || null)}
                maxW={{ base: 'none', md: '20rem' }}
              />
            </Flex>
            <ResponsiveIconButton
              as={LinkAdmin}
              href="/management/menus/create"
              variant="@primary"
              size="sm"
              icon={<LuPlus />}
            >
              {t('menus:list.actions.createMenu')}
            </ResponsiveIconButton>
          </HStack>

          <DataList></DataList>
        </Stack>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
