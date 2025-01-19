import { columnNames as columnNames_10_1 } from './versions/10.1/colNameList_10.1';
import { columnNames as columnNames_11_0 } from './versions/11.0/colNameList_11.0';

const versionMap = {
  10.1: columnNames_10_1,
  '11.0': columnNames_11_0,
};
export function getColumnNames(version) {
  return versionMap[version];
}
