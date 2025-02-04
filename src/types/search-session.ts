import { MenuType } from './project';

export type SearchSessionStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'ERROR';

export interface SearchParams {
  timeFrom: string;
  timeTo: string;
  menu: MenuType;
  searchTerm: string;
  currentPage?: number;
  limit?: number;
}

export interface SearchSession {
  id: string;
  userId: string;
  clientIp: string;
  userAgent: string;
  searchId: string;
  status: SearchSessionStatus;
  searchParams: SearchParams;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  cancelReason: string | null;
}

export interface CreateSearchSessionInput {
  userId: string;
  clientIp: string;
  userAgent: string;
  searchId: string;
  searchParams: SearchParams;
}

export interface UpdateSearchSessionInput {
  status?: SearchSessionStatus;
  lastActivityAt?: Date;
  cancelReason?: string | null;
}
