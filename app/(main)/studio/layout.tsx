import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/web/lib/prisma';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';

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

  if (!dbUser || !hasPermission(dbUser.permissionLevel, PERMISSION_LEVELS.DEVELOPER)) {
    redirect('/lobby');
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0f] overflow-hidden">
      {children}
    </div>
  );
}
