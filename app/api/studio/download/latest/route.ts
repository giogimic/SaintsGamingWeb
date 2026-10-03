import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import packageJson from '@/../package.json';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: 'SITE_VERSION' } });
    const version = (versionSetting?.value || packageJson.version || "2.2.106-update.0").replace(/^v/, '');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    // Check if an installer file actually exists in public/downloads
    const publicDownloads = path.join(process.cwd(), 'public', 'downloads');
    if (fs.existsSync(publicDownloads)) {
      const files = fs.readdirSync(publicDownloads);
      const exeMatch = files.find((f) => f.endsWith('.exe') && f.includes(version));
      const anyExe = files.find((f) => f.endsWith('.exe') && f.startsWith('Saints Gaming Setup'));
      const zipMatch = files.find((f) => f.endsWith('.zip') && f.includes(version));
      const anyZip = files.find((f) => f.endsWith('.zip'));

      const chosenFile = exeMatch || anyExe || zipMatch || anyZip;
      if (chosenFile) {
        return NextResponse.redirect(`${siteUrl}/downloads/${encodeURIComponent(chosenFile)}`, 307);
      }
    }

    // Direct download link fallback for Windows NSIS setup
    const downloadUrl = `${siteUrl}/downloads/Saints Gaming Setup ${version}.exe`;
    return NextResponse.redirect(downloadUrl, 307);
  } catch {
    return NextResponse.json({ error: 'Download currently unavailable' }, { status: 500 });
  }
}

