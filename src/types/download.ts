import { MenuType } from './project';

export interface OpenSearchSource {
  [key: string]: string | number | boolean | null;
}

export type DownloadStatus =
  | 'pending'
  | 'generating'
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'paused';

export type WebSocketEventType =
  | 'subscribe'
  | 'generation_progress'
  | 'file_ready'
  | 'download_progress'
  | 'count_update';

export interface WebSocketEvent {
  type: WebSocketEventType;
  downloadId: string;
  fileName?: string;
  progress?: number;
  status?: DownloadStatus;
  timestamp: string;
  message?: string;
  processedRows?: number;
  totalRows?: number;
  searchParams?: SearchParams;
}

export type SortType = string | number | null;

export interface SearchParams {
  timeFrom: string;
  timeTo: string;
  menu: MenuType;
  searchTerm?: string;
  searchAfter?: string[];
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
  processingSpeed: number;
  estimatedTimeRemaining: number;
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

export interface DownloadButtonProps {
  searchId: string;
  totalRows: number;
  searchParams: {
    menu: 'TRAFFIC';
    timeFrom: string;
    timeTo: string;
    searchTerm: string;
  };
}
