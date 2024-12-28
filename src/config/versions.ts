import { z } from 'zod';

export const SUPPORTED_VERSIONS = ['10.1', '11.0'] as const;
export type PANOSVersion = (typeof SUPPORTED_VERSIONS)[number];

export const versionSchema = z.enum(SUPPORTED_VERSIONS);

export const DEFAULT_VERSION: PANOSVersion = '11.0';

export interface VersionChoice {
  version: PANOSVersion;
  description: string;
}

export const VERSIONS: VersionChoice[] = [
  { version: '11.0', description: 'PAN-OS 11.0' },
  { version: '10.1', description: 'PAN-OS 10.1' },
];

export function validateVersion(version: string): version is PANOSVersion {
  return SUPPORTED_VERSIONS.includes(version as PANOSVersion);
}
