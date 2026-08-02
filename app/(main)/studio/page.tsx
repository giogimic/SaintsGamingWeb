import { StudioLobby } from '@/web/components/the-lobby/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Studio | Saints Gaming',
  description: 'Developer Studio for The Lobby — world building and game tools.',
};

export default async function StudioPage(props: {
  searchParams: Promise<{ characterId?: string; create?: string }>;
}) {
  const params = await props.searchParams;

  return (
    <div className="w-full bg-[#0a0a0f] overflow-hidden relative h-[100dvh]">
      <StudioLobby
        characterId={params.characterId}
        forceCreate={params.create === 'true'}
      />
    </div>
  );
}
