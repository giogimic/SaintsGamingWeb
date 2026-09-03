import React, { Suspense, useEffect, useState } from 'react';
import { DesktopAuthProvider, useDesktopAuth } from './providers/DesktopAuthProvider';
import { NextAuthShimProvider } from './providers/NextAuthShim';
import { DesktopTitlebar } from './components/DesktopTitlebar';
import { DesktopConnectScreen } from './components/DesktopConnectScreen';
import { DesktopHomeScreen } from './components/DesktopHomeScreen';
import { StudioEditorShell } from '@/web/components/the-lobby/editor/StudioEditorShell';
import { StudioMenuBar } from '@/web/components/the-lobby/editor/StudioMenuBar';
import { StudioBottomToolbar } from '@/web/components/the-lobby/editor/StudioBottomToolbar';
import GameCanvasBabylon from '@/web/components/the-lobby/babylon/GameCanvasBabylon';
import { useGameStore } from '@/web/components/the-lobby/store';
import { useEditorStore } from '@/web/components/the-lobby/editor/editor-store';
import { loadMap } from '@/web/components/the-lobby/data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { MidnightTropicalBackground } from '@/web/components/the-lobby/MidnightTropicalBackground';
import { canEnterStudio } from '@/shared/game/studioPermissions';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

type AppView = 'home' | 'studio';

const StudioMainWorkspace: React.FC<{ onBackToHome: () => void }> = ({ onBackToHome }) => {
  const { user } = useDesktopAuth();
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const activeBrushTileId = useEditorStore((state) => state.activeBrushTileId);
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);

  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const initializeWorkspace = async () => {
    setIsLoadingMap(true);
    setLoadError(null);

    const store = useGameStore.getState();
    const editor = useEditorStore.getState();

    // 1. Enter exploring game mode so StudioEditorShell is active (bypasses TITLE_SCREEN guard)
    store.setGameMode('EXPLORING');

    // 2. Default to DEMO_SANDBOX map
    const targetMapId = store.currentMapId && store.currentMapId !== 'LOBBY'
      ? store.currentMapId
      : 'DEMO_SANDBOX';
    store.setCurrentMapId(targetMapId);

    // 3. Enable creation mode & start in Paint mode
    editor.setStudioMode('develop');
    useEditorStore.setState({ isCreationMode: true });

    // 4. Hydrate player entity so Babylon character hooks and position exist
    store.hydratePlayer({
      id: user?.id || 'studio_user',
      name: user?.displayName || user?.username || 'Studio Creator',
      assetProfileId: 'adventurer',
      currentMapId: targetMapId,
      position: { x: 15, y: 15 },
      direction: 'down',
      isMoving: false,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      skills: {},
      inventory: [],
      equipment: {},
    });

    // 5. Authoritatively fetch and set activeMapData to boot Babylon
    try {
      const rawMap = await loadMap(targetMapId);
      const ensured = ensureMapHasStudioTilesets(rawMap);
      store.setActiveMapData(ensured);
      setIsLoadingMap(false);
    } catch (err: any) {
      console.warn('[StudioMainWorkspace] Failed to fetch remote map, generating sandbox fallback:', err);
      try {
        const fallback = ensureMapHasStudioTilesets({
          id: targetMapId,
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
    }
  };

  useEffect(() => {
    initializeWorkspace();
  }, []);

  return (
    <div className="flex-1 relative overflow-hidden bg-[#050b14] flex flex-col">
      {/* ── Persistent Midnight Tropical Background ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <MidnightTropicalBackground showPalms={true} showWater={true} />
      </div>

      {/* ── Top Studio Menu Bar (File, Edit, View, Mode switchers, Save) ── */}
      <div className="relative z-50 pointer-events-auto h-10 shrink-0">
        <StudioMenuBar onBackToHome={onBackToHome} />
      </div>

      {/* ── Main 3D Viewport & MDI Panels Container ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading Overlay */}
        {isLoadingMap && !activeMapData && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050b14]/90 backdrop-blur-md text-primary select-none">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
            <span className="font-mono text-xs text-slate-300">Loading 3D World Sandbox...</span>
          </div>
        )}

        {/* Error Fallback */}
        {loadError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050b14] text-white p-6 select-none">
            <AlertCircle className="w-12 h-12 text-destructive mb-3" />
            <h2 className="text-lg font-bold mb-1">Failed to Load World Map</h2>
            <p className="text-xs text-muted-foreground mb-4 max-w-md text-center">{loadError}</p>
            <button
              onClick={initializeWorkspace}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

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

        {/* Volumetric Studio Editor Shell (Panels, Hotkeys, Overlays) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <StudioEditorShell />
        </div>
      </div>

      {/* ── Bottom Status & Tool Bar (Brush selector, Coordinates, Layer isolation) ── */}
      <div className="relative z-50 pointer-events-auto h-9 shrink-0">
        <StudioBottomToolbar />
      </div>
    </div>
  );
};

const StudioDesktopContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useDesktopAuth();
  const currentMapId = useGameStore((state) => state.currentMapId);
  const [activeView, setActiveView] = useState<AppView>('home');

  const userCanStudio = canEnterStudio(user?.permissionLevel);

  // Reset to home when user signs out
  useEffect(() => {
    if (!isAuthenticated) setActiveView('home');
  }, [isAuthenticated]);

  // Guard: if user doesn't have studio permission, force back to home
  useEffect(() => {
    if (activeView === 'studio' && !userCanStudio) setActiveView('home');
  }, [activeView, userCanStudio]);

  const handleLaunchStudio = () => {
    if (userCanStudio) setActiveView('studio');
  };

  const titlebarLabel = activeView === 'studio'
    ? (currentMapId || 'World Studio')
    : undefined;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[#050b14]">
      {/* Native Desktop Window Titlebar */}
      <DesktopTitlebar activeMapTitle={titlebarLabel} appView={activeView} />

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
      ) : activeView === 'studio' && userCanStudio ? (
        <NextAuthShimProvider>
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center bg-[#050b14] text-primary">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            }
          >
            <StudioMainWorkspace onBackToHome={() => setActiveView('home')} />
          </Suspense>
        </NextAuthShimProvider>
      ) : (
        <DesktopHomeScreen onLaunchStudio={handleLaunchStudio} />
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
