import { TheLobby } from '@/web/components/the-lobby/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Lobby | Saints Gaming',
  description: 'The main online social hub and virtual metaverse for Saints Gaming community members.',
};

export default async function LobbyPage(props: { searchParams: Promise<{ characterId?: string, create?: string }> }) {
  const params = await props.searchParams;
  
  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0a0a0f] overflow-hidden z-50">
      <TheLobby characterId={params.characterId} forceCreate={params.create === 'true'} />
    </div>
  );
}
