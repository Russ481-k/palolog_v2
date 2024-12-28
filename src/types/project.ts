export type MenuType = 'TRAFFIC' | 'THREAT' | 'SYSTEM';

export interface OpenSearchHit {
  _source: {
    [1]: string;
    [key: string]: string | number | null;
  };
  sort?: (string | number | null)[];
}

export interface DownloadChunk {
  id: string;
  startRow: number;
  endRow: number;
  totalRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}
