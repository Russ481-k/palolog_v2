import { DownloadStatus } from '@/types/download';
import { MenuType } from '@/types/project';

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

export interface FileStatus {
  fileName: string;
  progress: number;
  status: DownloadStatus;
  message: string;
  processedRows: number;
  totalRows: number;
  size: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  searchParams?: {
    timeFrom: string;
    timeTo: string;
  };
}

export type FileStatuses = Record<string, FileStatus>;

export interface FileData {
  fileName: string;
  size: number;
  lastModified: string;
  selected: boolean;
  status: DownloadStatus;
  progress: number;
  message?: string;
  processedRows: number;
  totalRows: number;
  timeRange: string;
  searchParams?: {
    timeFrom: string;
    timeTo: string;
    menu: MenuType;
    searchTerm: string;
  };
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
}

export interface WebSocketMessage {
  type: string;
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
  };
}

export interface SearchParams {
  timeFrom: string;
  timeTo: string;
  menu: string;
  searchTerm?: string;
  searchAfter?: string[];
}

export interface ChunkData
  extends Omit<FileStatus, 'processingSpeed' | 'estimatedTimeRemaining'> {
  fileName: string;
  progress: number;
  status: DownloadStatus;
  message: string;
  processedRows: number;
  totalRows: number;
  size: number;
  searchParams: {
    timeFrom: string;
    timeTo: string;
  };
}

export interface ProgressMessage {
  type: 'progress';
  fileName: string;
  progress: number;
  status: DownloadStatus;
  message: string;
  processedRows: number;
  totalRows: number;
  size: number;
  searchParams: SearchParams;
  timestamp: string;
  chunks: ChunkData[];
  processingSpeed: number;
  estimatedTimeRemaining: number;
}

export function isProgressMessage(
  message: WebSocketMessage
): message is ProgressMessage {
  return (
    message.type === 'progress' &&
    typeof message.fileName === 'string' &&
    typeof message.progress === 'number' &&
    typeof message.status === 'string' &&
    typeof message.message === 'string' &&
    typeof message.processedRows === 'number' &&
    typeof message.totalRows === 'number' &&
    typeof message.size === 'number' &&
    typeof message.processingSpeed === 'number' &&
    typeof message.estimatedTimeRemaining === 'number'
  );
}
