import { StudioLobby } from '@/web/components/the-lobby/dynamic';
import { MidnightTropicalBackground } from '@/web/components/the-lobby/MidnightTropicalBackground';
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden z-50">
      <MidnightTropicalBackground />
      <StudioLobby
        characterId={params.characterId}
        forceCreate={params.create === 'true'}
      />
    </div>
  );
}
