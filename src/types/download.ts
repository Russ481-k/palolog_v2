import { MenuType } from './project';

export interface OpenSearchSource {
  [key: string]: string | number | boolean | null;
}

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'paused';

export type SortType = string | number | null;

export interface SearchParams {
  timeFrom: string;
  timeTo: string;
  searchTerm: string;
  menu: MenuType;
  from?: number;
  size?: number;
}

export interface ChunkProgress {
  fileName: string;
  downloadId: string;
  progress: number;
  status: DownloadStatus;
  processedRows: number;
  totalRows: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  message?: string;
  searchParams: SearchParams;
}

export interface DownloadProgress {
  fileName: string;
  downloadId: string;
  processedRows: number;
  totalRows: number;
  progress: number;
  status: DownloadStatus;
  message?: string;
  error?: string;
  startTime: Date;
  endTime?: Date;
  lastUpdateTime: number;
  lastProcessedCount: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  processingChunks: number;
  chunks: Array<{
    fileName: string;
    progress: number;
    status: DownloadStatus;
    message?: string;
    processedRows: number;
    totalRows: number;
  }>;
}

export interface ChunkConfig {
  downloadId: string;
  fileName: string;
  searchParams: SearchParams;
}

export interface DownloadProgressState {
  fileName?: string;
  processedRows: number;
  totalRows: number;
  progress: number;
  status: DownloadStatus;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  lastUpdateTime: number;
  lastProcessedCount: number;
}
