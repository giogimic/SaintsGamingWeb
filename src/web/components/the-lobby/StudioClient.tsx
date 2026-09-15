'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { StudioMenuBar } from './editor/StudioMenuBar';
import { StudioContextualBar } from './editor/StudioContextualBar';
import { StudioBottomToolbar } from './editor/StudioBottomToolbar';
import { MidnightTropicalBackground } from '@/client/ui/shared/MidnightTropicalBackground';
import GameToastStack from './GameToastStack';
import { setEditorMode } from '@/shared/game/studioSession';

const StudioEditorShell = dynamic(
  () => import('./editor/StudioEditorShell').then((m) => m.StudioEditorShell),
  { ssr: false }
);

/** Developer Studio client — world tools + isolated authoring shell. */
export default function StudioClient() {
  useEffect(() => {
    setEditorMode(true);
    return () => setEditorMode(false);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <MidnightTropicalBackground />
      
      {/* ── Top Studio Menu Bar & Contextual Workflow Bar ── */}
      <div className="relative z-[250] pointer-events-auto shrink-0 flex flex-col">
        <StudioMenuBar />
        <StudioContextualBar />
      </div>

      <div className="flex-1 relative z-0 pointer-events-none">
        <Suspense fallback={null}>
          <StudioEditorShell />
        </Suspense>
        <GameToastStack />
      </div>

      {/* ── Bottom Status & Tool Bar ── */}
      <div className="relative z-[250] pointer-events-auto h-9 shrink-0">
        <StudioBottomToolbar />
      </div>
    </div>
  );
}
