import { DownloadStatus } from '@/types/download';

interface StatusDisplay {
  text: string;
  color: string;
}

export const statusDisplayMap = new Map([
  ['completed', { text: 'completed', color: 'green' }],
  ['downloading', { text: 'downloading', color: 'blue' }],
  ['failed', { text: 'failed', color: 'red' }],
  ['paused', { text: 'paused', color: 'orange' }],
  ['pending', { text: 'pending', color: 'gray' }],
  ['generating', { text: 'generating', color: 'purple' }],
  ['ready', { text: 'ready', color: 'teal' }],
] as const) as Map<DownloadStatus, StatusDisplay>;

export const defaultStatusDisplay: StatusDisplay = {
  text: 'pending',
  color: 'gray',
};

export type { StatusDisplay };
