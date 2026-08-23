import { NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import path from 'path';

function getMimeType(ext: string): string {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    case '.ogg':
    case '.ogv':
      return 'video/ogg';
    case '.mkv':
      return 'video/x-matroska';
    case '.zip':
      return 'application/zip';
    case '.rar':
      return 'application/vnd.rar';
    case '.7z':
      return 'application/x-7z-compressed';
    case '.tar':
      return 'application/x-tar';
    case '.gz':
      return 'application/gzip';
    case '.bz2':
      return 'application/x-bzip2';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(req: Request, props: { params: Promise<{ path: string[] }> }) {
  try {
    const params = await props.params;
    
    // Prevent directory traversal
    const safePath = params.path.join('/').replace(/\.\./g, '');
    const filePath = path.join(process.cwd(), 'public', 'uploads', safePath);
    
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileSize = fileStat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getMimeType(ext);

    const rangeHeader = req.headers.get('range');

    // If Range header is present, handle partial content for video/audio seeking
    if (rangeHeader && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(fileStream);

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Full file response with Accept-Ranges support
    const fileStream = createReadStream(filePath);
    const webStream = Readable.toWeb(fileStream);

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('File not found', { status: 404 });
  }
}
