import { TheLobby } from '@/components/the-lobby/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Lobby | Saints Gaming',
  description: 'The main online social hub and virtual metaverse for Saints Gaming community members.',
};

export default async function LobbyPage(props: { searchParams: Promise<{ characterId?: string, create?: string }> }) {
  const params = await props.searchParams;
  
  return (
    <div className="w-full min-h-[calc(100vh-7rem)] bg-[#0a0a0f] overflow-hidden relative">
      <TheLobby characterId={params.characterId} forceCreate={params.create === 'true'} />
    </div>
  );
}
