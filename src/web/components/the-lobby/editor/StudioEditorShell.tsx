'use client';

import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import {
  useEditorStore,
  PanelId,
  StudioMode,
  STUDIO_MODE_META,
  STUDIO_DOCK_META,
} from './editor-store';
import {
  Hammer,
  Settings2,
  Image as ImageIcon,
  Users,
  TerminalSquare,
  Sword,
  PawPrint,
  UserCheck,
  ScrollText,
  MessageSquare,
  Play,
  Coins,
  Wrench,
  Footprints,
  UserRound,
  Package,
  Globe,
  AlertCircle,
  Flame,
  Loader2,
  Grid3X3,
  Layers,
  Settings,
  Shield,
  Sparkles,
  Activity,
  CloudUpload,
  Film,
  Compass,
  Palette,
  Camera,
  Crosshair,
  RotateCw,
} from 'lucide-react';
import { resolveTilesetTextureUrl } from '@/shared/game/tileBatchHelpers';
import { useGameStore } from '../store';
import { canUseStudioDock } from '@/shared/game/studioPermissions';
import { STUDIO_MAP_CELLS_CHANGED_EVENT, STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { soundSynth } from '@/engine/sound-synth';
import { PasteOptionsToolbar } from './PasteOptionsToolbar';
import { StudioOmnisearch } from './StudioOmnisearch';
import { StudioFavoritesStrip } from './StudioFavoritesStrip';
import { AssetStudioSuite } from './AssetStudioSuite';
import { HeroStudioSuite } from './hero-studio/HeroStudioSuite';
import { StudioContextMenu } from './StudioContextMenu';
import { GateConnectModal } from './GateConnectModal';
import { DestinationPlacementHUD } from './DestinationPlacementHUD';
import { MapPersistenceService } from './services/MapPersistenceService';
import { StudioKeyboardRouter } from './services/StudioKeyboardRouter';

// Lazy-loaded dock panels for maximum code-splitting & startup performance (Phase 8 Track D2)
const WorldBuilderPanel = lazy(() => import('./panels/WorldBuilderPanel').then((m) => ({ default: m.WorldBuilderPanel })));
const PropertiesPanel = lazy(() => import('./panels/PropertiesPanel').then((m) => ({ default: m.PropertiesPanel })));
const AssetBrowserPanel = lazy(() => import('./panels/AssetBrowserPanel').then((m) => ({ default: m.AssetBrowserPanel })));
const EntityEditorPanel = lazy(() => import('./panels/EntityEditorPanel').then((m) => ({ default: m.EntityEditorPanel })));
const DevToolsPanel = lazy(() => import('./panels/DevToolsPanel').then((m) => ({ default: m.DevToolsPanel })));
const StreamingInspectorPanel = lazy(() => import('./panels/StreamingInspectorPanel').then((m) => ({ default: m.StreamingInspectorPanel })));
const CreatureDefEditorPanel = lazy(() => import('./panels/CreatureDefEditorPanel').then((m) => ({ default: m.CreatureDefEditorPanel })));
const QuestEditorPanel = lazy(() => import('./panels/QuestEditorPanel').then((m) => ({ default: m.QuestEditorPanel })));
const DialogueEditorPanel = lazy(() => import('./panels/DialogueEditorPanel').then((m) => ({ default: m.DialogueEditorPanel })));
const LootManagerPanel = lazy(() => import('./panels/LootManagerPanel').then((m) => ({ default: m.LootManagerPanel })));
const ItemEditorPanel = lazy(() => import('./panels/ItemEditorPanel').then((m) => ({ default: m.ItemEditorPanel })));
const ProfessionEditorPanel = lazy(() => import('./panels/ProfessionEditorPanel').then((m) => ({ default: m.ProfessionEditorPanel })));
const RecipeEditorPanel = lazy(() => import('./panels/RecipeEditorPanel').then((m) => ({ default: m.RecipeEditorPanel })));
const MonsterSpawnerPanel = lazy(() => import('./panels/MonsterSpawnerPanel').then((m) => ({ default: m.MonsterSpawnerPanel })));
const PrefabBuilderPanel = lazy(() => import('./panels/PrefabBuilderPanel').then((m) => ({ default: m.PrefabBuilderPanel })));
const WorldAtlasPanel = lazy(() => import('./panels/WorldAtlasPanel').then((m) => ({ default: m.WorldAtlasPanel })));
const StudioProblemsPanel = lazy(() => import('./panels/StudioProblemsPanel').then((m) => ({ default: m.StudioProblemsPanel })));
const GameplayStudioPanels = lazy(() => import('./panels/GameplayStudioPanels'));
const RealmSettingsPanel = lazy(() => import('./panels/RealmSettingsPanel').then((m) => ({ default: m.RealmSettingsPanel })));
const DungeonEditorPanel = lazy(() => import('./panels/DungeonEditorPanel').then((m) => ({ default: m.DungeonEditorPanel })));
const ShopEditorPanel = lazy(() => import('./panels/ShopEditorPanel').then((m) => ({ default: m.ShopEditorPanel })));
const MountEditorPanel = lazy(() => import('./panels/MountEditorPanel').then((m) => ({ default: m.MountEditorPanel })));
const WorldEventPanel = lazy(() => import('./panels/WorldEventPanel').then((m) => ({ default: m.WorldEventPanel })));
const SimulationPresetPanel = lazy(() => import('./panels/SimulationPresetPanel').then((m) => ({ default: m.SimulationPresetPanel })));
const PublishManagerPanel = lazy(() => import('./panels/PublishManagerPanel').then((m) => ({ default: m.PublishManagerPanel })));
const LogicPainterPanel = lazy(() => import('./panels/LogicPainterPanel').then((m) => ({ default: m.LogicPainterPanel })));
const AnimationStudioPanel = lazy(() => import('./panels/AnimationStudioPanel').then((m) => ({ default: m.AnimationStudioPanel })));
const MapTabPanel = lazy(() => import('./panels/MapTabPanel').then((m) => ({ default: m.MapTabPanel })));
const MapListPanel = lazy(() => import('./panels/MapListPanel').then((m) => ({ default: m.MapListPanel })));
const InterfaceEditorPanel = lazy(() => import('./panels/InterfaceEditorPanel').then((m) => ({ default: m.InterfaceEditorPanel })));
const CameraSettingsPanel = lazy(() => import('./panels/CameraSettingsPanel').then((m) => ({ default: m.CameraSettingsPanel })));
const BiomeConfiguratorPanel = lazy(() => import('./panels/BiomeConfiguratorPanel').then((m) => ({ default: m.BiomeConfiguratorPanel })));
const MaterialLibraryPanel = lazy(() => import('./panels/MaterialLibraryPanel').then((m) => ({ default: m.MaterialLibraryPanel })));
const LayersPanel = lazy(() => import('./panels/LayersPanel').then((m) => ({ default: m.LayersPanel })));
const WorldHierarchyPanel = lazy(() => import('./panels/WorldHierarchyPanel').then((m) => ({ default: m.WorldHierarchyPanel })));
const SelectionPanel = lazy(() => import('./panels/SelectionPanel').then((m) => ({ default: m.SelectionPanel })));
const TransformPanel = lazy(() => import('./panels/TransformPanel').then((m) => ({ default: m.TransformPanel })));
const ProceduralAuthoringPanel = lazy(() => import('./panels/ProceduralAuthoringPanel').then((m) => ({ default: m.ProceduralAuthoringPanel })));

import { RuleDebuggerOverlay } from './RuleDebuggerOverlay';
import { DraggablePanel } from './DraggablePanel';
import { StudioEscapeMenu } from './StudioEscapeMenu';
import { StudioContextualBar } from './StudioContextualBar';


export const StudioEditorShell: React.FC = () => {
  const { data: session } = useSession();
  const permissionLevel = (session?.user as any)?.permissionLevel ?? 0;
  const isCreationMode = useEditorStore((state) => state.isCreationMode);
  const studioMode = useEditorStore((state) => state.studioMode);
  const mapDirty = useEditorStore((state) => state.mapDirty);
  const pieOptions = useEditorStore((state) => state.pieOptions);
  const setPieOption = useEditorStore((state) => state.setPieOption);
  const toggleCreationMode = useEditorStore((state) => state.toggleCreationMode);
  const enterDevelopmentMode = useEditorStore((state) => state.enterDevelopmentMode);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const isStudioEscapeMenuOpen = useEditorStore((state) => state.isStudioEscapeMenuOpen);
  const setIsStudioEscapeMenuOpen = useEditorStore((state) => state.setIsStudioEscapeMenuOpen);
  const showToast = useGameStore((state) => state.showToast);
  const gameMode = useGameStore((state) => state.gameMode);
  const activeMapData = useGameStore((state) => state.activeMapData);

  const canDev = canUseStudioDock(permissionLevel, 'dev');
  
  const [omnisearchOpen, setOmnisearchOpen] = useState(false);
  const [isStudioReady, setIsStudioReady] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tileR: number; tileC: number } | null>(null);

  useEffect(() => {
    // Restore dock geometry, then enter World Atlas Mode by default.
    useEditorStore.getState().hydratePanelLayouts();
    useEditorStore.getState().setStudioMode('atlas');
    
    // Simulate studio initialization and hide loading screen
    const timer = setTimeout(() => setIsStudioReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Handle dynamic dock panel opening
  useEffect(() => {
    const handleOpenDock = (e: Event) => {
      const customEv = e as CustomEvent<{ panelId: PanelId }>;
      const panelId = customEv.detail?.panelId;
      if (!panelId) return;
      useEditorStore.getState().openPanel(panelId);
    };

    window.addEventListener('studio_open_dock', handleOpenDock);
    return () => window.removeEventListener('studio_open_dock', handleOpenDock);
  }, []);

  // Handle dynamic map tab opening
  useEffect(() => {
    const handleOpenMapTab = (e: Event) => {
      // Maps are singletons in the MDI setup - use map browser or world profile bar
    };
    window.addEventListener('studio_open_map_tab', handleOpenMapTab);
    return () => window.removeEventListener('studio_open_map_tab', handleOpenMapTab);
  }, []);

  // Context menu on right click in canvas / viewport area
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (!useEditorStore.getState().isCreationMode) return;
      
      const target = e.target as HTMLElement;
      // Only trigger if clicking on canvas or viewport container
      const isCanvasOrViewport = target.tagName === 'CANVAS' || target.closest('.sg-viewport-tab') || target.closest('.sg-viewport-container');
      if (!isCanvasOrViewport) return;

      e.preventDefault();
      const state = useEditorStore.getState();
      const tile = state.hoveredTile || state.clickedTile || { r: 0, c: 0 };
      
      const key = `${tile.r},${tile.c}`;
      const isInsideSparse = Boolean(state.selectedCells[key]);
      const bounds = state.getSelectedBounds();
      const isInsideBounds = bounds && tile.r >= bounds.minR && tile.r <= bounds.maxR && tile.c >= bounds.minC && tile.c <= bounds.maxC;

      if (!isInsideSparse && !isInsideBounds) {
        state.setSelectionBox(tile.r, tile.r, tile.c, tile.c);
        const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
        engine?.setSelectionPreview?.(tile.r, tile.c, tile.r, tile.c);
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        tileR: tile.r,
        tileC: tile.c,
      });
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const performSave = async () => {
    const res = await MapPersistenceService.saveActiveMap();
    if (res.ok) {
      showToast(`Saved map ${res.mapId} (Synced to ${res.backendUsed})`);
    } else {
      showToast(res.error || 'Save failed');
    }
  };

  useEffect(() => {
    const onTriggerSave = () => {
      void performSave();
    };
    window.addEventListener(STUDIO_TRIGGER_SAVE_MAP_EVENT, onTriggerSave);
    return () => window.removeEventListener(STUDIO_TRIGGER_SAVE_MAP_EVENT, onTriggerSave);
  }, [showToast]);

  // Periodic Autosave every 5 minutes (Phase 8 Track F1)
  useEffect(() => {
    const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;
    const interval = setInterval(() => {
      const state = useEditorStore.getState();
      if (state.isCreationMode && (state.mapDirty || state.definitionOpStack.undo.length > 0) && !state.isSavingMap) {
        void performSave();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Command Router (Phase 8 Architecture Reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      StudioKeyboardRouter.handleKeyDown(e, {
        showToast,
        onToggleOmnisearch: () => setOmnisearchOpen((prev) => !prev),
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast]);

  // Dynamic Brush Radius: R in [1..16] via Ctrl + Mouse Wheel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const store = useEditorStore.getState();
        if (!store.isCreationMode) return;
        const delta = e.deltaY < 0 ? 1 : -1;
        const current = store.brushRadius;
        const next = Math.max(1, Math.min(16, current + delta));
        if (next !== current) {
          store.setBrushRadius(next);
          showToast(`Brush Radius: ${next} blocks (Ctrl+Scroll)`);
        }
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [showToast]);

  if (gameMode !== 'EXPLORING' && gameMode !== 'BATTLE') {
    return null;
  }

  // Playtest — compact return chip + PIE options
  if (!isCreationMode) {
    return (
      <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
        <div className="sg-glass max-w-md rounded-2xl border border-emerald-500/30 bg-[#050b14]/95 px-4 py-3 text-center shadow-2xl">
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            <Footprints className="h-4 w-4" />
            Playtest · PIE private shard
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Isolated from public lobby DEMO. Editor tools stay frozen until you stop playtest.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={pieOptions.isolateShard}
                disabled
                className="accent-emerald-500"
              />
              Isolate shard
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-300 hover:border-emerald-700/40">
              <input
                type="checkbox"
                checked={pieOptions.pauseSpawners}
                onChange={(e) => setPieOption('pauseSpawners', e.target.checked)}
                className="accent-emerald-500"
              />
              Pause spawners
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-300 hover:border-emerald-700/40">
              <input
                type="checkbox"
                checked={pieOptions.godMode}
                onChange={(e) => setPieOption('godMode', e.target.checked)}
                className="accent-emerald-500"
              />
              God mode (no encounters)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-500">
              <input
                type="checkbox"
                checked={pieOptions.pauseWorldEvents}
                disabled
                className="accent-emerald-500"
              />
              Pause world events
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => useEditorStore.getState().exitPlaytest()}
          className="sg-glass flex items-center gap-2 rounded-full border border-sg-gold/50 bg-card/95 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-sg-gold shadow-2xl hover:bg-sg-gold/20 cursor-pointer"
          title="Return to Editor (Ctrl+E)"
        >
          <Wrench className="h-4 w-4" />
          Stop Playtest
          <span className="font-medium normal-case tracking-normal text-slate-500">Ctrl+E</span>
        </button>
      </div>
    );
  }


  return (
    <>
      {!isStudioReady && (
        <div className="pointer-events-auto fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-500">
          <div className="flex flex-col items-center justify-center animate-pulse">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <span className="font-mono font-bold text-lg text-primary tracking-widest">INITIALIZING STUDIO...</span>
          </div>
        </div>
      )}
      <div className={`fixed inset-0 pointer-events-none z-[100] flex flex-col pt-10 pb-9 ${!isStudioReady ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}>
        {typeof window !== 'undefined' && !(window as any).electronAPI && (
          <div className="pointer-events-auto">
            <StudioContextualBar />
          </div>
        )}
        <PasteOptionsToolbar />
        <StudioFavoritesStrip />
        <StudioOmnisearch open={omnisearchOpen} onClose={() => setOmnisearchOpen(false)} />
        
        {/* Context Menu */}
        {contextMenu && (
          <StudioContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            tileR={contextMenu.tileR}
            tileC={contextMenu.tileC}
            onClose={() => setContextMenu(null)}
          />
        )}

        {/* MDI Free-Floating Windows Workspace Container */}
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
          <div className={`absolute inset-0 pointer-events-none ${studioMode === 'assets' || studioMode === 'atlas' || studioMode === 'hero' ? 'hidden' : ''}`}>
          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="build" icon={<Hammer className="w-4 h-4" />} title="World Builder">
              <Suspense fallback={<div>Loading...</div>}><WorldBuilderPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'logic') && (
            <DraggablePanel id="logic" icon={<Layers className="w-4 h-4" />} title="Logic Painter">
              <Suspense fallback={<div>Loading...</div>}><LogicPainterPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'properties') && (
            <DraggablePanel id="properties" icon={<Settings2 className="w-4 h-4" />} title="Properties">
              <Suspense fallback={<div>Loading...</div>}><PropertiesPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'assets') && (
            <DraggablePanel id="assets" icon={<ImageIcon className="w-4 h-4" />} title="Asset Browser">
              <Suspense fallback={<div>Loading...</div>}><AssetBrowserPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'npc') && (
            <DraggablePanel id="npc" icon={<Users className="w-4 h-4" />} title="NPC Editor">
              <Suspense fallback={<div>Loading...</div>}><EntityEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'quest') && (
            <DraggablePanel id="quest" icon={<ScrollText className="w-4 h-4" />} title="Quests">
              <Suspense fallback={<div>Loading...</div>}><QuestEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'dialogue') && (
            <DraggablePanel id="dialogue" icon={<MessageSquare className="w-4 h-4" />} title="Dialogue">
              <Suspense fallback={<div>Loading...</div>}><DialogueEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canDev && (
            <DraggablePanel id="dev" icon={<TerminalSquare className="w-4 h-4" />} title="Dev Tools">
              <Suspense fallback={<div>Loading...</div>}><DevToolsPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'creature') && (
            <DraggablePanel id="creature" icon={<PawPrint className="w-4 h-4" />} title="Creatures">
              <Suspense fallback={<div>Loading...</div>}><CreatureDefEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'loot') && (
            <DraggablePanel id="loot" icon={<Coins className="w-4 h-4" />} title="Loot Manager">
              <Suspense fallback={<div>Loading...</div>}><LootManagerPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'items') && (
            <DraggablePanel id="items" icon={<Package className="w-4 h-4" />} title="Items">
              <Suspense fallback={<div>Loading...</div>}><ItemEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'classes') && (
            <DraggablePanel id="classes" icon={<UserCheck className="w-4 h-4" />} title="Professions">
              <Suspense fallback={<div>Loading...</div>}><ProfessionEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'spawner') && (
            <DraggablePanel id="spawner" icon={<Sword className="w-4 h-4" />} title="Monster Spawner">
              <Suspense fallback={<div>Loading...</div>}><MonsterSpawnerPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'prefab') && (
            <DraggablePanel id="prefab" icon={<Package className="w-4 h-4" />} title="Prefab Builder">
              <Suspense fallback={<div>Loading...</div>}><PrefabBuilderPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'problems') && (
            <DraggablePanel id="problems" icon={<AlertCircle className="w-4 h-4" />} title="Diagnostics">
              <Suspense fallback={<div>Loading...</div>}><StudioProblemsPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'atlas') && (
            <DraggablePanel id="atlas" icon={<Globe className="w-4 h-4" />} title="World Atlas">
              <Suspense fallback={<div>Loading...</div>}><WorldAtlasPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'atlas') && (
            <DraggablePanel id="biome" icon={<Sparkles className="w-4 h-4 text-emerald-400" />} title="Biome Configurator">
              <Suspense fallback={<div>Loading...</div>}><BiomeConfiguratorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'settings') && (
            <DraggablePanel id="settings" icon={<Settings className="w-4 h-4" />} title="Server Settings">
              <Suspense fallback={<div>Loading...</div>}><RealmSettingsPanel /></Suspense>
            </DraggablePanel>
          )}

          {(canUseStudioDock(permissionLevel, 'maps') || canUseStudioDock(permissionLevel, 'atlas')) && (
            <DraggablePanel id="maps" icon={<Globe className="w-4 h-4" />} title="Map Browser">
              <Suspense fallback={<div>Loading...</div>}><MapListPanel /></Suspense>
            </DraggablePanel>
          )}

          {(canUseStudioDock(permissionLevel, 'dungeons') || canUseStudioDock(permissionLevel, 'dungeon')) && (
            <DraggablePanel id="dungeons" icon={<Shield className="w-4 h-4 text-purple-400" />} title="Dungeon Studio">
              <Suspense fallback={<div>Loading...</div>}><DungeonEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'gameplay') && (
            <DraggablePanel id="gameplay" icon={<Activity className="w-4 h-4 text-rose-400" />} title="Gameplay Hub & Combat Balance">
              <Suspense fallback={<div>Loading...</div>}><GameplayStudioPanels /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'mounts') && (
            <DraggablePanel id="mounts" icon={<Sparkles className="w-4 h-4 text-amber-400" />} title="Mount Studio">
              <Suspense fallback={<div>Loading...</div>}><MountEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'publishing') && (
            <DraggablePanel id="publishing" icon={<CloudUpload className="w-4 h-4 text-emerald-400" />} title="Publish & Releases">
              <Suspense fallback={<div>Loading...</div>}><PublishManagerPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'recipes') && (
            <DraggablePanel id="recipes" icon={<Flame className="w-4 h-4 text-orange-400" />} title="Recipe & Crafting">
              <Suspense fallback={<div>Loading...</div>}><RecipeEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'shop') && (
            <DraggablePanel id="shop" icon={<Coins className="w-4 h-4 text-yellow-400" />} title="Shop & Merchants">
              <Suspense fallback={<div>Loading...</div>}><ShopEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'simulation') && (
            <DraggablePanel id="simulation" icon={<Activity className="w-4 h-4 text-cyan-400" />} title="Simulation Presets">
              <Suspense fallback={<div>Loading...</div>}><SimulationPresetPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'streaming') && (
            <DraggablePanel id="streaming" icon={<Compass className="w-4 h-4 text-sky-400" />} title="Streaming Inspector">
              <Suspense fallback={<div>Loading...</div>}><StreamingInspectorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'worldevent') && (
            <DraggablePanel id="worldevent" icon={<Sparkles className="w-4 h-4 text-fuchsia-400" />} title="World Events">
              <Suspense fallback={<div>Loading...</div>}><WorldEventPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'animations') && (
            <DraggablePanel id="animations" icon={<Film className="w-4 h-4 text-teal-400" />} title="Animation Studio">
              <Suspense fallback={<div>Loading...</div>}><AnimationStudioPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'interface') && (
            <DraggablePanel id="interface" icon={<Palette className="w-4 h-4 text-amber-400" />} title="Interface Designer">
              <Suspense fallback={<div>Loading...</div>}><InterfaceEditorPanel /></Suspense>
            </DraggablePanel>
          )}

          <DraggablePanel id="camera" icon={<Camera className="w-4 h-4 text-primary" />} title="Camera & View Settings">
            <Suspense fallback={<div>Loading...</div>}><CameraSettingsPanel /></Suspense>
          </DraggablePanel>

          {canUseStudioDock(permissionLevel, 'hierarchy') && (
            <DraggablePanel id="hierarchy" icon={<Layers className="w-4 h-4 text-emerald-400" />} title="World Hierarchy">
              <Suspense fallback={<div>Loading...</div>}><WorldHierarchyPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'layers') && (
            <DraggablePanel id="layers" icon={<Layers className="w-4 h-4 text-cyan-400" />} title="Layers">
              <Suspense fallback={<div>Loading...</div>}><LayersPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'materials') && (
            <DraggablePanel id="materials" icon={<Palette className="w-4 h-4 text-amber-400" />} title="Material Library">
              <Suspense fallback={<div>Loading...</div>}><MaterialLibraryPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'selection') && (
            <DraggablePanel id="selection" icon={<Crosshair className="w-4 h-4 text-primary" />} title="Selection">
              <Suspense fallback={<div>Loading...</div>}><SelectionPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'transform') && (
            <DraggablePanel id="transform" icon={<RotateCw className="w-4 h-4 text-primary" />} title="Transform">
              <Suspense fallback={<div>Loading...</div>}><TransformPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'procedural') && (
            <DraggablePanel id="procedural" icon={<Sparkles className="w-4 h-4 text-purple-400" />} title="Procedural Authoring">
              <Suspense fallback={<div>Loading...</div>}><ProceduralAuthoringPanel /></Suspense>
            </DraggablePanel>
          )}
        </div>

        </div>

        {/* Asset Management Mode — full workspace replacement */}
        {studioMode === 'assets' && (
          <AssetStudioSuite />
        )}

        {/* Hero Studio Mode — full workspace replacement */}
        {studioMode === 'hero' && (
          <HeroStudioSuite />
        )}
      </div>

      <DestinationPlacementHUD />
      <GateConnectModal />
      <RuleDebuggerOverlay />
      <StudioEscapeMenu
        isOpen={isStudioEscapeMenuOpen}
        onClose={() => setIsStudioEscapeMenuOpen(false)}
        onSaveMap={() => window.dispatchEvent(new CustomEvent('studio_save_map'))}
        onExitStudio={() => {
          setIsStudioEscapeMenuOpen(false);
          useEditorStore.getState().toggleCreationMode();
          useGameStore.getState().setGameMode('EXPLORING');
        }}
      />
    </>
  );
};
