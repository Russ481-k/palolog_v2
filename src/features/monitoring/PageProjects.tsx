'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';

import {
  Button,
  Flex,
  Heading,
  Stack,
  useColorMode,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CellClickedEvent,
  ColDef,
  ValueFormatterParams,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
// Core CSS
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';

import { Form, FormField } from '@/components/Form';
import { SearchInput } from '@/components/SearchInput';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';
import { trpc } from '@/lib/trpc/client';

import { PageProjectsFooter } from './PageProjectsFooter';
import { colDefs } from './colDefs';
import { dummy } from './dummy';
import { FormFieldsPaloLogsParams, zLogs, zPaloLogsParams } from './schemas';

export default function PageProjects() {
  const { colorMode } = useColorMode();

  const nowTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const beforeHourTime = dayjs()
    .set('minute', dayjs().minute() - 1)
    .format('YYYY-MM-DD HH:mm:ss');

  const form = useForm<FormFieldsPaloLogsParams>({
    mode: 'onSubmit',
    resolver: zodResolver(zPaloLogsParams()),
    defaultValues: {
      timeFrom: String(beforeHourTime),
      timeTo: String(nowTime),
      currentPage: 1,
      limit: 100,
    },
  });

  const [limit, setLimit] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [nextSearchTerm, setNextSearchTerm] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFromDate, setSelectedFromDate] =
    useState<string>(beforeHourTime);
  const [selectedToDate, setSelectedToDate] = useState<string>(nowTime);
  const gridRef = useRef<AgGridReact<ColDef<zLogs>[]>>(null);
  const toast = useToast();
  const { data, isLoading } = trpc.projects.getAll.useInfiniteQuery(
    {
      timeFrom: dayjs(selectedFromDate).format('YYYY-MM-DD HH:mm:ss'),
      timeTo: dayjs(selectedToDate).format('YYYY-MM-DD HH:mm:ss'),
      limit,
      searchTerm,
      currentPage,
    },
    {}
  );

  const onSubmit = (
    timeFrom: string,
    timeTo: string,
    limit: number,
    searchTerm: string
  ) => {
    onFromDateChanged(timeFrom);
    onToDateChanged(timeTo);
    onSearchInputChanged(searchTerm);
    setLimit(limit);
  };

  const onRowLoadLimitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
  };

  const onSearchInputChanged = (e: string) => {
    setSearchTerm(e);
  };
  const onFromDateChanged = (e: string) => {
    setSelectedFromDate(e);
  };
  const onToDateChanged = (e: string) => {
    setSelectedToDate(e);
  };
  const onCurrentPageChange = (currentPage: number) => {
    setCurrentPage(currentPage);
  };

  const onCellClickChanged = (
    event: CellClickedEvent<zLogs>,
    dateType: 'Y' | 'N'
  ) => {
    if (isLoading) return;
    let eventValue = event.value;
    const eventColDef = event.colDef.field
      ?.replace(/[A-Z]/g, (letter) => `_${letter}`)
      .toUpperCase();

    if (dateType === 'Y') {
      eventValue = dayjs(new Date(event.value / 1000000)).format(
        'YYYY-MM-DD HH:mm:ss'
      );
      const newDateTypeTerm =
        ' AND ' + eventColDef + " = TO_DATE('" + eventValue + "')";
      return setNextSearchTerm(newDateTypeTerm);
    } else if (dateType === 'N') {
      const newTerm = ' AND ' + eventColDef + " = '" + eventValue + "'";
      setNextSearchTerm(newTerm);
    }
  };
  const timeFormatter = (event: ValueFormatterParams<zLogs>) => {
    if (Number(event.value) < 1000000) {
      return '-';
    } else {
      return dayjs(event.value / 1000000).format('YYYY-MM-DD HH:mm:ss');
    }
  };

  useEffect(() => {
    if (!nextSearchTerm) return;
    if (searchTerm.includes(nextSearchTerm)) {
      toast({
        position: 'top-right',
        title: 'Duplication',
        description: 'This is a search condition that has already been added.',
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } else {
      toast({
        position: 'top-right',
        title: 'Added',
        description: 'Search conditions added.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setSearchTerm(searchTerm + nextSearchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSearchTerm]);

  // useEffect(() => {
  //   if (!!selectedFromDate) {
  //     onFromTimeChanged(dayjs(selectedFromDate));
  //   } else {
  //     onFromTimeChanged(dayjs(new Date().getTime()));
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedFromDate]);

  // useEffect(() => {
  //   if (!!selectedToDate) {
  //     onToTimeChanged(dayjs(selectedToDate));
  //   } else {
  //     onToTimeChanged(dayjs(new Date().getTime()));
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedToDate]);
  console.log();
  // console.log(
  //   dayjs(selectedToDate ?? new Date().getTime()).format('YYYY-MM-DD HH:mm:ss'),
  //   dayjs(selectedFromDate ?? new Date().getTime()).format(
  //     'YYYY-MM-DD HH:mm:ss'
  //   )
  // );
  return (
    <AdminLayoutPage>
      <AdminLayoutPageContent>
        <Form
          {...form}
          onSubmit={(values) => {
            onSubmit(
              values.timeFrom,
              values.timeTo,
              values.currentPage,
              values.searchTerm
            );
          }}
        >
          <Stack spacing={3}>
            <Flex justifyContent="space-between" gap={3}>
              <Flex
                flexDirection={{ base: 'column', md: 'row' }}
                alignItems={{ base: 'start', md: 'center' }}
                gap={2}
              >
                <Heading flex="none" fontSize="24px" color="gray.400">
                  TRAFFIC
                </Heading>
                <Flex gap={2}>
                  <FormField
                    type="date"
                    control={form.control}
                    name="timeFrom"
                  />
                  <Heading color="gray.500" flex="none" size="sm" py="5px">
                    ~
                  </Heading>
                  <FormField type="date" control={form.control} name="timeTo" />
                </Flex>
              </Flex>
              <Flex w="100%">
                <SearchInput
                  size="sm"
                  name="searchTerm"
                  value={searchTerm}
                  onChange={onSearchInputChanged}
                  maxW="100%"
                  borderRightRadius={0}
                />
                <Button
                  h="32px"
                  w="4.5rem"
                  size="xs"
                  borderLeftRadius={0}
                  onClick={() => {}}
                >
                  Search
                </Button>
              </Flex>
            </Flex>
            <div
              className={
                colorMode === 'light'
                  ? 'ag-theme-quartz'
                  : 'ag-theme-quartz-dark'
              }
              style={{ width: '100%', height: '79vh' }}
            >
              {/*//@ts-expect-error Note: AgGridReact타입 충돌 예방으로 ts-expect-error 를 사용*/}
              <AgGridReact
                ref={gridRef}
                rowData={!isLoading ? data?.pages[0]?.logs : dummy}
                columnDefs={colDefs(
                  !isLoading,
                  onCellClickChanged,
                  timeFormatter
                )}
              />
            </div>
            <PageProjectsFooter
              isLoading={isLoading}
              currentPage={data?.pages[0]?.pagination.currentPage ?? 0}
              pageLength={data?.pages[0]?.pagination.pageLength ?? 0}
              totalCnt={data?.pages[0]?.pagination.totalCnt ?? 0}
              onChangeLimit={onRowLoadLimitChange}
              onCurrentPageChange={onCurrentPageChange}
            />
          </Stack>
        </Form>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
