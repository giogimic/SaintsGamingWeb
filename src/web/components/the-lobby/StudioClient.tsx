'use client';

import TheLobby from './index';
import { StudioMenuBar } from './editor/StudioMenuBar';
import { StudioContextualBar } from './editor/StudioContextualBar';
import { StudioBottomToolbar } from './editor/StudioBottomToolbar';

/** Developer Studio client — world tools + shared MMO world. */
export default function StudioClient({
  characterId,
  forceCreate,
}: {
  characterId?: string;
  forceCreate?: boolean;
}) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* ── Top Studio Menu Bar & Contextual Workflow Bar ── */}
      <div className="relative z-[250] pointer-events-auto shrink-0 flex flex-col">
        <StudioMenuBar />
        <StudioContextualBar />
      </div>

      <div className="flex-1 relative z-0">
        <TheLobby
          characterId={characterId}
          forceCreate={forceCreate}
          mode="studio"
        />
      </div>

      {/* ── Bottom Status & Tool Bar ── */}
      <div className="relative z-[250] pointer-events-auto h-9 shrink-0">
        <StudioBottomToolbar />
      </div>
    </div>
  );
}
