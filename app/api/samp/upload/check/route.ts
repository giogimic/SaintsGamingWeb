import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).permissionLevel < 80) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { dirPath, relativePaths } = await request.json();

    if (!Array.isArray(relativePaths)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const SAMP_SERVER_DIR = path.join(process.cwd(), 'samp-server');
    const targetDir = path.normalize(path.join(SAMP_SERVER_DIR, dirPath || ''));

    if (!targetDir.startsWith(SAMP_SERVER_DIR)) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 });
    }

    const existingFiles: string[] = [];

    for (const relPath of relativePaths) {
      // Ensure the relative path doesn't try to escape
      const sanitizedRelPath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(targetDir, sanitizedRelPath);

      if (fullPath.startsWith(SAMP_SERVER_DIR) && fs.existsSync(fullPath)) {
        existingFiles.push(relPath);
      }
    }

    return NextResponse.json({ success: true, existingFiles });
  } catch (error: any) {
    console.error('[samp/upload/check] Check failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
