import { env } from "@/env.mjs";
import { DownloadChunk } from "@/types/project";
import { randomUUID } from "crypto";

export class DownloadChunkManager {
    private static CHUNK_SIZE = env.DOWNLOAD_CHUNK_SIZE; // 50만 건 단위

    async createChunks(totalRows: number): Promise<DownloadChunk[]> {
        const chunks: DownloadChunk[] = [];
        const totalChunks = Math.ceil(totalRows / Number(DownloadChunkManager.CHUNK_SIZE));

        for (let i = 0; i < totalChunks; i++) {
            const startRow = i * Number(DownloadChunkManager.CHUNK_SIZE);
            const endRow = Math.min((i + 1) * Number(DownloadChunkManager.CHUNK_SIZE), totalRows);

            chunks.push({
                id: randomUUID(),
                startRow,
                endRow,
                totalRows,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        return chunks;
    }

    async processChunks(
        chunks: DownloadChunk[],
        processFunction: (chunk: DownloadChunk) => Promise<void>
    ): Promise<void> {
        for (const chunk of chunks) {
            try {
                chunk.status = 'processing';
                chunk.updatedAt = new Date();

                // 청크 처리
                await processFunction(chunk);

                chunk.status = 'completed';
                chunk.updatedAt = new Date();

                // 다음 청크 처리 전 잠시 대기 (시스템 부하 방지)
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                chunk.status = 'failed';
                chunk.updatedAt = new Date();
                throw error;
            }
        }
    }
}
