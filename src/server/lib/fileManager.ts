import * as fs from 'fs';
import { join } from 'path';

export interface FileInfo {
  id: string;
  displayName: string;
  path: string;
}

export class FileManager {
  private readonly downloadDir: string;

  constructor() {
    this.downloadDir = join(process.cwd(), 'downloads');
    this.ensureDownloadDirectory();
  }

  private async ensureDownloadDirectory(): Promise<void> {
    await fs.promises.mkdir(this.downloadDir, { recursive: true });
  }

  public createFile(
    menu: string,
    timestamp: string,
    index: number,
    total: number
  ): FileInfo {
    const displayName = `${menu}_${timestamp}_${index}of${total}.csv`;
    const id = displayName.replace('.csv', '');
    const path = join(this.downloadDir, displayName);

    return {
      id,
      displayName,
      path,
    };
  }

  public getFilePath(fileId: string): string {
    return join(this.downloadDir, `${fileId}.csv`);
  }

  public getDisplayName(fileId: string): string {
    return `${fileId}.csv`;
  }

  public async deleteFile(fileId: string): Promise<void> {
    const filePath = this.getFilePath(fileId);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  public createWriteStream(fileInfo: FileInfo): fs.WriteStream {
    return fs.createWriteStream(fileInfo.path);
  }
}
