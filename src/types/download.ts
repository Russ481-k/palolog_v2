import { MenuType } from './project';

export interface OpenSearchSource {
  [key: string]: string | number | boolean | null;
}

export type DownloadStatus =
  | 'progress'
  | 'generating'
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'failed';

export type WebSocketEventType =
  | 'subscribe'
  | 'connected'
  | 'error'
  | 'generation'
  | 'file_ready'
  | 'download_progress'
  | 'count_update';

export interface WebSocketEvent {
  type: WebSocketEventType;
  downloadId: string;
  fileName?: string;
  clientFileName?: string;
  progress?: number;
  status?: DownloadStatus;
  timestamp: string;
  message?: string;
  error?: string;
  processedRows?: number;
  totalRows?: number;
  searchParams?: SearchParams;
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
  expectedRows?: number;
  actualRows?: number;
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
  clientFileName?: string;
  downloadId: string;
  size: number;
  status: DownloadStatus;
  progress: number;
  processedRows: number;
  totalRows: number;
  message: string;
  searchParams: SearchParams;
  startTime: Date;
  processingSpeed: number;
  estimatedTimeRemaining: number;
}

export interface DownloadProgress {
  fileName: string;
  clientFileName?: string;
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

export interface WebSocketMessage {
  type: 'progress' | 'file_ready';
  downloadId: string;
  fileName: string;
  clientFileName?: string;
  status: DownloadStatus;
  progress: number;
  processedRows: number;
  totalRows: number;
  message?: string;
  timestamp: string;
}
