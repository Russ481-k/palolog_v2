import { createReadStream, existsSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

// 동적 라우트임을 명시
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get('file');

    if (!filePath) {
      return new NextResponse('File path is required', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const fullPath = join(
      process.cwd(),
      'downloads',
      filePath.split('/').pop()!
    );

    if (
      !existsSync(fullPath) ||
      !fullPath.startsWith(join(process.cwd(), 'downloads'))
    ) {
      return new NextResponse('File not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const stream = createReadStream(fullPath);
    const fileName = filePath.split('/').pop();

    // Node.js ReadStream을 Web ReadableStream으로 변환
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          controller.enqueue(new Uint8Array(buffer));
        });
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
