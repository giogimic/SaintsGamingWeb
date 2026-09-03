import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { redirect } from 'next/navigation';
import { canEnterStudio } from '@/shared/game/studioPermissions';
import { StudioAuthorizeClient } from './StudioAuthorizeClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authorize Studio | Saints Gaming',
  description: 'Connect your Saints Gaming account to the desktop World Studio.',
};

export default async function StudioConnectPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/auth/studio-connect');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      permissionLevel: true,
      image: true,
      email: true,
    },
  });

  if (!dbUser) {
    redirect('/login?callbackUrl=/auth/studio-connect');
  }

  const hasAccess = canEnterStudio(dbUser.permissionLevel);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <StudioAuthorizeClient user={dbUser} hasAccess={hasAccess} />
    </div>
  );
}
