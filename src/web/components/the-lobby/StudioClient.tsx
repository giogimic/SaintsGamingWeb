'use client';

import TheLobby from './index';

/** Developer Studio client — world tools + shared MMO world. */
export default function StudioClient({
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
      mode="studio"
    />
  );
}
