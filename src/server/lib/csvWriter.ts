import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

export async function createCsvFile(
  data: Record<string, any>[],
  fileName: string,
  append = false
): Promise<string> {
  const downloadDir = join(process.cwd(), 'downloads');
  const filePath = join(downloadDir, fileName);

  // Ensure downloads directory exists
  await mkdir(downloadDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(filePath, {
      flags: append ? 'a' : 'w',
    });

    // Write headers only if not appending
    if (!append && data.length > 0 && data[0]) {
      const headers = Object.keys(data[0]).join(',') + '\n';
      writeStream.write(headers);
    }

    // Write data rows
    data.forEach((row) => {
      const values = Object.values(row).map((value) =>
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      );
      writeStream.write(values.join(',') + '\n');
    });

    writeStream.end();

    writeStream.on('finish', () => resolve(filePath));
    writeStream.on('error', reject);
  });
}
