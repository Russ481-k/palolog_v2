import { stringify } from 'csv-stringify';
import * as fs from 'fs';
import * as path from 'path';

import { LogRecord } from '@/types/log';

export async function createCsvFile(
  logs: LogRecord[],
  chunkId: string
): Promise<string> {
  const csvDir = path.join(process.cwd(), 'downloads');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }

  const filePath = path.join(csvDir, `${chunkId}.csv`);
  const csvContent = stringify(logs, {
    header: true,
    columns: Object.keys(logs[0] || {}),
  });

  await fs.promises.writeFile(filePath, csvContent);
  return filePath;
}
