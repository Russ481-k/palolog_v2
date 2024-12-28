import { createReadStream, existsSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

export async function GET(req: NextRequest) {
    const filePath = req.nextUrl.searchParams.get('file');
    if (!filePath) {
        return new NextResponse('File path is required', { status: 400 });
    }

    const fullPath = join(process.cwd(), 'downloads', filePath.split('/').pop()!);

    // 보안 체크
    if (!existsSync(fullPath) || !fullPath.startsWith(join(process.cwd(), 'downloads'))) {
        return new NextResponse('File not found', { status: 404 });
    }

    const stream = createReadStream(fullPath);
    const fileName = filePath.split('/').pop();

    return new NextResponse(stream as any, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Cache-Control': 'no-cache'
        },
    });
} 