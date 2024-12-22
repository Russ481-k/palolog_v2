'use client';

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  Flex,
  Heading,
  Stack,
  useColorMode,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CellClickedEvent, ValueFormatterParams } from 'ag-grid-community';
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
import { columnNames } from './colNameList';
import { dummy } from './dummy';
import { FormFieldsPaloLogsParams, zLogs, zPaloLogsParams } from './schemas';

export default function PageProjects() {
  const { colorMode } = useColorMode();

  const now = dayjs().subtract(10, 'second').format('YYYY-MM-DD HH:mm:ss');
  const beforeHourTime = dayjs()
    .subtract(1, 'minute')
    .format('YYYY-MM-DD HH:mm:ss');

  const form = useForm<FormFieldsPaloLogsParams>({
    mode: 'onSubmit',
    resolver: zodResolver(zPaloLogsParams()),
    defaultValues: {
      timeFrom: String(beforeHourTime),
      timeTo: String(now),
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
  const [selectedToDate, setSelectedToDate] = useState<string>(now);
  const [progress, setProgress] = useState<{
    progress: number;
    current: number;
    total: number;
    status: string;
  }>({
    progress: 0,
    current: 0,
    total: 0,
    status: 'complete',
  });

  const gridRef = useRef<AgGridReact<zLogs>>(null);
  const toast = useToast();

  useEffect(() => {
    console.log('Setting up WebSocket subscription');

    // trpc.projects.onProgress.useSubscription(undefined, {
    //   onData(data: {
    //     progress: number;
    //     current: number;
    //     total: number;
    //     status: string;
    //   }) {
    //     console.log('Client received progress:', data);
    //     setProgress(data);
    //   },
    //   onError(err: TRPCClientErrorLike<AppRouter>) {
    //     console.error('WebSocket error:', err);
    //   },
    // });

    return () => {
      console.log('Cleaning up subscription');
    };
  }, []);

  useEffect(() => {
    console.log('Current progress state:', progress);
  }, [progress]);

  const { data, isLoading } = trpc.projects.getAll.useInfiniteQuery(
    {
      menu,
      timeFrom: dayjs(selectedFromDate).format('YYYY-MM-DD HH:mm:ss'),
      timeTo: dayjs(selectedToDate).format('YYYY-MM-DD HH:mm:ss'),
      searchTerm,
      currentPage: nextCurrentPage,
      limit,
    },
    {
      onSettled: () => {
        setProgress({
          progress: 100,
          current: 0,
          total: 0,
          status: 'complete',
        });
      },
      onError: () => {
        setProgress({
          progress: 0,
          current: 0,
          total: 0,
          status: 'error',
        });
      },
    }
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

  const updateColumnVisibility = useCallback((logs: zLogs[]) => {
    if (!logs?.length) return;

    const columnsToShow = columnNames.filter((columnName) => {
      return logs.some((log: zLogs) => {
        const value = log[columnName as keyof zLogs];
        return value !== null && value !== undefined && value !== '-';
      });
    });

    if (gridRef.current?.api) {
      const columnState = columnNames.map((columnName) => ({
        colId: columnName,
        hide: !columnsToShow.includes(columnName),
      }));
      gridRef.current.api.applyColumnState({ state: columnState });
    }
  }, []);

  useEffect(() => {
    const logs = data?.pages[0]?.logs?.filter(
      (log: unknown): log is zLogs => log !== null && log !== undefined
    );
    if (logs?.length) {
      updateColumnVisibility(logs);
    }
  }, [updateColumnVisibility, data?.pages]);

  useEffect(() => {
    if (isLoading) {
      setProgress({
        progress: 0,
        current: 0,
        total: 0,
        status: 'loading',
      });
    }
  }, [isLoading]);

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
          <Stack spacing={2} h="88vh">
            <Flex
              justifyContent="space-between"
              h="24px"
              gap={3}
              alignItems="center"
            >
              <Flex
                flexDirection={{ base: 'column', md: 'row' }}
                alignItems={{ base: 'start', md: 'center' }}
                gap={3}
              >
                <MenuSetter
                  menu={menu}
                  handleSetMenuChange={handleSetMenuChange}
                />
                <Flex gap={1}>
                  <FormField
                    control={form.control}
                    name="timeFrom"
                    size="xs"
                    type="text"
                    width="140px"
                  />
                  <Heading color="gray.500" flex="none" size="xs" py="3px">
                    ~
                  </Heading>
                  <FormField
                    control={form.control}
                    name="timeTo"
                    size="xs"
                    type="text"
                    width="140px"
                  />
                </Flex>
              </Flex>
              <Flex w="100%">
                <FormField
                  type="search-input"
                  size="xs"
                  borderRightRadius={0}
                  control={form.control}
                  name="searchTerm"
                />
                <Button type="submit" w="4.5rem" size="xs" borderLeftRadius={0}>
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
              style={{ width: '100%', height: '82vh', zIndex: 0 }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={!isLoading ? data?.pages[0]?.logs : dummy}
                columnDefs={colDefs(
                  menu,
                  !isLoading,
                  onCellClickChanged,
                  timeFormatter
                )}
                rowHeight={26}
                headerHeight={26}
                onGridReady={(params) => {
                  setTimeout(() => {
                    const allColumnIds: string[] = [];
                    params.api.getAllGridColumns().forEach((column) => {
                      allColumnIds.push(column.getId());
                    });
                    params.api.autoSizeColumns(allColumnIds);
                  }, 100);
                }}
              />
            </div>
            <PageProjectsFooter
              isLoading={isLoading}
              nextCurrentPage={nextCurrentPage}
              pageLength={pageLengthBuf}
              totalCnt={totalCnt}
              onChangeLimit={onRowLoadLimitChange}
              onCurrentPageChange={onCurrentPageChange}
              // scrollProgress={progress}
            />
          </Stack>
        </Form>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
