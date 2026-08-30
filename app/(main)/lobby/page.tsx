import { TheLobby } from '@/web/components/the-lobby/dynamic';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus } from '@/shared/game/setup/setupDetection';

export const metadata: Metadata = {
  title: 'The Lobby | Saints Gaming',
  description: 'The main online social hub and virtual metaverse for Saints Gaming community members.',
};

export default async function LobbyPage(props: { searchParams: Promise<{ characterId?: string; create?: string }> }) {
  const setupStatus = await getSystemSetupStatus(prisma);
  if (!setupStatus.isSetupCompleted) {
    const session = await auth();
    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 200 || user.role === 'ADMIN' || setupStatus.userCount <= 1);
    if (isAdmin) {
      redirect('/setup');
    }
  }

  const params = await props.searchParams;
  
  return (
    <TheLobby characterId={params.characterId} forceCreate={params.create === 'true'} />
  );
}

