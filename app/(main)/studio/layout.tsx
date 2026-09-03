import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/web/lib/prisma';
import { canEnterStudio } from '@/shared/game/studioPermissions';
import { getSystemSetupStatus } from '@/shared/game/setup/setupDetection';

export const metadata: Metadata = {
  title: 'Studio | Saints Gaming',
};

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setupStatus = await getSystemSetupStatus(prisma);
  if (!setupStatus.isSetupCompleted) {
    redirect('/setup');
  }

  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/studio');

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  // Single source of truth with the client gate. This route previously required
  // DEVELOPER while `canEnterStudio` (and every Studio dock and content API) uses
  // ADMIN, so Admins were shown OPEN STUDIO and then bounced back to /lobby.
  if (!dbUser || !canEnterStudio(dbUser.permissionLevel)) {
    redirect('/lobby');
  }

  return (
    <div className="min-h-[90vh] py-8 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
