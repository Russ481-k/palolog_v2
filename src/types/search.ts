export interface SearchParams {
  menu: string;
  timeFrom: string;
  timeTo: string;
  searchTerm: string;
  startRow?: number;
  endRow?: number;
}

export interface SearchBody {
  query: {
    bool: {
      must: Array<{
        range?: {
          '@timestamp': {
            gte: string;
            lte: string;
            format: string;
            time_zone: string;
          };
        };
        match?: {
          [key: string]: string;
        };
        multi_match?: {
          query: string;
          fields: string[];
          type: string;
        };
      }>;
    };
  };
}
