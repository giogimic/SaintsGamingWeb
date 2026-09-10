'use client';

import React from 'react';
import TheLobby from './index';

/** Player-facing lobby client — delegating to monolithic index.tsx for now */
export default function PlayerClient({
  characterId,
  forceCreate,
}: {
  characterId?: string;
  forceCreate?: boolean;
}) {
  return (
    <div className="w-full h-full">
      <TheLobby
        characterId={characterId}
        forceCreate={forceCreate}
        mode="player"
      />
    </div>
  );
}
