'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';

import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightElement,
  Select,
  Stack,
  useColorMode,
  useToast,
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

import { colDefs } from './colDefs';
import { dummy } from './dummy';
import { zLogs } from './schemas';

export default function PageProjects() {
  const { colorMode } = useColorMode();

  const beforeHourTime: Moment = moment().tz('Asia/Seoul').subtract(1, 'hours');
  const nowTime: Moment = moment().tz('Asia/Seoul');

  const [limit, setLimit] = useState<number>(1000);
  const [nextSearchTerm, setNextSearchTerm] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDayFrom, setSelectedDayFrom] = useState<number | null>(
    new Date().getTime()
  );
  const [selectedTimeFrom, setSelectedTimeFrom] =
    useState<Moment>(beforeHourTime);
  const [selectedDayTo, setSelectedDayTo] = useState<number | null>(
    new Date().getTime()
  );
  const [selectedTimeTo, setSelectedTimeTo] = useState<Moment>(nowTime);

  const gridRef = useRef<AgGridReact<ColDef<zLogs>[]>>(null);
  const toast = useToast();
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
    if (projects.isLoading) return;
    let eventValue = event.value;
    const eventColDef = event.colDef.field
      ?.replace(/[A-Z]/g, (letter) => `_${letter}`)
      .toUpperCase();

    if (dateType === 'Y') {
      eventValue = moment(new Date(event.value / 1000000))
        .tz('Asia/Seoul')
        .format('YYYY-MM-DD HH:mm:SS');
      const newDateTypeTerm =
        ' AND ' + eventColDef + " = TO_DATE('" + eventValue + "')";
      return setNextSearchTerm(newDateTypeTerm);
    } else if (dateType === 'N') {
      const newTerm = ' AND ' + eventColDef + " = '" + eventValue + "'";
      setNextSearchTerm(newTerm);
    }
  };
  const onFromTimeChanged = (event: Moment) => {
    setSelectedTimeFrom(event);
  };
  const onToTimeChanged = (event: Moment) => {
    setSelectedTimeTo(event);
  };
  const timeFormatter = (event: ValueFormatterParams<zLogs>) => {
    if (Number(event.value) < 1000000) {
      return '-';
    } else {
      return moment(event.value / 1000000)
        .tz('Asia/Seoul')
        .format('YYYY-MM-DD HH:mm:SS');
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

  useEffect(() => {
    if (!!selectedDayFrom) {
      onFromTimeChanged(moment(selectedDayFrom).tz('Asia/Seoul'));
    } else {
      onFromTimeChanged(moment(new Date().getTime()).tz('Asia/Seoul'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayFrom]);

  useEffect(() => {
    if (!!selectedDayTo) {
      onToTimeChanged(moment(selectedDayTo).tz('Asia/Seoul'));
    } else {
      onToTimeChanged(moment(new Date().getTime()).tz('Asia/Seoul'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <Heading flex="none" fontSize="24px" color="gray.400">
                TRAFFIC
              </Heading>
              <Flex gap={2}>
                <Box w="140px" h="100%" textAlign="center">
                  <DayPicker
                    inputProps={{ size: 'sm' }}
                    value={
                      new Date(
                        moment(selectedDayFrom ?? new Date().getTime()).format(
                          'YYYY-MM-DD HH:mm:SS'
                        )
                      )
                    }
                    onChange={(e) =>
                      setSelectedDayFrom(e?.getTime() ?? new Date().getTime())
                    }
                  />
                </Box>
                <Box w="100px" h="100%">
                  <TimePicker
                    clearIcon={<></>}
                    value={selectedTimeFrom}
                    onChange={onFromTimeChanged}
                  />
                </Box>
                <Heading color="gray.500" flex="none" size="sm" py="5px">
                  ~
                </Heading>
                <Box w="140px" h="100%" textAlign="center">
                  <DayPicker
                    inputProps={{ size: 'sm' }}
                    value={
                      new Date(
                        moment(selectedDayTo ?? new Date().getTime()).format(
                          'YYYY-MM-DD HH:mm:SS'
                        )
                      )
                    }
                    onChange={(e) =>
                      setSelectedDayTo(e?.getTime() ?? new Date().getTime())
                    }
                  />
                </Box>
                <Box w="100px" h="100%">
                  <TimePicker
                    clearIcon={<></>}
                    value={selectedTimeTo}
                    onChange={onToTimeChanged}
                  />
                </Box>
              </Flex>
            </Flex>
            <InputGroup w="100%" size="sm">
              <SearchInput
                value={searchTerm}
                onChange={onSearchInputChanged}
                maxW="100%"
              />
              <InputRightElement w="4.5rem" p={0} m={0}>
                <Button
                  h="32px"
                  w="4.5rem"
                  size="xs"
                  borderLeftRadius={0}
                  onClick={() => {}}
                >
                  Search
                </Button>
              </InputRightElement>
            </InputGroup>
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
              rowData={
                !projects.isLoading ? projects.data?.pages[0]?.logs : dummy
              }
              columnDefs={colDefs(
                !projects.isLoading,
                onCellClickChanged,
                timeFormatter
              )}
            />
          </div>
          <Pagination />
        </Stack>
      </AdminLayoutPageContent>
    </AdminLayoutPage>
  );
}

const Pagination = () => {
  // 페이지 길이
  // 현재 페이지
  //
  return (
    <Flex justifyContent="space-between">
      <Flex alignItems="end" flex={1}>
        <Heading size="sm">{`Total : ` + 'totalNum'}</Heading>
      </Flex>
      <Flex gap={2} flex={1} justifyContent="center">
        <Button size="sm">{`<`}</Button>
        <Button size="sm">1</Button>
        <Button size="sm">2</Button>
        <Button size="sm">3</Button>
        <Button size="sm">4</Button>
        <Input size="sm" w="36px" value="5" p={0} textAlign="center" />
        <Button size="sm">6</Button>
        <Button size="sm">7</Button>
        <Button size="sm">8</Button>
        <Button size="sm">9</Button>
        <Button size="sm">{`>`}</Button>
      </Flex>
      <Flex flex={1} w="180px" justifyContent="right">
        <InputGroup size="sm" w="180px">
          <InputLeftAddon>Batch</InputLeftAddon>
          <Select variant="filled" onChange={() => {}}>
            <option value="1000">1000</option>
            <option value="5000">5000</option>
            <option value="10000">10000</option>
          </Select>
        </InputGroup>
      </Flex>
    </Flex>
  );
};
