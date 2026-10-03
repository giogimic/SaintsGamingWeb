import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import packageJson from '@/../package.json';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ target: string }> }
) {
  try {
    const { target } = await params;
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: 'SITE_VERSION' } });
    const version = versionSetting?.value || packageJson.version || "2.2.105-update.0";
    const cleanVersion = version.replace(/^v/, '');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:24001';

    // Locate the actual installer filename if available on disk
    let installerFilename = `Saints Gaming Setup ${cleanVersion}.exe`;
    const publicDownloads = path.join(process.cwd(), 'public', 'downloads');
    if (fs.existsSync(publicDownloads)) {
      const files = fs.readdirSync(publicDownloads);
      const matched = files.find((f) => f.endsWith('.exe') && f.includes(cleanVersion))
        || files.find((f) => f.endsWith('.exe') && f.startsWith('Saints Gaming Setup'));
      if (matched) {
        installerFilename = matched;
      }
    }

    const manifest = {
      version: cleanVersion,
      notes: `Saints Gaming Desktop v${cleanVersion} — Standalone World Studio & Gaming Client`,
      pub_date: new Date().toISOString(),
      platforms: {
        [target || 'windows-x86_64']: {
          signature: '',
          url: `${siteUrl}/downloads/${encodeURIComponent(installerFilename)}`,
        },
      },
    };

    return NextResponse.json(manifest);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate update manifest' },
      { status: 500 }
    );
  }
}
