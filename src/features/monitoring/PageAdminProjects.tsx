import { useState } from 'react';

import { Button, Flex, Heading, Stack } from '@chakra-ui/react';
import { useQueryState } from 'nuqs';

import {
  DataList,
  DataListCell,
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListText,
} from '@/components/DataList';
import { DayPicker } from '@/components/DayPicker';
import { SearchInput } from '@/components/SearchInput';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';
import { trpc } from '@/lib/trpc/client';

export default function PageAdminProjects() {
  const [searchTerm, setSearchTerm] = useQueryState('s', { defaultValue: '' });
  const [selectedDayFrom, setSelectedDayFrom] = useState<Date | null>(
    new Date()
  );
  const [selectedDayTo, setSelectedDayTo] = useState<Date | null>(new Date());

  // <Text>Date : {JSON.stringify(selectedDay)}</Text>
  const projects = trpc.projects.getAll.useInfiniteQuery(
    {
      searchTerm,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  console.log('searchTermsearchTerm', searchTerm);
  return (
    <AdminLayoutPage>
      <AdminLayoutPageContent>
        <Stack spacing={4}>
          <Heading flex="none" size="md">
            Projects
          </Heading>
          <Flex
            flexDirection={{ base: 'column', md: 'row' }}
            alignItems={{ base: 'start', md: 'center' }}
            gap={4}
          >
            <Flex gap={4}>
              <Heading flex="none" size="sm">
                From
              </Heading>
              <DayPicker
                value={selectedDayFrom}
                onChange={setSelectedDayFrom}
              />
              <Heading flex="none" size="sm">
                To
              </Heading>
              <DayPicker value={selectedDayTo} onChange={setSelectedDayTo} />
            </Flex>
            <SearchInput
              value={searchTerm}
              onChange={(value) => setSearchTerm(value || null)}
              size="md"
              maxW={{ base: 'none', md: '20rem' }}
            />
          </Flex>
          <DataList height="80vh" overflow="scroll">
            {projects.isLoading && <DataListLoadingState />}
            {projects.isError && (
              <DataListErrorState retry={() => projects.refetch()} />
            )}
            {projects.isSuccess &&
              !projects.data.pages.flatMap((p) => p.items).length && (
                <DataListEmptyState searchTerm={searchTerm} />
              )}
            {projects.data?.pages
              .flatMap((p) => p.items)
              .map((project) => (
                <DataListRow key={project.id}>
                  <DataListCell>
                    <DataListText fontWeight="bold">
                      {project.name}
                    </DataListText>
                  </DataListCell>
                  <DataListCell>
                    <DataListText color="text-dimmed">
                      {project.description}
                    </DataListText>
                  </DataListCell>
                </DataListRow>
              ))}
            {projects.isSuccess && (
              <DataListRow mt="auto">
                <DataListCell>
                  <Button
                    size="sm"
                    onClick={() => projects.fetchNextPage()}
                    isLoading={projects.isFetchingNextPage}
                    isDisabled={!projects.hasNextPage}
                  >
                    Load more
                  </Button>
                </DataListCell>
              </DataListRow>
            )}
          </DataList>
        </Stack>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
