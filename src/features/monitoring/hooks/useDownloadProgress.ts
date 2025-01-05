import { useCallback, useState } from 'react';

import type { DownloadProgress, DownloadStatus } from '@/types/download';

interface DownloadProgressState {
  fileName: string;
  processedRows: number;
  totalRows: number;
  percentage: number;
  status: DownloadStatus;
  message?: string;
  error?: string;
  processingSpeed: number;
  estimatedTimeRemaining: number;
  lastUpdateTime: number;
  lastProcessedCount: number;
}

export function useDownloadProgress() {
  const [state, setState] = useState<DownloadProgressState>({
    fileName: '',
    processedRows: 0,
    totalRows: 0,
    percentage: 0,
    status: 'pending' as DownloadStatus,
    processingSpeed: 0,
    estimatedTimeRemaining: 0,
    lastUpdateTime: Date.now(),
    lastProcessedCount: 0,
  });

  const setProgress = useCallback((progress: DownloadProgress) => {
    setState((prevState) => {
      const currentTime = Date.now();
      const timeDiff = (currentTime - prevState.lastUpdateTime) / 1000;
      const processedRows = progress.processedRows ?? prevState.processedRows;
      const totalRows = progress.totalRows ?? prevState.totalRows;
      const processedDiff = processedRows - prevState.lastProcessedCount;

      const speed =
        timeDiff > 0 ? processedDiff / timeDiff : prevState.processingSpeed;
      const remaining =
        speed > 0
          ? (totalRows - processedRows) / speed
          : prevState.estimatedTimeRemaining;
      const percentage =
        totalRows > 0 ? Math.min(100, (processedRows / totalRows) * 100) : 0;

      return {
        fileName: progress.fileName,
        processedRows,
        totalRows,
        percentage,
        status: progress.status,
        message: progress.message,
        error: progress.error,
        processingSpeed: speed,
        estimatedTimeRemaining: remaining,
        lastUpdateTime: currentTime,
        lastProcessedCount: processedRows,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      fileName: '',
      processedRows: 0,
      totalRows: 0,
      percentage: 0,
      status: 'pending',
      processingSpeed: 0,
      estimatedTimeRemaining: 0,
      lastUpdateTime: Date.now(),
      lastProcessedCount: 0,
    });
  }, []);

  return {
    ...state,
    setProgress,
    reset,
  };
}
