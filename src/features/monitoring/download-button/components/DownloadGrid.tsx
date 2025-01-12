import { useRef } from 'react';

import { Box, Checkbox, Flex, IconButton } from '@chakra-ui/react';
import { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { AgGridReact } from 'ag-grid-react';
import { FaDownload } from 'react-icons/fa';

import { FileData } from '../types';
import { DownloadProgress } from './DownloadProgress';
import { DownloadStatus } from './DownloadStatus';

interface DownloadGridProps {
  rowData: FileData[];
  selectedFiles: string[];
  onFileSelection: (fileName: string, selected: boolean) => void;
  onFileDownload: (fileName: string) => void;
  gridTheme: string;
}

export const DownloadGrid = ({
  rowData,
  selectedFiles,
  onFileSelection,
  onFileDownload,
  gridTheme,
}: DownloadGridProps) => {
  const gridRef = useRef<AgGridReact>(null);

  const columnDefs: ColDef<FileData>[] = [
    {
      headerName: '',
      field: 'fileName',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      cellRenderer: (params: ICellRendererParams<FileData>) => (
        <Checkbox
          checked={selectedFiles.includes(params.data?.fileName || '')}
          onChange={(event) =>
            onFileSelection(params.data?.fileName || '', event.target.checked)
          }
        />
      ),
    },
    {
      field: 'fileName',
      headerName: 'File Name',
      width: 400,
    },
    {
      field: 'timeRange',
      headerName: 'Time Range',
      width: 200,
    },
    {
      field: 'size',
      headerName: 'Size',
      width: 100,
      valueFormatter: (params) => `${(params.value / 1024).toFixed(2)} KB`,
    },
    {
      field: 'lastModified',
      headerName: 'Last Modified',
      width: 200,
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: (params: ICellRendererParams<FileData>) => (
        <DownloadStatus status={params.value} />
      ),
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 320,
      cellRenderer: (params: ICellRendererParams<FileData>) => {
        const data = params.data;
        if (!data) return null;

        return (
          <Flex width="280px" alignItems="center">
            <DownloadProgress
              progress={data.progress}
              status={data.status}
              processedRows={data.processedRows}
              totalRows={data.totalRows}
              processingSpeed={data.processingSpeed}
              estimatedTimeRemaining={data.estimatedTimeRemaining}
              message={data.message}
              size="sm"
            />
          </Flex>
        );
      },
    },
    {
      headerName: 'Actions',
      cellRenderer: (params: ICellRendererParams<FileData>) => {
        if (!params.data) return null;
        const { fileName, status } = params.data;

        return (
          <Flex alignItems="center" height="40px">
            <IconButton
              aria-label="Download"
              icon={<FaDownload />}
              size="sm"
              colorScheme="blue"
              variant="ghost"
              isDisabled={status !== 'ready' && status !== 'completed'}
              onClick={() => onFileDownload(fileName)}
            />
          </Flex>
        );
      },
    },
  ];

  const onGridReady = (params: GridReadyEvent<FileData>) => {
    params.api.sizeColumnsToFit();
  };

  return (
    <Box
      height="800px"
      className={`download-grid ${gridTheme}`}
      data-testid="download-grid"
      overflow="hidden"
    >
      <AgGridReact<FileData>
        ref={gridRef}
        columnDefs={columnDefs}
        rowData={rowData}
        onGridReady={onGridReady}
        rowSelection="multiple"
        suppressRowClickSelection
        domLayout="autoHeight"
        suppressPropertyNamesCheck
      />
    </Box>
  );
};
