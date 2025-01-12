import { Socket } from 'socket.io';

import { DownloadStatus, SearchParams, WebSocketEvent } from '@/types/download';

interface GenerationState {
  downloadId: string;
  fileName: string;
  status: DownloadStatus;
  progress: number;
  processedRows: number;
  totalRows: number;
  startTime: Date;
  socket: Socket;
  searchParams: SearchParams;
}

export class FileGenerationManager {
  private readonly activeGenerations = new Map<string, GenerationState>();
  private readonly progressInterval = 1000; // 1초마다 진행상황 업데이트

  async startGeneration(
    downloadId: string,
    fileName: string,
    searchParams: SearchParams,
    totalRows: number,
    socket: Socket
  ): Promise<void> {
    const state: GenerationState = {
      downloadId,
      fileName,
      status: 'generating',
      progress: 0,
      processedRows: 0,
      totalRows,
      startTime: new Date(),
      socket,
      searchParams,
    };

    this.activeGenerations.set(downloadId, state);
    this.startProgressTracking(downloadId);

    try {
      await this.generateFile(downloadId);
      this.emitFileReady(downloadId);
    } catch (error) {
      console.error('File generation failed:', error);
      this.emitError(
        downloadId,
        error instanceof Error ? error.message : 'Generation failed'
      );
    }
  }

  private startProgressTracking(downloadId: string): void {
    const interval = setInterval(() => {
      const state = this.activeGenerations.get(downloadId);
      if (!state) {
        clearInterval(interval);
        return;
      }

      // 진행상황 업데이트 및 전송
      this.updateProgress(downloadId);
    }, this.progressInterval);
  }

  private updateProgress(downloadId: string): void {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;

    // 진행상황 계산
    const elapsedTime = Date.now() - state.startTime.getTime();
    const estimatedProgress = Math.min(
      98,
      (elapsedTime / (state.totalRows * 10)) * 100
    );

    state.progress = estimatedProgress;
    state.processedRows = Math.floor(
      (state.totalRows * estimatedProgress) / 100
    );

    this.emitProgress(downloadId);
  }

  private emitProgress(downloadId: string): void {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;

    const event: WebSocketEvent = {
      type: 'generation_progress',
      downloadId,
      fileName: state.fileName,
      progress: state.progress,
      status: state.status,
      timestamp: new Date().toISOString(),
      processedRows: state.processedRows,
      totalRows: state.totalRows,
      message: 'Generating file...',
    };

    state.socket.emit('generation_progress', event);
  }

  private emitFileReady(downloadId: string): void {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;

    const event: WebSocketEvent = {
      type: 'file_ready',
      downloadId,
      fileName: state.fileName,
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'File is ready for download',
    };

    state.socket.emit('file_ready', event);
  }

  private emitError(downloadId: string, message: string): void {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;

    const event: WebSocketEvent = {
      type: 'generation_progress',
      downloadId,
      fileName: state.fileName,
      status: 'failed',
      timestamp: new Date().toISOString(),
      message,
    };

    state.socket.emit('generation_progress', event);
  }

  private async generateFile(downloadId: string): Promise<void> {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;

    // 실제 파일 생성 로직은 기존 코드를 유지하고 여기서 호출
    // 예: await existingFileGenerator.generate(state.searchParams);
  }

  async cleanupFiles(downloadId: string): Promise<void> {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;

    // 파일 정리 로직
    this.activeGenerations.delete(downloadId);
  }
}
