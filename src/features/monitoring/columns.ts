import { PANOSVersion } from '@/config/versions';

import { columnNames as columnNames_10_1 } from './10.1/colNameList_10.1';
import { columnNames as columnNames_11_0 } from './11.0/colNameList_11.0';

const versionMap: Record<PANOSVersion, string[]> = {
  '10.1': columnNames_10_1,
  '11.0': columnNames_11_0,
};

export function getColumnNames(version: PANOSVersion) {
  return versionMap[version];
}
