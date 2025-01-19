export class FileGenerationManager {
  constructor() {
    this.activeGenerations = new Map();
    this.progressInterval = 700; // 0.5초마다 진행상황 업데이트
    this.lastEmitTime = new Map();
    this.intervals = new Map();
  }
  async startGeneration(downloadId, fileName, searchParams, totalRows, socket) {
    const state = {
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
      await this.completeGeneration(downloadId);
    } catch (error) {
      console.error('File generation failed:', error);
      await this.handleError(downloadId, error);
    }
  }
  async completeGeneration(downloadId) {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;
    // 마지막 progress 업데이트 (100%)
    const finalProgress = {
      type: 'generation',
      downloadId,
      fileName: state.fileName,
      progress: 100,
      status: 'generating',
      timestamp: new Date().toISOString(),
      processedRows: state.totalRows,
      totalRows: state.totalRows,
      message: `Generating file... ${state.totalRows.toLocaleString()} of ${state.totalRows.toLocaleString()} rows`,
      processingSpeed: 0,
      estimatedTimeRemaining: 0,
    };
    // Progress 100% 이벤트 발송
    state.socket.emit('generation', finalProgress);
    // 상태를 ready로 변경하고 이벤트 발송
    state.status = 'ready';
    const readyEvent = {
      type: 'file_ready',
      downloadId,
      fileName: state.fileName,
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'File is ready for download',
      processedRows: state.totalRows,
      totalRows: state.totalRows,
      progress: 100,
    };
    // Ready 이벤트 발송
    state.socket.emit('file_ready', readyEvent);
    // 리소스 정리
    await this.cleanupFiles(downloadId);
  }
  async handleError(downloadId, error) {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;
    const errorEvent = {
      type: 'generation',
      downloadId,
      fileName: state.fileName,
      status: 'failed',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Generation failed',
      processedRows: state.processedRows,
      totalRows: state.totalRows,
      progress: 0,
      searchParams: state.searchParams,
    };
    state.socket.emit('generation', errorEvent);
    await this.cleanupFiles(downloadId);
  }
  startProgressTracking(downloadId) {
    const interval = setInterval(() => {
      const state = this.activeGenerations.get(downloadId);
      if (!state) {
        this.stopProgressTracking(downloadId);
        return;
      }
      console.log('[FileGenerationManager] startProgressTracking 1:', {
        downloadId,
        timestamp: new Date().toISOString(),
      });
      this.updateProgress(downloadId);
    }, this.progressInterval);
    this.intervals.set(downloadId, interval);
  }
  stopProgressTracking(downloadId) {
    const interval = this.intervals.get(downloadId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(downloadId);
    }
  }
  updateProgress(downloadId) {
    const state = this.activeGenerations.get(downloadId);
    if (!state || state.status !== 'generating') return;
    const now = Date.now();
    const lastEmit = this.lastEmitTime.get(downloadId) || 0;
    if (now - lastEmit < this.progressInterval) return;
    const progress = Math.min(
      98,
      (state.processedRows / state.totalRows) * 100
    );
    const elapsedTime = (now - state.startTime.getTime()) / 1000;
    const processingSpeed = state.processedRows / elapsedTime;
    const remainingRows = state.totalRows - state.processedRows;
    const estimatedTimeRemaining =
      processingSpeed > 0 ? remainingRows / processingSpeed : 0;
    const event = {
      type: 'generation',
      downloadId,
      fileName: state.fileName,
      progress,
      status: state.status,
      timestamp: new Date().toISOString(),
      processedRows: state.processedRows,
      totalRows: state.totalRows,
      message: `Generating file... ${state.processedRows.toLocaleString()} of ${state.totalRows.toLocaleString()} rows`,
      processingSpeed,
      estimatedTimeRemaining,
      searchParams: state.searchParams,
    };
    state.socket.emit('generation', event);
    this.lastEmitTime.set(downloadId, now);
  }
  updateProcessedRows(downloadId, processedRows) {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;
    state.processedRows = processedRows;
    console.log('[FileGenerationManager] updateProcessedRows 2:', {
      downloadId,
      processedRows,
      timestamp: new Date().toISOString(),
    });
    this.updateProgress(downloadId);
  }
  async generateFile(downloadId) {
    const state = this.activeGenerations.get(downloadId);
    if (!state) return;
    // 실제 파일 생성 로직은 기존 코드를 유지하고 여기서 호출
    // 예: await existingFileGenerator.generate(state.searchParams);
  }
  async cleanupFiles(downloadId) {
    this.stopProgressTracking(downloadId);
    this.lastEmitTime.delete(downloadId);
    this.activeGenerations.delete(downloadId);
  }
}
