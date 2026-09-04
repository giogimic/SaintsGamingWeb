import React, { Suspense, useEffect, useState } from 'react';
import { DesktopAuthProvider, useDesktopAuth } from './providers/DesktopAuthProvider';
import { NextAuthShimProvider } from './providers/NextAuthShim';
import { DesktopTitlebar } from './components/DesktopTitlebar';
import { DesktopConnectScreen } from './components/DesktopConnectScreen';
import { StudioEditorShell } from '@/web/components/the-lobby/editor/StudioEditorShell';
import { StudioMenuBar } from '@/web/components/the-lobby/editor/StudioMenuBar';
import { StudioBottomToolbar } from '@/web/components/the-lobby/editor/StudioBottomToolbar';
import GameCanvasBabylon from '@/web/components/the-lobby/babylon/GameCanvasBabylon';
import { useGameStore } from '@/web/components/the-lobby/store';
import { useEditorStore } from '@/web/components/the-lobby/editor/editor-store';
import { loadMap } from '@/web/components/the-lobby/data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { MidnightTropicalBackground } from '@/web/components/the-lobby/MidnightTropicalBackground';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { CharacterSelector } from '@/web/components/the-lobby/character-selector';
import { getUserCharacters, loadGameCharacter } from '@/app/actions/game';
import { useDesktopMmoSocket } from './hooks/useDesktopMmoSocket';

const GameWorkspace: React.FC = () => {
  const { user } = useDesktopAuth();
  const currentMapId = useGameStore((state) => state.currentMapId);
  
  // Initialize Realtime multiplayer & map sync
  useDesktopMmoSocket(user?.id, currentMapId);

  const activeMapData = useGameStore((state) => state.activeMapData);
  const activeBrushTileId = useEditorStore((state) => state.activeBrushTileId);
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const isCreationMode = useEditorStore((state) => state.isCreationMode);

  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // 5. Authoritatively fetch and set activeMapData to boot Babylon
    // Only load if it's not already loaded or if the map ID changed.
    const store = useGameStore.getState();
    const mapId = store.currentMapId || 'LOBBY';
    
    if (!activeMapData || activeMapData.id !== mapId) {
      setIsLoadingMap(true);
      loadMap(mapId)
        .then((rawMap) => {
          const ensured = ensureMapHasStudioTilesets(rawMap);
          store.setActiveMapData(ensured);
          setIsLoadingMap(false);
        })
        .catch((err: any) => {
          console.warn('[GameWorkspace] Failed to fetch remote map, generating sandbox fallback:', err);
          try {
            const fallback = ensureMapHasStudioTilesets({
              id: mapId,
              name: 'Demo Sandbox',
              width: 32,
              height: 32,
              grid: Array(32).fill(0).map(() => Array(32).fill(0)),
              tileLayers: [],
              tilesets: [],
              gates: {},
              npcs: [],
              encounters: [],
            });
            store.setActiveMapData(fallback);
            setIsLoadingMap(false);
          } catch (fallbackErr: any) {
            setLoadError(fallbackErr?.message || 'Failed to initialize 3D Studio map');
            setIsLoadingMap(false);
          }
        });
    }
  }, [currentMapId]);

  return (
    <div className="flex-1 relative overflow-hidden bg-[#050b14] flex flex-col">
      {/* ── Persistent Midnight Tropical Background ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <MidnightTropicalBackground showPalms={true} showWater={true} />
      </div>

      {/* ── Top Studio Menu Bar (Only visible in Creation Mode) ── */}
      {isCreationMode && (
        <div className="relative z-50 pointer-events-auto shrink-0 flex flex-col">
          <StudioMenuBar />
        </div>
      )}

      {/* ── Main 3D Viewport & MDI Panels Container ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading Overlay */}
        {isLoadingMap && !activeMapData && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050b14]/90 backdrop-blur-md text-primary select-none">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
            <span className="font-mono text-xs text-slate-300">Loading 3D World...</span>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050b14] text-white p-6 select-none">
            <AlertCircle className="w-12 h-12 text-destructive mb-3" />
            <h2 className="text-lg font-bold mb-1">Failed to Load World Map</h2>
            <p className="text-xs text-muted-foreground mb-4 max-w-md text-center">{loadError}</p>
          </div>
        )}

        {/* 3D Babylon CAD Viewport */}
        <div className="absolute inset-0 z-0">
          <GameCanvasBabylon
            activeBrushTileId={activeBrushTileId}
            activeLayerIdx={activeLayerIdx}
            isDevEditorOpen={isCreationMode}
            suppressGameplay={isCreationMode}
            onMapClick={() => {}}
          />
        </div>

        {/* Volumetric Studio Editor Shell (Panels, Hotkeys, Overlays) */}
        {isCreationMode && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <StudioEditorShell />
          </div>
        )}
      </div>

      {/* ── Bottom Status & Tool Bar ── */}
      {isCreationMode && (
        <div className="relative z-50 pointer-events-auto h-9 shrink-0">
          <StudioBottomToolbar />
        </div>
      )}
    </div>
  );
};

const StudioDesktopContent: React.FC = () => {
  const { isAuthenticated, isLoading, serverUrl } = useDesktopAuth();
  const currentMapId = useGameStore((state) => state.currentMapId);
  const gameMode = useGameStore((state) => state.gameMode);
  
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [loadingChars, setLoadingChars] = useState(false);

  useEffect(() => {
    // Default to character select when authenticated
    if (isAuthenticated && gameMode === 'TITLE_SCREEN') {
      useGameStore.getState().setGameMode('CHARACTER_SELECT');
      loadCharacters();
    }
  }, [isAuthenticated, gameMode]);

  const loadCharacters = async () => {
    setLoadingChars(true);
    try {
      const charsRes = await getUserCharacters();
      if (charsRes.success && charsRes.data) {
        setUserCharacters(charsRes.data);
      }
    } catch (e) {
      console.error('Failed to load characters', e);
    }
    setLoadingChars(false);
  };

  const handleSelectCharacter = async (id: string) => {
    try {
      useGameStore.getState().setGameMode('EXPLORING');
      const res = await loadGameCharacter(id);
      if (res.success && res.data) {
        useGameStore.getState().hydratePlayer(res.data);
        useGameStore.getState().setCurrentMapId(res.data.currentMapId || 'LOBBY');
      }
    } catch (err) {
      console.error('Failed to load character', err);
      useGameStore.getState().setGameMode('CHARACTER_SELECT');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[#050b14]">
      {/* Native Desktop Window Titlebar */}
      <DesktopTitlebar activeMapTitle={currentMapId || undefined} />

      {/* Main Container */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-[#050b14] text-primary">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-mono text-slate-300">Initializing Saints Gaming...</span>
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
            {gameMode === 'CHARACTER_SELECT' ? (
              <div className="flex-1 relative">
                <CharacterSelector 
                  characters={userCharacters}
                  onSelect={handleSelectCharacter}
                  onCreateNew={() => {}}
                  onRefresh={loadCharacters}
                />
              </div>
            ) : (
              <GameWorkspace />
            )}
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
