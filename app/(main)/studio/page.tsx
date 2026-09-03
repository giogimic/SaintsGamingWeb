import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { redirect } from 'next/navigation';
import { StudioHubClient } from './StudioHubClient';
import packageJson from '@/../package.json';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World Studio | Saints Gaming',
  description: 'Download and launch the Saints Gaming World Studio standalone 3D volumetric authoring suite.',
};

export default async function StudioPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/studio');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      permissionLevel: true,
      email: true,
    },
  });

  if (!dbUser) {
    redirect('/login?callbackUrl=/studio');
  }

  const versionSetting = await prisma.siteSetting.findUnique({ where: { key: 'SITE_VERSION' } });
  const siteVersion = versionSetting?.value || packageJson.version || '2.1.699';

  return <StudioHubClient user={dbUser} siteVersion={siteVersion} />;
}
