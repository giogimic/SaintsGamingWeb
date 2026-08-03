import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/web/lib/prisma';
import { canEnterStudio } from '@/shared/game/studioPermissions';

export const metadata: Metadata = {
  title: 'Studio | Saints Gaming',
};

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/studio');

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  // Bible 16 §5: Admin+ (Developers included). Creator Claims sandbox deferred.
  if (!dbUser || !canEnterStudio(dbUser.permissionLevel)) {
    redirect('/lobby');
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0f] overflow-hidden">
      {children}
    </div>
  );
}
