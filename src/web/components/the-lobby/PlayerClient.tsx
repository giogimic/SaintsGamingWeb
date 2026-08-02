'use client';

import TheLobby from './index';

/** Player-facing lobby client — no Studio editor bundle. */
export default function PlayerClient({
  characterId,
  forceCreate,
}: {
  characterId?: string;
  forceCreate?: boolean;
}) {
  return (
    <TheLobby
      characterId={characterId}
      forceCreate={forceCreate}
      mode="player"
    />
  );
}
