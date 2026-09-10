'use client';

import React, { useEffect } from 'react';
import { ClientApp } from '@/client/ClientApp';
import { useSessionStore } from '@/client/state/useSessionStore';

/** Player-facing lobby client — migrating to new ClientApp runtime */
export default function PlayerClient({
  characterId,
  forceCreate,
}: {
  characterId?: string;
  forceCreate?: boolean;
}) {
  useEffect(() => {
    // If a characterId was explicitly requested via URL, tell the session store.
    // The TitleScene / CharacterSelectScene will pick it up and handle it.
    if (characterId) {
      useSessionStore.getState().setCharacter(characterId);
    }
    if (forceCreate) {
      useSessionStore.getState().setScene('character_create');
    }
  }, [characterId, forceCreate]);

  return (
    <div className="w-full h-full">
      <ClientApp />
    </div>
  );
}
