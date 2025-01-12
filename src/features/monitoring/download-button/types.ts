import type { DownloadStatus } from '@/types/download';
import type { MenuType } from '@/types/project';

export interface FileData {
  fileName: string;
  size: number;
  lastModified: string;
  selected: boolean;
  status: DownloadStatus;
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  timeRange: string;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  searchParams: {
    timeFrom: string;
    timeTo: string;
    menu: MenuType;
    searchTerm: string;
  };
}

export interface FileStatus {
  size: number;
  status: DownloadStatus;
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  searchParams: {
    timeFrom: string;
    timeTo: string;
    menu: MenuType;
    searchTerm: string;
  };
}

export type FileStatuses = Record<string, FileStatus>;

export interface DownloadState {
  downloadId: string;
  fileStatuses: FileStatuses;
  selectedFiles: string[];
  isOpen: boolean;
  isConnecting: boolean;
  isConnectionReady: boolean;
  totalProgress?: {
    progress: number;
    status: DownloadStatus;
    processedRows: number;
    totalRows: number;
    processingSpeed: number;
    estimatedTimeRemaining: number;
    message: string;
  };
  searchParams?: {
    timeFrom: string;
    timeTo: string;
    menu: MenuType;
    searchTerm: string;
  };
}

export interface DownloadButtonProps {
  searchId: string;
  totalRows: number;
  searchParams: {
    menu: MenuType;
    timeFrom: string;
    timeTo: string;
    searchTerm: string;
  };
}

export interface ProgressMessage {
  type: 'progress';
  fileName?: string;
  progress?: number;
  status?: DownloadStatus;
  message?: string;
  processedRows?: number;
  totalRows?: number;
  size?: number;
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
  searchParams?: {
    timeFrom: string;
    timeTo: string;
    menu: MenuType;
    searchTerm: string;
  };
  totalProgress?: {
    progress: number;
    status: DownloadStatus;
    processedRows: number;
    totalRows: number;
    processingSpeed: number;
    estimatedTimeRemaining: number;
    message: string;
  };
  newFiles?: Array<{
    fileName: string;
    status: DownloadStatus;
    progress: number;
    message?: string;
    processedRows: number;
    totalRows: number;
    size: number;
    searchParams: {
      timeFrom: string;
      timeTo: string;
      menu: MenuType;
      searchTerm: string;
    };
  }>;
}

export const isProgressMessage = (
  message: unknown
): message is ProgressMessage => {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message as { type: string }).type === 'progress'
  );
};
