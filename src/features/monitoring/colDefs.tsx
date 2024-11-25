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
      field: 'd000', //deviceName //TRAFFIC THREAT URL
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
      field: 'd001', //time //TRAFFIC THREAT URL
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
      field: 'd002', //receiveTime //TRAFFIC THREAT URL
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
      field: 'd003', //serial //TRAFFIC THREAT URL
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
      field: 'd004', //hostid
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
      field: 'd005', //type //TRAFFIC THREAT URL
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
      field: 'd006', //subtype //TRAFFIC THREAT URL
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
      field: 'd007', //src //TRAFFIC THREAT URL
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
      field: 'd008', //dst //TRAFFIC THREAT URL
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
      field: 'd009', //natsrc //TRAFFIC THREAT URL
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
      field: 'd010', //natdst //TRAFFIC THREAT URL
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
      field: 'd011', //rule //TRAFFIC THREAT URL
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
      field: 'd012', //ruleUuid //TRAFFIC THREAT URL
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
      field: 'd013', //srcuser
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
      field: 'd014', //dstuser
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
      field: 'd015', //app //TRAFFIC THREAT URL
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
      field: 'd016', //zoneFrom //TRAFFIC THREAT URL
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
      field: 'd017', //zoneTo //TRAFFIC THREAT URL
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
      field: 'd018', //inboundIf //TRAFFIC THREAT URL
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
      field: 'd019', //outboundIf //TRAFFIC THREAT URL
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
      field: 'd020', //sessionid //TRAFFIC THREAT URL
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
      field: 'd021', //repeatcnt //TRAFFIC THREAT URL
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
      field: 'd022', //sport //TRAFFIC THREAT URL
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
      field: 'd023', //dport //TRAFFIC THREAT URL
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
      field: 'd024', //natsport //TRAFFIC THREAT URL
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
      field: 'd025', //natdport //TRAFFIC THREAT URL
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
      field: 'd026', //flags //TRAFFIC THREAT URL
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
      field: 'd027', //proto //TRAFFIC THREAT URL
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
      field: 'd028', //action //TRAFFIC THREAT URL
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
      field: 'd029', //misc // THREAT
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
      field: 'd030', //threatid // THREAT
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
      field: 'd031', //thrCategory // THREAT
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
      field: 'd032', //severity // THREAT URL
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
      field: 'd033', //direction // THREAT
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
      field: 'd034', //bytes //TRAFFIC
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
      field: 'd035', //bytesSent //TRAFFIC
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
      field: 'd036', //bytesReceived //TRAFFIC
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
      field: 'd037', //packets //TRAFFIC
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
      field: 'd038', //pktsSent //TRAFFIC
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
      field: 'd039', //pktsReceived //TRAFFIC
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
      field: 'd040', //sessionEndReason //TRAFFIC THREAT URL
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
      field: 'd041', //eventid //SYSTEM
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
      field: 'd042', //object //SYSTEM
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
      field: 'd043', //module //SYSTEM
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
      field: 'd044', //opaque //SYSTEM
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
      field: 'd045', //srcloc //TRAFFIC THREAT URL
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
      field: 'd046', //dstloc //TRAFFIC THREAT URL
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
      field: 'd047', //urlIdx
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
      field: 'd048', //category //URL
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
      field: 'd049', //urlCategoryList //URL
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
      field: 'd050', //domainEdl
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
      field: 'd051', //reason //THREAT URL
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
      field: 'd052', //justification //THREAT URL
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
      field: 'd053', //subcategoryOfApp //THREAT URL
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
      field: 'd054', //categoryOfApp //THREAT URL
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
      field: 'd055', //technologyOfApp //THREAT URL
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
      field: 'd056', //riskOfApp //THREAT URL
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
