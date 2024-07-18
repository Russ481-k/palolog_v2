import { Flex, Skeleton } from '@chakra-ui/react';
import {
  CellClickedEvent,
  ColDef,
  ILoadingCellRendererParams,
  ValueFormatterParams,
} from 'ag-grid-community';

import { zLogs } from './schemas';

export const colDefs = (
  isLoading: boolean,
  onCellClickChanged: (
    event: CellClickedEvent<zLogs>,
    dateType: 'Y' | 'N'
  ) => void,
  timeFormatter: (e: ValueFormatterParams<zLogs>) => string
): ColDef<zLogs>[] => {
  return [
    {
      field: 'time',
      minWidth: 50,
      width: 170,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'Y'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={40} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.valueFormatted;
        }
      },
      valueFormatter: timeFormatter,
    },
    {
      field: 'receiveTime',
      minWidth: 50,
      width: 170,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'Y'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={140} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.valueFormatted;
        }
      },
      valueFormatter: timeFormatter,
    },
    {
      field: 'serial',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={140} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'hostid',
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'type',
      minWidth: 50,
      width: 90,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'subtype',
      minWidth: 50,
      width: 90,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={60} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'src',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={60} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'dst',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natsrc',
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natdst',
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'rule',
      minWidth: 50,
      width: 165,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={135} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'ruleUuid',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
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
              <Skeleton h={3} w={70} borderRadius={5} />
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
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'app',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'zoneFrom',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'zoneTo',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'inboundIf',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'outboundIf',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'sessionid',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'repeatcnt',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'sport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'dport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natsport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'natdport',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'flags',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'proto',
      minWidth: 50,
      width: 70,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={40} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'action',
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'misc',
      minWidth: 50,
      width: 75,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={45} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'threatid',
      minWidth: 50,
      width: 90,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={60} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'thrCategory',
      minWidth: 50,
      width: 120,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={90} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'severity',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'direction',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'bytes',
      minWidth: 50,
      width: 70,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={40} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'bytesSent',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'bytesReceived',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'packets',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'pktsSent',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'pktsReceived',
      minWidth: 50,
      width: 120,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={90} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'sessionEndReason',
      minWidth: 50,
      width: 150,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={120} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'deviceName',
      minWidth: 50,
      width: 120,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={90} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'eventid',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'object',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'module',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'opaque',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'srcloc',
      minWidth: 50,
      width: 220,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'dstloc',
      minWidth: 50,
      width: 150,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={120} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'urlIdx',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'category',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'urlCategoryList',
      minWidth: 50,
      width: 145,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={115} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'domainEdl',
      minWidth: 50,
      width: 110,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={80} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'reason',
      minWidth: 50,
      width: 100,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={70} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'justification',
      minWidth: 50,
      width: 80,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={50} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'subcategoryOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'categoryOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'technologyOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
    {
      field: 'riskOfApp',
      minWidth: 50,
      width: 135,
      onCellClicked: (e: CellClickedEvent) => onCellClickChanged(e, 'N'),
      cellRenderer: (e: ILoadingCellRendererParams) => {
        if (!isLoading) {
          return (
            <Flex py="14px">
              <Skeleton h={3} w={105} borderRadius={5} />
            </Flex>
          );
        } else {
          return e.value;
        }
      },
    },
  ];
};
