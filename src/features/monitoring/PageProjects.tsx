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
import { FormFieldsPaloLogsParams, zLogs, zPaloLogsParams } from './schemas';
import { columnNames } from './versions/11.0/colNameList_11.0';
import { dummy } from './versions/11.0/dummy_11.0';

export default function PageProjects() {
  const { colorMode } = useColorMode();

  const now = dayjs().subtract(1, 'minute').format('YYYY-MM-DD HH:mm:ss');
  const beforeMinuteTime = dayjs()
    .subtract(2, 'minute')
    .format('YYYY-MM-DD HH:mm:ss');

  const form = useForm<FormFieldsPaloLogsParams>({
    mode: 'onSubmit',
    resolver: zodResolver(zPaloLogsParams()),
    defaultValues: {
      timeFrom: String(beforeMinuteTime),
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
    useState<string>(beforeMinuteTime);
  const [selectedToDate, setSelectedToDate] = useState<string>(now);
  const [progress, setProgress] = useState<{
    progress: number;
    current: number;
    total: number;
    status: 'ready' | 'loading' | 'complete' | 'error';
  }>({
    progress: 0,
    current: 0,
    total: 0,
    status: 'complete',
  });
  const [searchId, setSearchId] = useState<string>('');

  const gridRef = useRef<AgGridReact<zLogs>>(null);
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
    {
      onSuccess: (data) => {
        console.log('[PageProjects] OpenSearch response:', data);
        // Try to get scroll ID from the response metadata first
        const metaScrollId = data.pages[0]?.scrollId;
        if (metaScrollId) {
          console.log(
            '[PageProjects] Found scroll ID in metadata:',
            metaScrollId
          );
          setSearchId(metaScrollId);
          return;
        }

        // Fallback to checking logs if metadata doesn't have scroll ID
        const scrollId = data.pages[0]?.logs[0]?._scroll_id;
        console.log('[PageProjects] Setting searchId:', scrollId);
        if (scrollId) {
          setSearchId(scrollId);
        } else {
          console.warn('[PageProjects] No scroll ID found in response');
        }
      },
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

  const validateTimeFormat = (timeStr: string) => {
    const date = dayjs(timeStr);
    return (
      date.isValid() && timeStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    );
  };

  const checkAndAdjustTimeRange = (
    fromDate: dayjs.Dayjs,
    toDate: dayjs.Dayjs
  ) => {
    const diffHours = toDate.diff(fromDate, 'hour');
    if (diffHours > 12) {
      const adjustedToDate = fromDate.add(12, 'hour');
      const formattedToDate = adjustedToDate.format('YYYY-MM-DD HH:mm:ss');

      toast({
        position: 'top-right',
        title: '시간 범위 제한',
        description: `최대 조회 시간은 12시간 입니다. ${formattedToDate}로 변경되었습니다.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      form.setValue('timeTo', formattedToDate);
      onToDateChanged(formattedToDate);
      return true;
    }
    return false;
  };

  const onSubmit = (
    timeFrom: string,
    timeTo: string,
    currentPage: number,
    searchTerm: string
  ) => {
    // 시간 포맷 검증
    if (!validateTimeFormat(timeFrom) || !validateTimeFormat(timeTo)) {
      toast({
        position: 'top-right',
        title: '잘못된 시간 형식',
        description:
          '올바른 시간 형식(YYYY-MM-DD HH:mm:ss)이 아닙니다. 초기값으로 되돌립니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      const now = dayjs().subtract(1, 'minute').format('YYYY-MM-DD HH:mm:ss');
      const beforeMinute = dayjs()
        .subtract(2, 'minute')
        .format('YYYY-MM-DD HH:mm:ss');

      form.setValue('timeFrom', beforeMinute);
      form.setValue('timeTo', now);
      onFromDateChanged(beforeMinute);
      onToDateChanged(now);
      return;
    }

    const fromDate = dayjs(timeFrom);
    const toDate = dayjs(timeTo);

    // 시간 순서가 반대인 경우 처리
    if (fromDate.isAfter(toDate)) {
      toast({
        position: 'top-right',
        title: '시간 범위 조정',
        description:
          '시작 시간이 종료 시간보다 늦을 수 없습니다. 시간이 자동으로 조정되었습니다.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });

      // from과 to 값을 교체하고 12시간 제한 체크
      const swappedFromDate = toDate;
      const swappedToDate = fromDate;

      form.setValue('timeFrom', swappedFromDate.format('YYYY-MM-DD HH:mm:ss'));
      form.setValue('timeTo', swappedToDate.format('YYYY-MM-DD HH:mm:ss'));
      onFromDateChanged(swappedFromDate.format('YYYY-MM-DD HH:mm:ss'));

      // 12시간 제한 체크 및 조정
      checkAndAdjustTimeRange(swappedFromDate, swappedToDate);
      return;
    }

    // 12시간 제한 체크
    if (checkAndAdjustTimeRange(fromDate, toDate)) {
      return;
    }

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
    if (!validateTimeFormat(e)) {
      toast({
        position: 'top-right',
        title: '잘못된 시간 형식',
        description:
          '올바른 시간 형식(YYYY-MM-DD HH:mm:ss)이 아닙니다. 이전 값으로 되돌립니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      form.setValue('timeFrom', selectedFromDate);
      return;
    }

    const fromDate = dayjs(e);
    const toDate = dayjs(selectedToDate);

    if (fromDate.isAfter(toDate)) {
      const newToDate = fromDate.format('YYYY-MM-DD HH:mm:ss');
      form.setValue('timeTo', newToDate);
      setSelectedToDate(newToDate);
      toast({
        position: 'top-right',
        title: '시간 범위 조정',
        description:
          '시작 시간이 종료 시간보다 늦을 수 없습니다. 종료 시간이 자동으로 조정되었습니다.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    } else {
      // 시간 순서는 올바르지만 12시간 제한 체크
      checkAndAdjustTimeRange(fromDate, toDate);
    }
    setSelectedFromDate(e);
  };
  const onToDateChanged = (e: string) => {
    if (!validateTimeFormat(e)) {
      toast({
        position: 'top-right',
        title: '잘못된 시간 형식',
        description:
          '올바른 시간 형식(YYYY-MM-DD HH:mm:ss)이 아닙니다. 이전 값으로 되돌립니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      form.setValue('timeTo', selectedToDate);
      return;
    }

    const toDate = dayjs(e);
    const fromDate = dayjs(selectedFromDate);

    if (toDate.isBefore(fromDate)) {
      const newFromDate = toDate.format('YYYY-MM-DD HH:mm:ss');
      form.setValue('timeFrom', newFromDate);
      setSelectedFromDate(newFromDate);
      toast({
        position: 'top-right',
        title: '시간 범위 조정',
        description:
          '종료 시간이 시작 시간보다 빠를 수 없습니다. 시작 시간이 자동으로 조정되었습니다.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    } else {
      // 시간 순서는 올바르지만 12시간 제한 체크
      checkAndAdjustTimeRange(fromDate, toDate);
    }
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

  const searchParams = {
    timeFrom: selectedFromDate,
    timeTo: selectedToDate,
    menu,
    searchTerm: form.getValues('searchTerm') || '',
  };

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
          <Stack spacing={2} h="calc(100vh - 100px)">
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
              style={{
                width: '100%',
                height: 'calc(100vh - 160px)',
                zIndex: 0,
              }}
              className={`ag-theme-quartz${colorMode === 'dark' ? '-dark' : ''}`}
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
                    params.api.getAllGridColumns()?.forEach((column) => {
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
              searchId={searchId}
              searchParams={searchParams}
              loadingProgress={progress}
            />
          </Stack>
        </Form>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
