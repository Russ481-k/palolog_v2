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

// Row Data Interface
interface IRow {
  time?: number | null | undefined;
  receiveTime?: number | null | undefined;
  serial?: string | null | undefined;
  hostid?: string | null | undefined;
  type?: string | null | undefined;
  subtype?: string | null | undefined;
  src?: string | null | undefined;
  dst?: string | null | undefined;
  natsrc?: string | null | undefined;
  natdst?: string | null | undefined;
  rule?: string | null | undefined;
  ruleUuid?: string | null | undefined;
  srcuser?: string | null | undefined;
  dstuser?: string | null | undefined;
  app?: string | null | undefined;
  zoneFrom?: string | null | undefined;
  zoneTo?: string | null | undefined;
  inboundIf?: string | null | undefined;
  outboundIf?: string | null | undefined;
  sessionid?: string | null | undefined;
  repeatcnt?: number | null | undefined;
  sport?: string | null | undefined;
  dport?: string | null | undefined;
  natsport?: string | null | undefined;
  natdport?: string | null | undefined;
  flags?: string | null | undefined;
  proto?: string | null | undefined;
  action?: string | null | undefined;
  misc?: string | null | undefined;
  threatid?: string | null | undefined;
  thrCategory?: string | null | undefined;
  severity?: string | null | undefined;
  direction?: string | null | undefined;
  bytes?: number | null | undefined;
  bytesSent?: number | null | undefined;
  bytesReceived?: number | null | undefined;
  packets?: number | null | undefined;
  pktsSent?: number | null | undefined;
  pktsReceived?: number | null | undefined;
  sessionEndReason?: string | null | undefined;
  deviceName?: string | null | undefined;
  eventid?: string | null | undefined;
  object?: string | null | undefined;
  module?: string | null | undefined;
  opaque?: string | null | undefined;
  srcloc?: string | null | undefined;
  dstloc?: string | null | undefined;
  urlIdx?: string | null | undefined;
  category?: string | null | undefined;
  urlCategoryList?: string | null | undefined;
  domainEdl?: string | null | undefined;
  reason?: string | null | undefined;
  justification?: string | null | undefined;
  subcategoryOfApp?: string | null | undefined;
  categoryOfApp?: string | null | undefined;
  technologyOfApp?: string | null | undefined;
  riskOfApp?: string | null | undefined;
  raw?: string | null | undefined;
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
    {}
  );
  const { colorMode } = useColorMode();

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const koreaTimeDiff = 9 * 60 * 60 * 1000;
  const korNow = new Date(utc + koreaTimeDiff);
  // Row Data: The data to be displayed.

  // Column Definitions: Defines the columns to be displayed.
  const [colDefs, setColDefs] = useState<ColDef<IRow>[]>([
    { field: 'time' },
    { field: 'receiveTime' },
    { field: 'serial' },
    { field: 'hostid' },
    { field: 'type' },
    { field: 'subtype' },
    { field: 'src' },
    { field: 'dst' },
    { field: 'natsrc' },
    { field: 'natdst' },
    { field: 'rule' },
    { field: 'ruleUuid' },
    { field: 'srcuser' },
    { field: 'dstuser' },
    { field: 'app' },
    { field: 'zoneFrom' },
    { field: 'zoneTo' },
    { field: 'inboundIf' },
    { field: 'outboundIf' },
    { field: 'sessionid' },
    { field: 'repeatcnt' },
    { field: 'sport' },
    { field: 'dport' },
    { field: 'natsport' },
    { field: 'natdport' },
    { field: 'flags' },
    { field: 'proto' },
    { field: 'action' },
    { field: 'misc' },
    { field: 'threatid' },
    { field: 'thrCategory' },
    { field: 'severity' },
    { field: 'direction' },
    { field: 'bytes' },
    { field: 'bytesSent' },
    { field: 'bytesReceived' },
    { field: 'packets' },
    { field: 'pktsSent' },
    { field: 'pktsReceived' },
    { field: 'sessionEndReason' },
    { field: 'deviceName' },
    { field: 'eventid' },
    { field: 'object' },
    { field: 'module' },
    { field: 'opaque' },
    { field: 'srcloc' },
    { field: 'dstloc' },
    { field: 'urlIdx' },
    { field: 'category' },
    { field: 'urlCategoryList' },
    { field: 'domainEdl' },
    { field: 'reason' },
    { field: 'justification' },
    { field: 'subcategoryOfApp' },
    { field: 'categoryOfApp' },
    { field: 'technologyOfApp' },
    { field: 'riskOfApp' },
    { field: 'raw' },
  ]);

  const beforeHourTime: Moment = moment().subtract(1, 'hour');
  const nowTime: Moment = moment();

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
                  <TimePicker clearIcon={<></>} defaultValue={beforeHourTime} />
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
                  <TimePicker clearIcon={<></>} defaultValue={nowTime} />
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
            style={{ width: '100%', height: '80vh' }}
          >
            <AgGridReact
              rowData={projects.data?.pages[0]?.logs ?? []}
              // columnDefs={colDefs}
              pagination
              paginationPageSize={10}
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
