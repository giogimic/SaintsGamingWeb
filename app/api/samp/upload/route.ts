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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    let dirPath = formData.get('dirPath') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!dirPath) dirPath = '';

    const SAMP_SERVER_DIR = path.join(process.cwd(), 'samp-server');
    const targetDir = path.normalize(path.join(SAMP_SERVER_DIR, dirPath));

    if (!targetDir.startsWith(SAMP_SERVER_DIR)) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, file.name);
    
    // Process the file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, filePath });
  } catch (error: any) {
    console.error('[samp/upload] Upload failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
