import { memo, useCallback, useRef } from 'react';

import {
  CellClickedEvent,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { AgGridReact } from 'ag-grid-react';
import dayjs from 'dayjs';

import { MenuType } from '@/types/project';

import { colDefs } from '../colDefs';
import { zLogs } from '../schemas';
import { dummy } from '../versions/11.0/dummy_11.0';

interface GridSectionProps {
  data: (zLogs | null | undefined)[];
  isLoading: boolean;
  menu: MenuType;
  onCellClicked: (event: CellClickedEvent<zLogs>) => void;
  colorMode: 'light' | 'dark';
}

export const GridSection = memo(
  ({ data, isLoading, menu, onCellClicked, colorMode }: GridSectionProps) => {
    const gridRef = useRef<AgGridReact<zLogs>>(null);

    const timeFormatter = useCallback((event: ValueFormatterParams<zLogs>) => {
      if (Number(event.value) < 1000000) {
        return '-';
      } else {
        return dayjs(event.value / 1000000).format('YYYY-MM-DD HH:mm:ss');
      }
    }, []);

    const onGridReady = useCallback((params: GridReadyEvent) => {
      setTimeout(() => {
        const allColumnIds: string[] = [];
        params.api.getAllGridColumns().forEach((column) => {
          allColumnIds.push(column.getId());
        });
        params.api.autoSizeColumns(allColumnIds);
      }, 100);
    }, []);

    return (
      <div
        style={{
          width: '100%',
          height: 'calc(100vh - 160px)',
          zIndex: 0,
        }}
        className={`ag-theme-quartz${colorMode === 'dark' ? '-dark' : ''}`}
      >
        <AgGridReact
          ref={gridRef}
          rowData={!isLoading ? data : dummy}
          columnDefs={colDefs(menu, !isLoading, onCellClicked, timeFormatter)}
          rowHeight={26}
          headerHeight={26}
          onGridReady={onGridReady}
        />
      </div>
    );
  }
);

GridSection.displayName = 'GridSection';
