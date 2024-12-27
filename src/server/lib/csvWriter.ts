import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'csv-stringify/sync';

export async function createCsvFile(logs: any[], chunkId: string): Promise<string> {
    const csvDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(csvDir)) {
        fs.mkdirSync(csvDir, { recursive: true });
    }

    const filePath = path.join(csvDir, `${chunkId}.csv`);
    const csvContent = stringify(logs, {
        header: true,
        columns: Object.keys(logs[0] || {})
    });

    await fs.promises.writeFile(filePath, csvContent);
    return filePath;
} 