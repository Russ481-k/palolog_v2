'use client';

import { ChangeEvent, useRef, useState } from 'react';

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  Stack,
  useColorMode,
  useDisclosure,
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();

  const nowTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const beforeHourTime = dayjs()
    .set('minute', dayjs().minute() - 1)
    .format('YYYY-MM-DD HH:mm:ss');
  const nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss');

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
      timeFrom: dayjs(selectedFromDate).format('YYYY-MM-DD HH:mm:ss'),
      timeTo: dayjs(selectedToDate).format('YYYY-MM-DD HH:mm:ss'),
      searchTerm,
      currentPage: nextCurrentPage,
      limit,
    },
    {}
  );

  const currentPage = data?.pages[0]?.pagination.currentPage ?? 1;
  const pageLength = data?.pages[0]?.pagination.pageLength ?? 1;
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
    if (page > pageLength) {
      setNextCurrentPage(pageLength);
    } else {
      setNextCurrentPage(page);
    }
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
    let nextSearchTermChecker = '';

    if (dateType === 'Y') {
      eventValue = dayjs(new Date(event.value / 1000000)).format(
        'YYYY-MM-DD HH:mm:ss'
      );
      const newDateTypeTerm =
        ' AND ' + eventColDef + " = TO_DATE('" + eventValue + "')";
      nextSearchTermChecker = newDateTypeTerm;
    } else if (dateType === 'N') {
      const newTerm = ' AND ' + eventColDef + " = '" + eventValue + "'";

      nextSearchTermChecker = newTerm;
    }
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
                <Flex>
                  <Button
                    fontSize="24px"
                    size="sm"
                    color="gray.400"
                    onClick={onOpen}
                  >
                    TRAFFIC
                  </Button>
                  <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
                    <DrawerOverlay />
                    <DrawerContent>
                      <DrawerCloseButton />
                      <DrawerHeader>Monitoring Menu</DrawerHeader>
                      <DrawerBody>
                        <Flex flexDir="column" gap={2}>
                          <Button fontSize="18px" size="sm" p={4}>
                            TRAFFIC
                          </Button>
                          <Button fontSize="18px" size="sm" p={4}>
                            TREAT
                          </Button>
                          <Button fontSize="18px" size="sm" p={4}>
                            GLOBAL PROTECT
                          </Button>
                          <Button fontSize="18px" size="sm" p={4}>
                            WILD FIRE
                          </Button>
                        </Flex>
                      </DrawerBody>

                      <DrawerFooter>
                        {/* <Button variant="outline" mr={3} onClick={onClose}>
                          Cancel
                        </Button>
                        <Button colorScheme="blue">Save</Button> */}
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                </Flex>
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
                  !isLoading,
                  onCellClickChanged,
                  timeFormatter
                )}
              />
            </div>
            <PageProjectsFooter
              isLoading={isLoading}
              currentPage={currentPage}
              nextCurrentPage={nextCurrentPage}
              pageLength={pageLength}
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
