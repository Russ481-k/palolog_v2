import { Flex, Skeleton } from '@chakra-ui/react';
import {
  CellClickedEvent,
  ColDef,
  ILoadingCellRendererParams,
  ValueFormatterParams,
} from 'ag-grid-community';

import { MenuType } from '@/types/project';

import { zLogs } from './schemas';

export const colDefs = (
  menu: MenuType,
  isLoading: boolean,
  onCellClickChanged: (
    event: CellClickedEvent<zLogs>,
    dateType: 'Y' | 'N'
  ) => void,
  timeFormatter: (e: ValueFormatterParams<zLogs>) => string
): ColDef<zLogs>[] => {
  return [
    {
      field: 'deviceName', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 160,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={90} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'time', //TRAFFIC THREAT URL
      hide: true,
      minWidth: 50,
      width: 170,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'Y'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={40} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.valueFormatted;
        }
      },
      valueFormatter: timeFormatter,
    },
    {
      field: 'receiveTime', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 170,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'Y'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={140} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.valueFormatted;
        }
      },
      valueFormatter: timeFormatter,
    },
    {
      field: 'serial', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={140} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'hostid',
      hide: true,
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'type', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 90,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'subtype', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 90,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={60} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'src', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={60} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'dst', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natsrc', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natdst', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'rule', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 165,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={135} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'ruleUuid', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'srcuser',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'dstuser',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'app', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'zoneFrom', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'zoneTo', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'inboundIf', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'outboundIf', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'sessionid', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'repeatcnt', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'sport', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'dport', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natsport', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natdport', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'flags', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'proto', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 70,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={40} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'action', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'misc', // THREAT
      hide: menu !== 'THREAT',
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'threatid', // THREAT
      hide: menu !== 'THREAT',
      minWidth: 50,
      width: 90,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={60} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'thrCategory', // THREAT
      hide: menu !== 'THREAT',
      minWidth: 50,
      width: 120,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={90} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'severity', // THREAT URL
      hide: menu !== 'THREAT' && menu !== 'SYSLOG',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'direction', // THREAT
      hide: menu !== 'THREAT',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'bytes', //TRAFFIC
      hide: menu !== 'TRAFFIC',
      minWidth: 50,
      width: 70,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={40} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'bytesSent', //TRAFFIC
      hide: menu !== 'TRAFFIC',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'bytesReceived', //TRAFFIC
      hide: menu !== 'TRAFFIC',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'packets', //TRAFFIC
      hide: menu !== 'TRAFFIC',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'pktsSent', //TRAFFIC
      hide: menu !== 'TRAFFIC',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'pktsReceived', //TRAFFIC
      hide: menu !== 'TRAFFIC',
      minWidth: 50,
      width: 120,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={90} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'sessionEndReason', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 150,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={120} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'eventid', //SYSTEM
      hide: menu !== 'SYSLOG',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'object', //SYSTEM
      hide: menu !== 'SYSLOG',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'module', //SYSTEM
      hide: menu !== 'SYSLOG',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'opaque', //SYSTEM
      hide: menu !== 'SYSLOG',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'srcloc', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 220,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'dstloc', //TRAFFIC THREAT URL
      minWidth: 50,
      width: 150,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={120} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'urlIdx',
      hide: true,
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'category', //URL
      hide: menu !== 'SYSLOG',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'urlCategoryList', //URL
      hide: menu !== 'SYSLOG',
      minWidth: 50,
      width: 145,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={115} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'domainEdl',
      hide: true,
      minWidth: 50,
      width: 110,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={80} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'reason', //THREAT URL
      hide: menu !== 'THREAT' && menu !== 'SYSLOG',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'justification', //THREAT URL
      hide: menu !== 'THREAT' && menu !== 'SYSLOG',
      minWidth: 50,
      width: 80,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={50} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'subcategoryOfApp', //THREAT URL
      hide: menu !== 'THREAT' && menu !== 'SYSLOG',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'categoryOfApp', //THREAT URL
      hide: menu !== 'THREAT' && menu !== 'SYSLOG',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'technologyOfApp', //THREAT URL
      hide: menu !== 'THREAT' && menu !== 'SYSLOG',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'riskOfApp', //THREAT URL
      hide: menu !== 'THREAT' && menu !== 'SYSLOG',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={2} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
  ];
};
