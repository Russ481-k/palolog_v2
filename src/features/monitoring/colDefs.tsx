import { Flex, Skeleton } from '@chakra-ui/react';
import {
  CellClickedEvent,
  ColDef,
  ILoadingCellRendererParams,
  ValueFormatterParams,
} from 'ag-grid-community';

import { MenuType } from '@/types/project';

import { columnNames } from './colNameList';
import { zLogs } from './schemas';

// 컬럼 설정 함수
const createColumn = (
  columnName: string,
  isLoading: boolean,
  onCellClickChanged: (event: CellClickedEvent<zLogs>) => void,
  timeFormatter: (e: ValueFormatterParams<zLogs>) => string
): ColDef<zLogs> => {
  const column: ColDef<zLogs> = {
    field: columnName,
    headerName: columnName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toUpperCase(),
    minWidth: 50,
    width: 160,
    onCellClicked: (e) => onCellClickChanged(e),
    cellRenderer: (e: ILoadingCellRendererParams) =>
      !isLoading ? (
        <Flex py="14px">
          <Skeleton h={3} w={columnName.length * 9} borderRadius={2} />
        </Flex>
      ) : (
        e.value
      ),
  };

  // time이 포함된 컬럼에는 valueFormatter 적용
  if (columnName.toLowerCase().includes('time')) {
    column.valueFormatter = timeFormatter;
    column.width = 170;
  }

  // Domain 컬럼에 대한 valueFormatter 추가
  if (columnName === 'Domain') {
    column.valueFormatter = (params) => {
      if (typeof params.value === 'string') {
        const match = params.value.match(
          /(?:<\d+>)?[A-Za-z]+ \d+ \d+:\d+:\d+ (.+)/
        );
        return match ? match[1] : params.value;
      }
      return params.value;
    };
  }

  return column;
};

// 최종 컬럼 정의 함수
export const colDefs = (
  menu: MenuType,
  isLoading: boolean,
  onCellClickChanged: (event: CellClickedEvent<zLogs>) => void,
  timeFormatter: (e: ValueFormatterParams<zLogs>) => string
): ColDef<zLogs>[] =>
  columnNames.map((columnName) =>
    createColumn(columnName, isLoading, onCellClickChanged, timeFormatter)
  );
