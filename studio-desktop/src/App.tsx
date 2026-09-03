import React, { Suspense } from 'react';
import { DesktopAuthProvider, useDesktopAuth } from './providers/DesktopAuthProvider';
import { NextAuthShimProvider } from './providers/NextAuthShim';
import { DesktopTitlebar } from './components/DesktopTitlebar';
import { DesktopConnectScreen } from './components/DesktopConnectScreen';
import { StudioEditorShell } from '@/web/components/the-lobby/editor/StudioEditorShell';
import GameCanvasBabylon from '@/web/components/the-lobby/babylon/GameCanvasBabylon';
import { useGameStore } from '@/web/components/the-lobby/store';
import { useEditorStore } from '@/web/components/the-lobby/editor/editor-store';
import { Loader2 } from 'lucide-react';

const StudioMainWorkspace: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeBrushTileId = useEditorStore((state) => state.activeBrushTileId);
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);

  return (
    <div className="flex-1 relative overflow-hidden bg-[#050b14]">
      {/* 3D Babylon CAD Viewport */}
      <div className="absolute inset-0 z-0">
        <GameCanvasBabylon
          activeBrushTileId={activeBrushTileId}
          activeLayerIdx={activeLayerIdx}
          isDevEditorOpen={true}
          suppressGameplay={true}
          onMapClick={() => {}}
        />
      </div>

      {/* Volumetric Studio Editor Shell (Panels, Toolbars, Menus, Hotkeys) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <StudioEditorShell />
      </div>
    </div>
  );
};

const StudioDesktopContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useDesktopAuth();
  const currentMapId = useGameStore((state) => state.currentMapId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[#050b14]">
      {/* Native Desktop Window Titlebar */}
      <DesktopTitlebar activeMapTitle={currentMapId || undefined} />

      {/* Main Container */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-[#050b14] text-primary">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-mono text-slate-300">Initializing Saints World Studio...</span>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <DesktopConnectScreen />
      ) : (
        <NextAuthShimProvider>
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center bg-[#050b14] text-primary">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            }
          >
            <StudioMainWorkspace />
          </Suspense>
        </NextAuthShimProvider>
      )}
    </div>
  );
};

export default function App() {
  return (
    <DesktopAuthProvider>
      <StudioDesktopContent />
    </DesktopAuthProvider>
  );
}
