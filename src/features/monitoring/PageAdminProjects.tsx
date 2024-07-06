import { useState } from 'react';

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
import { ColDef } from 'ag-grid-community';
// Theme
// React Grid Logic
import 'ag-grid-community/styles/ag-grid.css';
// Mandatory CSS required by the Data Grid
import 'ag-grid-community/styles/ag-theme-quartz.css';
// Core CSS
import { AgGridReact } from 'ag-grid-react';
import { useQueryState } from 'nuqs';
import TimePicker from 'rc-time-picker';
import 'rc-time-picker/assets/index.css';

// React Data Grid Component
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

// Row Data Interface
interface IRow {
  TIME: string;
  RECEIVE_TIME: string;
  SERIAL: string;
  HOSTID: string;
  NATDST: string;
  TYPE: string;
  SUBTYPE: string;
  SRC: string;
  DST: string;
  NATSRC: string;
  RULE: string;
  RULE_UUID: string;
  SRCUSER: string;
  DSTUSER: string;
  APP: string;
  ZONE_FROM: string;
  ZONE_TO: string;
  INBOUND_IF: string;
  OUTBOUND_IF: string;
  SESSIONID: string;
  REPEATCNT: number;
  SPORT: string;
  DPORT: string;
  NATSPORT: string;
  NATDPORT: string;
  FLAGS: string;
  PROTO: string;
  ACTION: string;
  MISC: string;
  THREATID: string;
  THR_CATEGORY: string;
  SEVERITY: string;
  DIRECTION: string;
  BYTES: string;
  BYTES_SENT: string;
  BYTES_RECEIVED: string;
  PACKETS: string;
  PKTS_SENT: string;
  PKTS_RECEIVED: string;
  SESSION_END_REASON: string;
  DEVICE_NAME: string;
  EVENTID: string;
  OBJECT: string;
  MODULE: string;
  OPAQUE: string;
  SRCLOC: string;
  DSTLOC: string;
  URL_IDX: string;
  CATEGORY: string;
  URL_CATEGORY_LIST: string;
  DOMAIN_EDL: string;
  REASON: string;
  JUSTIFICATION: string;
  SUBCATEGORY_OF_APP: string;
  CATEGORY_OF_APP: string;
  TECHNOLOGY_OF_APP: string;
  RISK_OF_APP: string;
  RAW: string;
}

// Optional Theme applied to the Data Grid
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
  const { colorMode } = useColorMode();

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const koreaTimeDiff = 9 * 60 * 60 * 1000;
  const korNow = new Date(utc + koreaTimeDiff);
  // Row Data: The data to be displayed.
  const [rowData, setRowData] = useState<IRow[]>([
    {
      TIME: '2024-07-10 22:23',
      RECEIVE_TIME: '2024-07-10 22:23',
      SERIAL: 'SERIAL',
      HOSTID: 'HOSTID',
      TYPE: 'TRAFFIC',
      SUBTYPE: 'drop',
      SRC: '192.168.1.162',
      DST: '168.126.63.1',
      NATSRC: 'NATSRC',
      NATDST: 'NATDST',
      RULE: 'RULE',
      RULE_UUID: 'RULE_UUID',
      SRCUSER: 'string',
      DSTUSER: 'string',
      APP: 'string',
      ZONE_FROM: 'string',
      ZONE_TO: 'string',
      INBOUND_IF: 'string',
      OUTBOUND_IF: 'string',
      SESSIONID: 'string',
      REPEATCNT: 123,
      SPORT: 'string',
      DPORT: 'string',
      NATSPORT: 'string',
      NATDPORT: 'string',
      FLAGS: 'string',
      PROTO: 'tcp',
      ACTION: 'deny',
      MISC: 'string',
      THREATID: 'string',
      THR_CATEGORY: 'string',
      SEVERITY: 'string',
      DIRECTION: 'string',
      BYTES: 'string',
      BYTES_SENT: 'string',
      BYTES_RECEIVED: 'string',
      PACKETS: 'string',
      PKTS_SENT: 'string',
      PKTS_RECEIVED: 'string',
      SESSION_END_REASON: 'string',
      DEVICE_NAME: 'string',
      EVENTID: 'string',
      OBJECT: 'string',
      MODULE: 'string',
      OPAQUE: 'string',
      SRCLOC: 'string',
      DSTLOC: 'string',
      URL_IDX: 'string',
      CATEGORY: 'string',
      URL_CATEGORY_LIST: 'string',
      DOMAIN_EDL: 'string',
      REASON: 'string',
      JUSTIFICATION: 'string',
      SUBCATEGORY_OF_APP: 'string',
      CATEGORY_OF_APP: 'string',
      TECHNOLOGY_OF_APP: 'string',
      RISK_OF_APP: 'string',
      RAW: 'string',
    },
  ]);

  // Column Definitions: Defines the columns to be displayed.
  const [colDefs, setColDefs] = useState<ColDef<IRow>[]>([
    { field: 'TIME' },
    { field: 'RECEIVE_TIME' },
    { field: 'SERIAL' },
    { field: 'HOSTID' },
    { field: 'NATDST' },
    { field: 'TYPE' },
    { field: 'SUBTYPE' },
    { field: 'SRC' },
    { field: 'DST' },
    { field: 'NATSRC' },
    { field: 'RULE' },
    { field: 'RULE_UUID' },
    { field: 'SRCUSER' },
    { field: 'DSTUSER' },
    { field: 'APP' },
    { field: 'ZONE_FROM' },
    { field: 'ZONE_TO' },
    { field: 'INBOUND_IF' },
    { field: 'OUTBOUND_IF' },
    { field: 'SESSIONID' },
    { field: 'REPEATCNT' },
    { field: 'SPORT' },
    { field: 'DPORT' },
    { field: 'NATSPORT' },
    { field: 'NATDPORT' },
    { field: 'FLAGS' },
    { field: 'PROTO' },
    { field: 'ACTION' },
    { field: 'MISC' },
    { field: 'THREATID' },
    { field: 'THR_CATEGORY' },
    { field: 'SEVERITY' },
    { field: 'DIRECTION' },
    { field: 'BYTES' },
    { field: 'BYTES_SENT' },
    { field: 'BYTES_RECEIVED' },
    { field: 'PACKETS' },
    { field: 'PKTS_SENT' },
    { field: 'PKTS_RECEIVED' },
    { field: 'SESSION_END_REASON' },
    { field: 'DEVICE_NAME' },
    { field: 'EVENTID' },
    { field: 'OBJECT' },
    { field: 'MODULE' },
    { field: 'OPAQUE' },
    { field: 'SRCLOC' },
    { field: 'DSTLOC' },
    { field: 'URL_IDX' },
    { field: 'CATEGORY' },
    { field: 'URL_CATEGORY_LIST' },
    { field: 'DOMAIN_EDL' },
    { field: 'REASON' },
    { field: 'JUSTIFICATION' },
    { field: 'SUBCATEGORY_OF_APP' },
    { field: 'CATEGORY_OF_APP' },
    { field: 'TECHNOLOGY_OF_APP' },
    { field: 'RISK_OF_APP' },
    { field: 'RAW' },
  ]);

  return (
    <AdminLayoutPage>
      <AdminLayoutPageContent>
        <Stack spacing={2}>
          <Heading flex="none" size="md">
            TRAFFIC
          </Heading>
          <Flex justifyContent="space-between">
            <Flex
              flexDirection={{ base: 'column', md: 'row' }}
              alignItems={{ base: 'start', md: 'center' }}
              gap={4}
            >
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
                  <TimePicker clearIcon={<></>} />
                </Box>
                <Heading color="gray.500" flex="none" size="sm" pt="10px">
                  ~
                </Heading>
                <Box w="180px" h="100%" textAlign="center">
                  <DayPicker
                    value={selectedDayTo}
                    textAlign="center"
                    onChange={setSelectedDayTo}
                  />
                </Box>
                <Box w="180px" h="100%">
                  <TimePicker clearIcon={<></>} />
                </Box>
              </Flex>
            </Flex>
            <IconButton aria-label="Search database" icon={<SearchIcon />} />
          </Flex>
          <SearchInput
            value={searchTerm}
            onChange={(value) => setSearchTerm(value || null)}
            size="md"
            maxW="100%"
          />
          <div
            className={
              colorMode === 'light' ? 'ag-theme-quartz' : 'ag-theme-quartz-dark'
            }
            style={{ width: '100%', height: '500px' }}
          >
            <AgGridReact
              rowData={rowData}
              columnDefs={colDefs}
              pagination
              paginationPageSize={10}
              paginationPageSizeSelector={[
                100, 500, 1000, 5000, 10000, 50000, 100000, 500000,
              ]}
            />
          </div>
          <DataList height="20vh" overflow="scroll">
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
