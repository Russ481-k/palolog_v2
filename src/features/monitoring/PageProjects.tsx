'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';

import {
  Box,
  Button,
  Flex,
  Heading,
  Select,
  Stack,
  useColorMode,
} from '@chakra-ui/react';
import {
  CellClickedEvent,
  ColDef,
  ValueFormatterParams,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
// Core CSS
import { AgGridReact } from 'ag-grid-react';
import moment, { Moment } from 'moment-timezone';
import 'moment/locale/ko';
import TimePicker from 'rc-time-picker';
import 'rc-time-picker/assets/index.css';

import { DayPicker } from '@/components/DayPicker';
import { SearchInput } from '@/components/SearchInput';
import {
  AdminLayoutPage,
  AdminLayoutPageContent,
} from '@/features/admin/AdminLayoutPage';
import { trpc } from '@/lib/trpc/client';

import { zLogs } from './schemas';

export default function PageProjects() {
  const { colorMode } = useColorMode();

  const beforeHourTime: Moment = moment().tz('Asia/Seoul').subtract(1, 'hours');
  const nowTime: Moment = moment().tz('Asia/Seoul');

  const [limit, setLimit] = useState<number>(1000);
  const [nextSearchTerm, setNextSearchTerm] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDayFrom, setSelectedDayFrom] = useState<Date | null>(
    new Date()
  );
  const [selectedTimeFrom, setSelectedTimeFrom] =
    useState<Moment>(beforeHourTime);
  const [selectedDayTo, setSelectedDayTo] = useState<Date | null>(new Date());
  const [selectedTimeTo, setSelectedTimeTo] = useState<Moment>(nowTime);

  const gridRef = useRef<AgGridReact<ColDef<zLogs>[]>>(null);
  const projects = trpc.projects.getAll.useInfiniteQuery(
    {
      timeFrom: new Date(
        moment(selectedTimeFrom ?? beforeHourTime)
          .tz('Asia/Seoul')
          .format('YYYY-MM-DD HH:mm:SS')
      ).getTime(),
      timeTo: new Date(
        moment(selectedTimeTo ?? nowTime)
          .tz('Asia/Seoul')
          .format('YYYY-MM-DD HH:mm:SS')
      ).getTime(),
      limit,
      searchTerm,
    },
    {}
  );
  const onRowLoadLimitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
  };

  const onSearchInputChanged = (e: string) => {
    setSearchTerm(e);
  };

  const onCellClickChanged = (
    event: CellClickedEvent<zLogs>,
    dateType: 'Y' | 'N'
  ) => {
    let eventValue = event.value;
    if (dateType === 'Y') {
      eventValue = moment(event.value)
        .tz('Asia/Seoul')
        .format('YYYY-MM-DD HH:mm:SS');
      setNextSearchTerm(
        ' AND ' + event.colDef.field?.toUpperCase() + ' = "' + eventValue + '"'
      );
    } else if (dateType === 'N') {
      setNextSearchTerm(
        ' AND ' + event.colDef.field?.toUpperCase() + ' = "' + eventValue + '"'
      );
    }
  };
  const onFromTimeChanged = (event: Moment) => {
    setSelectedTimeFrom(event);
  };
  const onToTimeChanged = (event: Moment) => {
    setSelectedTimeTo(event);
  };
  const timeFormatter = (event: ValueFormatterParams<zLogs>) => {
    return moment(event.value / 1000000)
      .tz('Asia/Seoul')
      .format('YYYY-MM-DD HH:mm:SS');
  };
  const [colDefs, setColDefs] = useState<ColDef<zLogs>[]>([
    {
      field: 'time',
      minWidth: 50,
      width: 170,
      onCellClicked: (e) => onCellClickChanged(e, 'Y'),
      valueFormatter: timeFormatter,
    },
    {
      field: 'receiveTime',
      minWidth: 50,
      width: 170,
      onCellClicked: (e) => onCellClickChanged(e, 'Y'),
      valueFormatter: timeFormatter,
    },
    {
      field: 'serial',
      minWidth: 50,
      width: 135,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'hostid',
      minWidth: 50,
      width: 75,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'type',
      minWidth: 50,
      width: 90,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'subtype',
      minWidth: 50,
      width: 90,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'src',
      minWidth: 50,
      width: 135,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'dst',
      minWidth: 50,
      width: 135,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'natsrc',
      minWidth: 50,
      width: 75,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'natdst',
      minWidth: 50,
      width: 75,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'rule',
      minWidth: 50,
      width: 165,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'ruleUuid',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'srcuser',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'dstuser',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'app',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'zoneFrom',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'zoneTo',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'inboundIf',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'outboundIf',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'sessionid',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'repeatcnt',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'sport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'dport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'natsport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'natdport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'flags',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'proto',
      minWidth: 50,
      width: 70,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'action',
      minWidth: 50,
      width: 75,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'misc',
      minWidth: 50,
      width: 75,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'threatid',
      minWidth: 50,
      width: 90,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'thrCategory',
      minWidth: 50,
      width: 120,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'severity',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'direction',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'bytes',
      minWidth: 50,
      width: 70,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'bytesSent',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'bytesReceived',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'packets',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'pktsSent',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'pktsReceived',
      minWidth: 50,
      width: 120,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'sessionEndReason',
      minWidth: 50,
      width: 150,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'deviceName',
      minWidth: 50,
      width: 120,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'eventid',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'object',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'module',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'opaque',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'srcloc',
      minWidth: 50,
      width: 220,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'dstloc',
      minWidth: 50,
      width: 150,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'urlIdx',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'category',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'urlCategoryList',
      minWidth: 50,
      width: 145,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'domainEdl',
      minWidth: 50,
      width: 110,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'reason',
      minWidth: 50,
      width: 100,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'justification',
      minWidth: 50,
      width: 80,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'subcategoryOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'categoryOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'technologyOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
    {
      field: 'riskOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e) => onCellClickChanged(e, 'N'),
    },
  ]);

  useEffect(() => {
    setSearchTerm(searchTerm + nextSearchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSearchTerm]);

  useEffect(() => {
    console.log('selectedDayFrom : ', selectedDayFrom);
    if (!!selectedDayFrom) {
      onFromTimeChanged(moment(selectedDayFrom).tz('Asia/Seoul'));
    } else {
      onFromTimeChanged(moment(selectedTimeFrom).tz('Asia/Seoul'));
    }
  }, [selectedDayFrom]);

  useEffect(() => {
    console.log('selectedDayTo : ', selectedDayTo);
    if (!!selectedDayTo) {
      onToTimeChanged(moment(selectedDayTo).tz('Asia/Seoul'));
    } else {
      onToTimeChanged(moment(selectedTimeTo).tz('Asia/Seoul'));
    }
  }, [selectedDayTo]);

  return (
    <AdminLayoutPage>
      <AdminLayoutPageContent>
        <Stack spacing={2}>
          <Flex justifyContent="space-between" gap={4}>
            <Flex
              flexDirection={{ base: 'column', md: 'row' }}
              alignItems={{ base: 'start', md: 'center' }}
              gap={2}
            >
              <Heading flex="none" fontSize="32px" color="gray.400">
                TRAFFIC
              </Heading>
              <Flex gap={2}>
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
            <Flex
              flexDirection={{ base: 'column', md: 'row' }}
              alignItems={{ base: 'start', md: 'center' }}
              gap={4}
            >
              <Select variant="filled" onChange={onRowLoadLimitChange}>
                <option value="1000">1000</option>
                <option value="5000">5000</option>
                <option value="10000">10000</option>
                <option value="50000">50000</option>
              </Select>
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
            style={{ width: '100%', height: '79vh' }}
          >
            {/*//@ts-expect-error Note: AgGridReact타입 충돌 예방으로 ts-expect-error 를 사용*/}
            <AgGridReact
              ref={gridRef}
              rowData={projects.data?.pages[0]?.logs}
              columnDefs={colDefs}
              rowSelection={'single'}
              isLoading={projects.isLoading}
              pagination
              paginationPageSize={100}
              paginationPageSizeSelector={[
                100, 500, 1000, 5000, 10000, 50000, 100000, 500000,
              ]}
            />
          </div>
        </Stack>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}
