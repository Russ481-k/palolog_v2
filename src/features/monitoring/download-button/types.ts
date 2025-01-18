import { DownloadStatus } from '@/types/download';
import { MenuType } from '@/types/project';

export interface DownloadSearchParams {
  menu: MenuType;
  timeFrom: string;
  timeTo: string;
  searchTerm: string;
}

// Base interface for all progress-related messages
export interface BaseProgressMessage {
  type: 'progress';
  downloadId: string;
  fileName: string;
  status: DownloadStatus;
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  clientFileName: string;
  searchParams: DownloadSearchParams;
  size: number;
  speed: number;
  firstReceiveTime?: string;
  lastReceiveTime?: string;
}

// For file generation progress updates
export interface GenerationProgressMessage extends BaseProgressMessage {
  status: 'generating';
}

// For download progress updates
export interface DownloadProgressMessage extends BaseProgressMessage {
  status: 'downloading' | 'completed' | 'failed';
}

// For file ready notification
export interface FileReadyMessage extends BaseProgressMessage {
  status: 'ready';
}

// Union type for all possible progress messages
export type ProgressMessage =
  | GenerationProgressMessage
  | DownloadProgressMessage
  | FileReadyMessage;

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
  const msg = message as Partial<BaseProgressMessage>;

  return true;
};

export interface FileData {
  id: string;
  downloadId: string;
  fileName: string;
  status: DownloadStatus;
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  size: number;
  selected: boolean;
  timeRange: string;
  firstReceiveTime?: string;
  lastReceiveTime?: string;
}

export interface FileStatus {
  fileName: string;
  clientFileName?: string;
  downloadId: string;
  status: DownloadStatus;
  progress: number;
  processedRows: number;
  totalRows: number;
  message?: string;
  size?: number;
  firstReceiveTime?: string;
  lastReceiveTime?: string;
  processingSpeed?: number;
  estimatedTimeRemaining?: number;
}

export type FileStatuses = Record<string, FileStatus>;

export interface DownloadState {
  downloadId: string;
  size: number;
  clientFileName: string;
  status: DownloadStatus;
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

export interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalProgress?: {
    progress: number;
    status: DownloadStatus;
    processedRows: number;
    totalRows: number;
    processingSpeed: number;
    estimatedTimeRemaining: number;
    message: string;
  };
  fileStatuses: FileStatuses;
  selectedFiles: string[];
  onFileSelection: (fileName: string, selected: boolean) => void;
  onFileDownload: (fileName: string) => void;
  onDownloadSelected: () => void;
  gridTheme: string;
}
