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
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';
import { useForm } from 'react-hook-form';

import { Form, FormField } from '@/components/Form';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';
import { trpc } from '@/lib/trpc/client';
import { MenuType } from '@/types/project';

import MenuSetter from './MenuSetter';
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
      searchTerm: '',
    },
  });

  const [menu, setMenu] = useState<MenuType>('TRAFFIC');
  const [pageLengthBuf, setPageLengthBuf] = useState<number>(1);
  const [limit, setLimit] = useState<number>(100);
  const [nextCurrentPage, setNextCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFromDate, setSelectedFromDate] =
    useState<string>(beforeHourTime);
  const [selectedToDate, setSelectedToDate] = useState<string>(nowTime);

  const gridRef = useRef<AgGridReact<ColDef<zLogs>[]>>(null);
  const toast = useToast();

  const { data, isLoading } = trpc.projects.getAll.useInfiniteQuery(
    {
      menu,
      timeFrom: dayjs(selectedFromDate).format('YYYY-MM-DD HH:mm:ss'),
      timeTo: dayjs(selectedToDate).format('YYYY-MM-DD HH:mm:ss'),
      searchTerm,
      currentPage: nextCurrentPage,
      limit,
    },
    {}
  );
  const pageLength = data?.pages[0]?.pagination.pageLength;
  const totalCnt = data?.pages[0]?.pagination.totalCnt ?? 0;

  const onSubmit = (
    timeFrom: string,
    timeTo: string,
    currentPage: number,
    searchTerm: string
  ) => {
    onFromDateChanged(timeFrom);
    onToDateChanged(timeTo);
    onSearchInputChanged(searchTerm);
    setNextCurrentPage(currentPage);
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
  const onCurrentPageChange = (page: number) => {
    if (page > pageLengthBuf) {
      setNextCurrentPage(pageLengthBuf);
    } else {
      setNextCurrentPage(page);
    }
  };

  const handleSetMenuChange = (e: MenuType) => {
    setMenu(e);
  };

  const onCellClickChanged = (event: CellClickedEvent<zLogs>) => {
    if (isLoading) return;

    const eventValue = event.value;
    const eventColDef = event.colDef.field;
    let nextSearchTermChecker = '';

    const newTerm = ' AND ' + eventColDef + " = '" + eventValue + "'";

    nextSearchTermChecker = newTerm;

    if (nextSearchTermChecker === '') return;

    const searchTermChecker = form.getValues('searchTerm');
    if (searchTermChecker?.includes(nextSearchTermChecker)) {
      toast({
        position: 'top-right',
        title: 'Duplication',
        description: 'This is a search condition that has already been added.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        position: 'top-right',
        title: 'Added',
        description: 'Search conditions added.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      form.setValue('searchTerm', searchTermChecker + nextSearchTermChecker);
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
    if (!!pageLength) {
      setPageLengthBuf(pageLength);
      setNextCurrentPage(nextCurrentPage);
    }
  }, [pageLength, nextCurrentPage, setPageLengthBuf, setNextCurrentPage]);

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
                <MenuSetter
                  menu={menu}
                  handleSetMenuChange={handleSetMenuChange}
                />
                <Flex gap={2}>
                  <FormField
                    control={form.control}
                    name="timeFrom"
                    size="sm"
                    type="text"
                    width="200px"
                  />
                  <Heading color="gray.500" flex="none" size="sm" py="5px">
                    ~
                  </Heading>
                  <FormField
                    control={form.control}
                    name="timeTo"
                    size="sm"
                    type="text"
                    width="200px"
                  />
                </Flex>
              </Flex>
              <Flex w="100%">
                <FormField
                  type="search-input"
                  size="sm"
                  borderRightRadius={0}
                  control={form.control}
                  name="searchTerm"
                />
                <Button
                  type="submit"
                  h="32px"
                  w="4.5rem"
                  size="xs"
                  borderLeftRadius={0}
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
              style={{ width: '100%', height: '79vh', zIndex: 0 }}
            >
              {/*//@ts-expect-error Note: AgGridReact타입 충돌 예방으로 ts-expect-error 를 사용*/}
              <AgGridReact
                ref={gridRef}
                rowData={!isLoading ? data?.pages[0]?.logs : dummy}
                columnDefs={colDefs(
                  menu,
                  !isLoading,
                  onCellClickChanged,
                  timeFormatter
                )}
              />
            </div>
            <PageProjectsFooter
              isLoading={isLoading}
              nextCurrentPage={nextCurrentPage}
              pageLength={pageLengthBuf}
              totalCnt={totalCnt}
              onChangeLimit={onRowLoadLimitChange}
              onCurrentPageChange={onCurrentPageChange}
            />
          </Stack>
        </Form>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
