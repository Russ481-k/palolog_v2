export interface DownloadStatus {
    id: string;
    totalRows: number;
    processedRows: number;
    status: 'preparing' | 'processing' | 'completed' | 'failed';
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
} 