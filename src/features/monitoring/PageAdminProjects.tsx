'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SearchIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Stack,
  useColorMode,
} from '@chakra-ui/react';
import { CellClickedEvent, ColDef } from 'ag-grid-community';
// Theme
// React Grid Logic
import 'ag-grid-community/styles/ag-grid.css';
// Mandatory CSS required by the Data Grid
import 'ag-grid-community/styles/ag-theme-quartz.css';
// Core CSS
import { AgGridReact } from 'ag-grid-react';
import moment, { Moment } from 'moment';
import 'moment/locale/ko';
import { useQueryState } from 'nuqs';
import TimePicker from 'rc-time-picker';
import 'rc-time-picker/assets/index.css';

import { DayPicker } from '@/components/DayPicker';
import { SearchInput } from '@/components/SearchInput';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';
import { trpc } from '@/lib/trpc/client';

import { IRow, dummy } from './dummy';

// Row Data Interface

// Optional Theme applied to the Data Grid
export default function PageAdminProjects() {
  const { colorMode } = useColorMode();

  const now = new Date();

  // Row Data: The data to be displayed.
  const beforeHourTime: Moment = moment().subtract(1, 'hour');
  const nowTime: Moment = moment();

  // console.log(nowTime > beforeHourTime ? now : moment(now).subtract('1', 'M'));
  const [nextSearchTerm, setNextSearchTerm] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDayFrom, setSelectedDayFrom] = useState<Date | null>(
    new Date()
  );
  const [selectedTimeFrom, setSelectedTimeFrom] =
    useState<Moment>(beforeHourTime);
  const [selectedDayTo, setSelectedDayTo] = useState<Date | null>(new Date());
  const [selectedTimeTo, setSelectedTimeTo] = useState<Moment>(nowTime);

  const gridRef = useRef<AgGridReact<IRow>>(null);
  const projects = trpc.projects.getAll.useInfiniteQuery(
    {
      searchTerm,
    },
    {}
  );
  // console.log(moment(now).subtract('1', 'm').format('YYYY-MM-DD HH:mm:SS'));

  const onSearchInputChanged = (e: string) => {
    setSearchTerm(e);
  };

  const onCellClickChanged = (event: CellClickedEvent<IRow>) => {
    setNextSearchTerm(
      ' AND ' + event.colDef.field?.toUpperCase() + ' = "' + event.value + '"'
    );
  };
  const onFromTimeChanged = (event: Moment) => {
    setSelectedTimeFrom(event);
  };
  const onToTimeChanged = (event: Moment) => {
    setSelectedTimeTo(event);
  };

  const [colDefs, setColDefs] = useState<ColDef<IRow>[]>([
    {
      field: 'time',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'receiveTime',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'serial',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'hostid',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'type',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'subtype',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'src',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'dst',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'natsrc',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'natdst',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'rule',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'ruleUuid',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'srcuser',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'dstuser',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'app',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'zoneFrom',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'zoneTo',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'inboundIf',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'outboundIf',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'sessionid',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'repeatcnt',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'sport',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'dport',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'natsport',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'natdport',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'flags',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'proto',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'action',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'misc',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'threatid',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'thrCategory',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'severity',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'direction',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'bytes',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'bytesSent',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'bytesReceived',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'packets',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'pktsSent',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'pktsReceived',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'sessionEndReason',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'deviceName',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'eventid',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'object',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'module',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'opaque',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'srcloc',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'dstloc',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'urlIdx',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'category',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'urlCategoryList',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'domainEdl',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'reason',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'justification',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'subcategoryOfApp',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'categoryOfApp',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'technologyOfApp',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'riskOfApp',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
    {
      field: 'raw',
      minWidth: 50,
      width: 100,
      onCellClicked: onCellClickChanged,
    },
  ]);

  useEffect(() => {
    setSearchTerm(searchTerm + nextSearchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSearchTerm]);

  useEffect(() => {
    onFromTimeChanged(moment(selectedDayFrom));
    console.log(
      'selectedTimeFrom',
      selectedTimeFrom.format('YYYY-MM-DD HH:mm:SS')
    );
  }, [selectedDayFrom]);

  useEffect(() => {
    onToTimeChanged(moment(selectedDayTo));
    console.log('selectedTimeTo', selectedTimeTo.format('YYYY-MM-DD HH:mm:SS'));
  }, [selectedDayTo]);

  return (
    <AdminLayoutPage>
      <AdminLayoutPageContent>
        <Stack spacing={2}>
          <Flex justifyContent="space-between">
            <Flex
              flexDirection={{ base: 'column', md: 'row' }}
              alignItems={{ base: 'start', md: 'center' }}
              gap={4}
            >
              <Heading flex="none" fontSize="40px" color="gray.400">
                TRAFFIC
              </Heading>
              <Flex gap={2}>
                <Box color="gray.500" textAlign="right">
                  <Heading flex="none" size="sm">
                    From
                  </Heading>
                  <Heading flex="none" size="sm">
                    {'~ To'}
                  </Heading>
                </Box>
                <Box w="180px" h="100%" textAlign="center">
                  <DayPicker
                    value={selectedDayFrom}
                    onChange={setSelectedDayFrom}
                  />
                </Box>
                <Box w="180px" h="100%">
                  <TimePicker
                    clearIcon={<></>}
                    value={selectedTimeFrom}
                    onChange={onFromTimeChanged}
                  />
                </Box>
                <Heading color="gray.500" flex="none" size="sm" pt="10px">
                  ~
                </Heading>
                <Box w="180px" h="100%" textAlign="center">
                  <DayPicker
                    value={selectedDayTo}
                    onChange={setSelectedDayTo}
                  />
                </Box>
                <Box w="180px" h="100%">
                  <TimePicker
                    clearIcon={<></>}
                    value={selectedTimeTo}
                    onChange={onToTimeChanged}
                  />
                </Box>
              </Flex>
            </Flex>
          </Flex>
          <Flex gap={2}>
            <SearchInput
              value={searchTerm}
              onChange={onSearchInputChanged}
              size="md"
              maxW="100%"
            />
            <Button aria-label="Search database">{'Search'}</Button>
          </Flex>
          <div
            className={
              colorMode === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark'
            }
            style={{ width: '100%', height: '80vh' }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={
                dummy
                // projects.data?.pages[0]?.logs ?? []
              }
              columnDefs={colDefs}
              rowSelection={'single'}
              pagination
              paginationPageSize={100}
              paginationPageSizeSelector={[
                100, 500, 1000, 5000, 10000, 50000, 100000, 500000,
              ]}
            />
          </div>
          {/*<DataList height="20vh" overflow="scroll">
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
          </DataList>*/}
        </Stack>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
