import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import packageJson from '@/../package.json';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ target: string }> }
) {
  try {
    const { target } = await params;
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: 'SITE_VERSION' } });
    const version = versionSetting?.value || packageJson.version || '2.1.720';
    const cleanVersion = version.replace(/^v/, '');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const manifest = {
      version: cleanVersion,
      notes: `Saints Gaming World Studio Desktop v${cleanVersion} — Standalone 3D Volumetric CAD Authoring Suite`,
      pub_date: new Date().toISOString(),
      platforms: {
        [target || 'windows-x86_64']: {
          signature: '',
          url: `${siteUrl}/downloads/SaintsWorldStudio-Setup-${cleanVersion}.exe`,
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
