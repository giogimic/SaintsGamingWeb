'use client';

import React, { useEffect } from 'react';
import { runBootSequence } from '@/client/boot/BootSequence';
import { ClientApp } from '@/client/ClientApp';

/** Player-facing lobby client — fully rebuilt in src/client */
export default function PlayerClient({
  characterId,
  forceCreate,
}: {
  characterId?: string;
  forceCreate?: boolean;
}) {
  useEffect(() => {
    // In a real session, we'd fetch the active account ID and permission level.
    // For now we'll stub it with a test account.
    runBootSequence({
      accountId: 'test_account',
      permissionLevel: 0,
      characterId,
      initialMapId: 'LOBBY',
      isStudio: false,
    });
  }, [characterId]);

  return <ClientApp />;
}
