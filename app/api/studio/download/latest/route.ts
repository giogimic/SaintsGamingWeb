import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import packageJson from '@/../package.json';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: 'SITE_VERSION' } });
    const version = (versionSetting?.value || packageJson.version || '2.1.700').replace(/^v/, '');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

    // Direct download link for Windows setup
    const downloadUrl = `${siteUrl}/downloads/SaintsWorldStudio-Setup-${version}.exe`;
    return NextResponse.redirect(downloadUrl, 307);
  } catch {
    return NextResponse.json({ error: 'Download currently unavailable' }, { status: 500 });
  }
}
