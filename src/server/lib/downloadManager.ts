import { DownloadStatus, DownloadProgress } from '@/types/download';

class DownloadManager {
    private downloads = new Map<string, DownloadStatus>();

    createDownload(id: string, totalRows: number): DownloadStatus {
        const status: DownloadStatus = {
            id,
            totalRows,
            processedRows: 0,
            percentage: 0,
            status: 'preparing',
            createdAt: new Date(),
            updatedAt: new Date(),
            files: []
        };
        this.downloads.set(id, status);
        return status;
    }

    updateProgress(id: string, processedRows: number, filePath?: string, message?: string) {
        const status = this.downloads.get(id);
        if (status) {
            status.processedRows = processedRows;
            if (filePath) status.files.push(filePath);
            if (message) status.message = message;
            status.updatedAt = new Date();
            if (processedRows >= status.totalRows) {
                status.status = 'completed';
            }
        }
    }

    getProgress(id: string): DownloadProgress | null {
        const status = this.downloads.get(id);
        if (!status) return null;

        return {
            processedRows: status.processedRows,
            totalRows: status.totalRows,
            percentage: Math.round((status.processedRows / status.totalRows) * 100),
            status: status.status,
            message: status.message,
            error: status.error
        };
    }

    setError(id: string, error: string) {
        const status = this.downloads.get(id);
        if (status) {
            status.status = 'failed';
            status.error = error;
            status.updatedAt = new Date();
        }
    }

    getFiles(id: string): string[] {
        return this.downloads.get(id)?.files ?? [];
    }

    cleanup(id: string) {
        this.downloads.delete(id);
    }
}

export const downloadManager = new DownloadManager(); 