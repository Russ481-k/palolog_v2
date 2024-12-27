export interface DownloadStatus {
    id: string;
    processedRows: number;
    totalRows: number;
    percentage: number;
    status: 'preparing' | 'processing' | 'completed' | 'failed';
    message?: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    files: string[];
}

export interface DownloadProgress {
    processedRows: number;
    totalRows: number;
    percentage: number;
    status: DownloadStatus['status'];
    message?: string;
    error?: string;
} 