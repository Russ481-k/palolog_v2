import { z } from 'zod';

export const SUPPORTED_VERSIONS = ['10.1', '11.0'];
export const versionSchema = z.enum(SUPPORTED_VERSIONS);
export const DEFAULT_VERSION = '11.0';
export const VERSIONS = [
  { version: '11.0', description: 'PAN-OS 11.0' },
  { version: '10.1', description: 'PAN-OS 10.1' },
];
export function validateVersion(version) {
  return SUPPORTED_VERSIONS.includes(version);
}
