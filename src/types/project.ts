export type MenuType = 'TRAFFIC' | 'THREAT' | 'SYSTEM';

export interface OpenSearchHit {
  _source: Record<string, string | number | null>;
  sort?: (string | number | null)[];
}
