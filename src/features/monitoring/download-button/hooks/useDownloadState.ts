import { useCallback, useState } from 'react';

import { DownloadStatus } from '@/types/download';
import { MenuType } from '@/types/project';

import type { DownloadSearchParams, DownloadState, FileStatus } from '../types';

interface UseDownloadStateProps {
  onCleanup: (id: string) => void;
  onCancel: (id: string) => void;
}

interface UpdateFileStatusProps {
  fileName: string;
  update: Partial<FileStatus>;
  searchParams?: DownloadSearchParams;
}

const initialState: DownloadState = {
  downloadId: '',
  fileStatuses: {},
  selectedFiles: [],
  isOpen: false,
  isConnecting: false,
  isConnectionReady: false,
  totalProgress: undefined,
  searchParams: undefined,
};

const validTransitions: Record<DownloadStatus, DownloadStatus[]> = {
  pending: ['generating'],
  generating: ['ready', 'failed'],
  ready: ['downloading', 'failed'],
  downloading: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export const useDownloadState = ({
  onCleanup,
  onCancel,
}: UseDownloadStateProps) => {
  const [state, setState] = useState<DownloadState>(initialState);

  const updateFileStatus = useCallback(
    ({ fileName, update, searchParams }: UpdateFileStatusProps) => {
      setState((prev) => {
        const currentStatus = prev.fileStatuses[fileName];

        // 상태나 진행률이 변경되지 않았다면 업데이트 스킵
        if (
          currentStatus &&
          update.status === currentStatus.status &&
          update.progress === currentStatus.progress
        ) {
          console.log('[useDownloadState] Skipping duplicate update:', {
            fileName,
            status: update.status,
            progress: update.progress,
            timestamp: new Date().toISOString(),
          });
          return prev;
        }

        // 상태 전환 검증
        if (currentStatus?.status && update?.status) {
          const allowedTransitions = validTransitions[currentStatus.status];
          if (
            allowedTransitions &&
            !allowedTransitions.includes(update.status)
          ) {
            console.warn('[useDownloadState] Invalid state transition:', {
              fileName,
              currentStatus: currentStatus.status,
              newStatus: update.status,
              allowedTransitions,
              timestamp: new Date().toISOString(),
            });
            return prev;
          }
        }

        // 새 파일이거나 상태가 변경된 경우에만 업데이트
        const baseStatus: FileStatus = {
          status: 'pending',
          progress: 0,
          message: 'Initializing...',
          size: 0,
          processedRows: 0,
          totalRows: 0,
          processingSpeed: 0,
          estimatedTimeRemaining: 0,
          searchParams: {
            timeFrom: '',
            timeTo: '',
            menu: 'TRAFFIC' as MenuType,
            searchTerm: '',
          },
        };

        // 새 파일인 경우에만 임시 파일명 사용
        const targetFileName = currentStatus
          ? fileName
          : `${searchParams?.menu || 'TRAFFIC'}_${new Date().toISOString().replace('T', '_').slice(0, 19)}_pending.csv`;

        const newStatus: FileStatus = {
          ...(currentStatus || baseStatus),
          ...update,
          searchParams:
            searchParams ||
            currentStatus?.searchParams ||
            baseStatus.searchParams,
        };

        console.log('[useDownloadState] Updating file status:', {
          fileName,
          targetFileName,
          currentStatus: currentStatus?.status,
          newStatus: update?.status,
          currentProgress: currentStatus?.progress,
          newProgress: update?.progress,
          timestamp: new Date().toISOString(),
        });

        // update가 undefined인 경우 이전 상태 유지
        if (!update) {
          return prev;
        }

        return {
          ...prev,
          fileStatuses: {
            ...prev.fileStatuses,
            [targetFileName]: newStatus,
          },
        };
      });
    },
    []
  );

  const handleFileSelection = (fileName: string, selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: selected
        ? [...prev.selectedFiles, fileName]
        : prev.selectedFiles.filter((f) => f !== fileName),
    }));
  };

  const handleError = (error: Error) => {
    console.error('Download error:', error);
    if (state.downloadId) {
      onCancel(state.downloadId);
    }
    setState((prev) => ({
      ...prev,
      isOpen: false,
      isConnecting: false,
      isConnectionReady: false,
    }));
  };

  const handleModalClose = () => {
    if (state.downloadId) {
      onCleanup(state.downloadId);
    }
    setState((prev) => ({
      ...prev,
      isOpen: false,
      isConnecting: false,
      isConnectionReady: false,
    }));
  };

  return {
    state,
    setState,
    updateFileStatus,
    handleFileSelection,
    handleError,
    handleModalClose,
  };
};
