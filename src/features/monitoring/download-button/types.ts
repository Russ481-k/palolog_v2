import { DownloadStatus } from '@/types/download';
import { MenuType } from '@/types/project';

export interface DownloadSearchParams {
  menu: MenuType;
  timeFrom: string;
  timeTo: string;
  searchTerm: string;
}

// Base interface for all progress-related messages
interface BaseProgressMessage {
  type: 'progress';
  fileName: string;
  processedRows: number;
  totalRows: number;
}

// For file generation progress updates
export interface GenerationProgressMessage extends BaseProgressMessage {
  status: 'generating';
  progress: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  message: string;
  searchParams: DownloadSearchParams;
}

// For download progress updates
export interface DownloadProgressMessage extends BaseProgressMessage {
  status: 'downloading' | 'completed' | 'failed';
  progress: number;
  size: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  message: string;
  searchParams: DownloadSearchParams;
}

// For file ready notification
export interface FileReadyMessage extends BaseProgressMessage {
  status: 'ready';
  progress: number;
  size: number;
  message: string;
  searchParams: DownloadSearchParams;
}

// For total progress updates
export interface TotalProgressMessage {
  type: 'progress';
  totalProgress: {
    progress: number;
    status: DownloadStatus;
    processedRows: number;
    totalRows: number;
    processingSpeed: number;
    estimatedTimeRemaining: number;
    message: string;
  };
}

// For new files notification
export interface NewFilesMessage {
  type: 'progress';
  newFiles: Array<{
    fileName: string;
    status: DownloadStatus;
    progress: number;
    message: string;
    processedRows: number;
    totalRows: number;
    size: number;
    searchParams: DownloadSearchParams;
  }>;
}

// Union type for all possible progress messages
export type ProgressMessage =
  | GenerationProgressMessage
  | DownloadProgressMessage
  | FileReadyMessage
  | TotalProgressMessage
  | NewFilesMessage;

export const isProgressMessage = (
  message: unknown
): message is ProgressMessage => {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message) ||
    message.type !== 'progress'
  ) {
    return false;
  }

  // Check for total progress message
  if ('totalProgress' in message) {
    return true;
  }

  // Check for new files message
  if ('newFiles' in message) {
    return true;
  }

  // Check for file-specific messages
  const msg = message as Partial<BaseProgressMessage>;
  return (
    typeof msg.fileName === 'string' &&
    typeof msg.processedRows === 'number' &&
    typeof msg.totalRows === 'number'
  );
};

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
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
  searchParams: DownloadSearchParams;
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
  searchParams: DownloadSearchParams;
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
  searchParams?: DownloadSearchParams;
}

export interface DownloadButtonProps {
  searchId: string;
  totalRows: number;
  searchParams: DownloadSearchParams;
  isLoading: boolean;
}
