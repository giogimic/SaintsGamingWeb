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
  Crosshair,
} from 'lucide-react';
import { useGameStore } from '../store';
import { canUseStudioDock } from '@/shared/game/studioPermissions';
import { STUDIO_MAP_CELLS_CHANGED_EVENT, STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { stripEditorOverlaysFromMapPayload } from '@/shared/game/mapLayers';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { invalidateMapCache } from '@/shared/game/mapCache';
import { normalizeStudioMapVisuals, formatMapWriteError } from '@/shared/game/studioMapCreate';
import { isGoMmoSocketEnabled } from '@/shared/net/goMmoSocket';
import { toBaseMapId } from '@/shared/net/mapIds';
import { soundSynth } from '@/engine/sound-synth';
import { PasteOptionsToolbar } from './PasteOptionsToolbar';
import { StudioOmnisearch } from './StudioOmnisearch';
import { StudioFavoritesStrip } from './StudioFavoritesStrip';
import { AssetStudioSuite } from './AssetStudioSuite';
import { HeroStudioSuite } from './hero-studio/HeroStudioSuite';
import { StudioContextMenu } from './StudioContextMenu';
import { GateConnectModal } from './GateConnectModal';
import { DestinationPlacementHUD } from './DestinationPlacementHUD';

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
const TileSelectorPanel = lazy(() => import('./panels/TileSelectorPanel').then((m) => ({ default: m.TileSelectorPanel })));
const LogicPainterPanel = lazy(() => import('./panels/LogicPainterPanel').then((m) => ({ default: m.LogicPainterPanel })));
const AnimationStudioPanel = lazy(() => import('./panels/AnimationStudioPanel').then((m) => ({ default: m.AnimationStudioPanel })));
const MapTabPanel = lazy(() => import('./panels/MapTabPanel').then((m) => ({ default: m.MapTabPanel })));
const MapListPanel = lazy(() => import('./panels/MapListPanel').then((m) => ({ default: m.MapListPanel })));
const InterfaceEditorPanel = lazy(() => import('./panels/InterfaceEditorPanel').then((m) => ({ default: m.InterfaceEditorPanel })));

const CameraSettingsPanel = lazy(() => import('./panels/CameraSettingsPanel').then((m) => ({ default: m.CameraSettingsPanel })));
const BiomeConfiguratorPanel = lazy(() => import('./panels/BiomeConfiguratorPanel').then((m) => ({ default: m.BiomeConfiguratorPanel })));
const WorldHierarchyPanel = lazy(() => import('./panels/WorldHierarchyPanel').then((m) => ({ default: m.WorldHierarchyPanel })));
const LayersPanel = lazy(() => import('./panels/LayersPanel').then((m) => ({ default: m.LayersPanel })));
const MaterialLibraryPanel = lazy(() => import('./panels/MaterialLibraryPanel').then((m) => ({ default: m.MaterialLibraryPanel })));
const SelectionPanel = lazy(() => import('./panels/SelectionPanel').then((m) => ({ default: m.SelectionPanel })));
const TransformPanel = lazy(() => import('./panels/TransformPanel').then((m) => ({ default: m.TransformPanel })));
const ProceduralAuthoringPanel = lazy(() => import('./panels/ProceduralAuthoringPanel').then((m) => ({ default: m.ProceduralAuthoringPanel })));

import { RuleDebuggerOverlay } from './RuleDebuggerOverlay';
import { DraggablePanel } from './DraggablePanel';


export const StudioEditorShell: React.FC = () => {
  const { data: session } = useSession();
  const permissionLevel = session?.user?.permissionLevel ?? 0;
  const isCreationMode = useEditorStore((state) => state.isCreationMode);
  const studioMode = useEditorStore((state) => state.studioMode);
  const mapDirty = useEditorStore((state) => state.mapDirty);
  const pieOptions = useEditorStore((state) => state.pieOptions);
  const setPieOption = useEditorStore((state) => state.setPieOption);
  const toggleCreationMode = useEditorStore((state) => state.toggleCreationMode);
  const enterDevelopmentMode = useEditorStore((state) => state.enterDevelopmentMode);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const showToast = useGameStore((state) => state.showToast);
  const gameMode = useGameStore((state) => state.gameMode);

  const canDev = canUseStudioDock(permissionLevel, 'dev');
  
  const [omnisearchOpen, setOmnisearchOpen] = useState(false);
  const [isStudioReady, setIsStudioReady] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tileR: number; tileC: number } | null>(null);

  useEffect(() => {
    // Restore dock geometry, then enter Development Mode (tools on by default).
    useEditorStore.getState().hydratePanelLayouts();
    useEditorStore.getState().enterDevelopmentMode();
    
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
    const currentMapId = useGameStore.getState().currentMapId;
    const baseMapId = currentMapId ? toBaseMapId(currentMapId) : null;
    if (!baseMapId) {
      showToast('No map loaded to save.');
      return;
    }
    soundSynth?.playActionSound?.();
    const live = useGameStore.getState().activeMapData;
    if (!live?.grid) {
      showToast('Map data not loaded yet — wait for the world to appear, then Save.');
      return;
    }
    const saveDoc = normalizeStudioMapVisuals(ensureMapHasStudioTilesets(live));
    if (saveDoc !== live) {
      useGameStore.getState().setActiveMapData(saveDoc);
    }
    useEditorStore.getState().setIsSavingMap(true);
    try {
      const payload = stripEditorOverlaysFromMapPayload({
        name: saveDoc.name || baseMapId,
        gameId: saveDoc.gameId,
        grid: saveDoc.grid,
        gates: saveDoc.gates || {},
        npcs: saveDoc.npcs || [],
        encounterPool: saveDoc.encounterPool || [],
        tileLayers: saveDoc.tileLayers || [],
        tilesets: saveDoc.tilesets || [],
      });
      const res = await fetch(`/api/maps/${encodeURIComponent(baseMapId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(formatMapWriteError(res.status, err));
        return;
      }
      invalidateMapCache(baseMapId);
      useEditorStore.getState().clearMapDirty();
      const backendUsed = isGoMmoSocketEnabled() ? 'Go MMO' : 'TS Server';
      showToast(`Saved map ${baseMapId} (Synced to ${backendUsed})`);
    } catch (e: any) {
      showToast(e?.message || 'Save failed — network error.');
    } finally {
      useEditorStore.getState().setIsSavingMap(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // '?' or 'F1' toggles keyboard shortcuts cheat sheet (Phase 8 Track C1)
      if ((e.key === '?' || e.key === 'F1') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('studio_open_shortcuts'));
        return;
      }

      // Ctrl+Shift+Q Save & Exit to Character Select
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
        setTimeout(() => { window.location.href = '/lobby'; }, 500);
        return;
      }

      // Ctrl+E toggles Editor ↔ Playtest
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const mode = useGameStore.getState().gameMode;
        if (mode !== 'EXPLORING' && mode !== 'BATTLE') return;
        const isCreation = useEditorStore.getState().isCreationMode;
        if (isCreation) {
          const hasUnsaved = useEditorStore.getState().hasUnsavedChanges || useEditorStore.getState().mapDirty;
          if (hasUnsaved) {
            if (confirm('You have unsaved changes. They will be lost if the map reloads during playtesting. Save before playing?')) {
              void performSave();
            }
          }
        }
        toggleCreationMode();
        return;
      }

      // Bracket keys [ ] cycle brush size
      if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        const currentSize = useEditorStore.getState().brushRadius;
        const SIZES = [1, 3, 5, 7];
        let idx = SIZES.indexOf(currentSize);
        if (idx === -1) idx = 0;
        
        if (e.key === ']') {
          idx = (idx + 1) % SIZES.length;
        } else {
          idx = (idx - 1 + SIZES.length) % SIZES.length;
        }
        useEditorStore.getState().setBrushRadius(SIZES[idx]);
        return;
      }

      // Ctrl+Shift+M or Ctrl+Shift+P toggles Atlas Studio
      if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        const curMode = useEditorStore.getState().studioMode;
        setStudioMode(curMode === 'atlas' ? 'develop' : 'atlas');
        return;
      }

      // Ctrl+Shift+A toggles Asset Studio
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const curMode = useEditorStore.getState().studioMode;
        setStudioMode(curMode === 'assets' ? 'develop' : 'assets');
        return;
      }

      // Ctrl+Shift+H toggles Hero Studio
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const curMode = useEditorStore.getState().studioMode;
        setStudioMode(curMode === 'hero' ? 'develop' : 'hero');
        return;
      }

      // Ctrl+Shift+O opens Problems & Diagnostics
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        useEditorStore.getState().openPanel('problems');
        showToast('Opened Map Diagnostics');
        return;
      }

      // Ctrl+Shift+D opens Dev Tools
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        useEditorStore.getState().openPanel('dev');
        showToast('Opened Dev Tools');
        return;
      }

      // Ctrl+K Omnisearch
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOmnisearchOpen((prev) => !prev);
        return;
      }

      // Ctrl+S Save
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
        return;
      }

      // Ctrl+Z / Ctrl+Y — map-scope undo/redo (editor runtime only)
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const result = useEditorStore.getState().triggerUndo(map);
        if (result.ok) showToast('Undo');
        return;
      }

      if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const result = useEditorStore.getState().triggerRedo(map);
        if (result.ok) showToast('Redo');
        return;
      }

      // Delete / Backspace — erase selected tiles or hovered tile
      if (!e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const result = useEditorStore.getState().deleteSelectionTiles(map);
        if (result.error) {
          showToast(result.error);
        } else if (result.count > 0) {
          const layerName = result.layerIdx === -1 ? 'Logic (−1)' : `Layer ${result.layerIdx}`;
          showToast(`Deleted ${result.count} tile${result.count === 1 ? '' : 's'} on ${layerName}`);
        } else {
          showToast('No tiles to delete.');
        }
        return;
      }

      // Ctrl+A — Select All tiles on active map (Phase 5C)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'a') {
        if (!useEditorStore.getState().isCreationMode) return;
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const h = map.grid?.length || 0;
        const w = map.grid?.[0]?.length || 0;
        if (h > 0 && w > 0) {
          e.preventDefault();
          useEditorStore.getState().setSelectionStart({ r: 0, c: 0 });
          useEditorStore.getState().setSelectionEnd({ r: h - 1, c: w - 1 });
          const activeEng = (window as any).__babylonEngine;
          if (activeEng?.setSelectionPreview) {
            activeEng.setSelectionPreview(0, 0, h - 1, w - 1);
          }
          showToast(`Selected entire map (${w}×${h})`);
          return;
        }
      }

      // Ctrl+D or Escape — Deselect / clear selection (Phase 5C & Spec)
      if (((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'd') || e.key === 'Escape') {
        if (!useEditorStore.getState().isCreationMode) return;
        if (e.key !== 'Escape') e.preventDefault();
        useEditorStore.getState().clearSelectedCells();
        useEditorStore.getState().setSelectionStart(null);
        useEditorStore.getState().setSelectionEnd(null);
        const activeEng = (window as any).__babylonEngine;
        if (activeEng?.clearSelectionPreview) {
          activeEng.clearSelectionPreview();
        }
        showToast('Deselected');
        return;
      }

      // Ctrl+C — Copy selection
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'c') {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const res = useEditorStore.getState().copySelection(map);
        if (res.ok) {
          showToast(`Copied ${res.width}×${res.height} tiles to clipboard`);
        } else {
          showToast(res.error || 'Copy failed');
        }
        return;
      }

      // Ctrl+X — Cut selection
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'x') {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const res = useEditorStore.getState().cutSelection(map);
        if (res.ok) {
          showToast(`Cut ${res.width}×${res.height} tiles (${res.count} cleared)`);
        } else {
          showToast(res.error || 'Cut failed');
        }
        return;
      }

      // Ctrl+Shift+V — Paste in Place
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        const clip = useEditorStore.getState().tileClipboard;
        if (!map || !clip) {
          showToast('Clipboard is empty. Copy tiles first (Ctrl+C).');
          return;
        }
        const res = useEditorStore.getState().pasteClipboard(
          map,
          null,
          clip.sourceOrigin.r,
          clip.sourceOrigin.c
        );
        if (res.ok) {
          showToast(`Pasted in place at [${clip.sourceOrigin.c}, ${clip.sourceOrigin.r}]`);
        } else {
          showToast(res.error || 'Paste failed');
        }
        return;
      }

      // Ctrl+V — Initiate Paste Mode
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'v') {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const clip = useEditorStore.getState().tileClipboard;
        if (!clip) {
          showToast('Clipboard is empty. Copy tiles first (Ctrl+C).');
          return;
        }
        useEditorStore.getState().setIsPasting(true);
        useEditorStore.getState().setBrushMode('paste');
        showToast(`Paste active (${clip.width}×${clip.height}) — click to place`);
        return;
      }

      // Ctrl+0 / Cmd+0 — Reset Zoom to 100% (Phase 2B)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 100 } }));
        showToast('Zoom reset to 100%');
        return;
      }

      // Home — Fit entire map in view
      if (e.key === 'Home' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('studio_fit_map'));
        showToast('Fit map in view');
        return;
      }

      // Stamp Transform Shortcuts (Phase 5A) — X (Flip H), Y (Flip V), Z (Rotate CW), Shift+Z (Rotate CCW)
      if (!e.ctrlKey && !e.altKey && !e.metaKey && useEditorStore.getState().isCreationMode) {
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          useEditorStore.getState().flipStampH();
          const t = useEditorStore.getState().stampTransform;
          showToast(`Stamp Flip H: ${t.flipH ? 'ON' : 'OFF'} (X)`);
          return;
        }

        if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          useEditorStore.getState().flipStampV();
          const t = useEditorStore.getState().stampTransform;
          showToast(`Stamp Flip V: ${t.flipV ? 'ON' : 'OFF'} (Y)`);
          return;
        }

        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            useEditorStore.getState().rotateStampCCW();
            const t = useEditorStore.getState().stampTransform;
            showToast(`Stamp Rotate: ${t.rotation}° (Shift+Z)`);
          } else {
            useEditorStore.getState().rotateStampCW();
            const t = useEditorStore.getState().stampTransform;
            showToast(`Stamp Rotate: ${t.rotation}° (Z)`);
          }
          return;
        }
      }

      // Single-key Tool Mode Shortcuts (Phase 5B) — B (Brush/Paint), E (Eraser), I (Eyedropper), M (Marquee Select), G (Prefab/Stamp), H (Layer Isolation)
      if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && useEditorStore.getState().isCreationMode) {
        if (!document.querySelector('[role="dialog"]')) {
          const key = e.key.toLowerCase();
          if (key === 'b') {
            e.preventDefault();
            useEditorStore.getState().setBrushMode('paint');
            showToast('Paint Brush (B)');
            return;
          }
          if (key === 'e') {
            e.preventDefault();
            useEditorStore.getState().setBrushMode('erase');
            showToast('Eraser (E)');
            return;
          }
          if (key === 'i') {
            e.preventDefault();
            useEditorStore.getState().setBrushMode('eyedropper');
            showToast('Eyedropper (I)');
            return;
          }
          if (key === 'm') {
            e.preventDefault();
            useEditorStore.getState().setBrushMode('select');
            showToast('Marquee Selection (M)');
            return;
          }
          if (key === 'g') {
            e.preventDefault();
            useEditorStore.getState().setBrushMode('prefab');
            showToast('Prefab Stamp (G)');
            return;
          }
          if (key === 'h') {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('studio_toggle_layer_dim'));
            showToast('Layer Isolation (H)');
            return;
          }
        }
      }

      // Escape — Cancel paste or selection
      if (e.key === 'Escape') {
        const store = useEditorStore.getState();
        if (store.isPasting || store.brushMode === 'paste') {
          e.preventDefault();
          store.cancelPaste();
          showToast('Paste cancelled.');
          return;
        }
        if (store.selectionStart || store.selectionEnd) {
          e.preventDefault();
          store.setSelectionStart(null);
          store.setSelectionEnd(null);
          const activeEng = (window as any).__babylonEngine;
          if (activeEng?.clearSelectionPreview) {
            activeEng.clearSelectionPreview();
          }
          showToast('Selection cleared.');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCreationMode, showToast]);

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

          {canUseStudioDock(permissionLevel, 'tileset') && (
            <DraggablePanel id="tileset" icon={<Grid3X3 className="w-4 h-4" />} title="Tile Selector">
              <Suspense fallback={<div>Loading...</div>}><TileSelectorPanel /></Suspense>
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

          {canUseStudioDock(permissionLevel, 'dev') && (
            <DraggablePanel id="camera" icon={<Settings className="w-4 h-4" />} title="Camera Settings">
              <Suspense fallback={<div>Loading...</div>}><CameraSettingsPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="biome" icon={<Globe className="w-4 h-4" />} title="Biome Configurator">
              <Suspense fallback={<div>Loading...</div>}><BiomeConfiguratorPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="hierarchy" icon={<Layers className="w-4 h-4" />} title="World Hierarchy">
              <Suspense fallback={<div>Loading...</div>}><WorldHierarchyPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'logic') && (
            <DraggablePanel id="layers" icon={<Layers className="w-4 h-4" />} title="Layers">
              <Suspense fallback={<div>Loading...</div>}><LayersPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="materials" icon={<Palette className="w-4 h-4" />} title="Material Library">
              <Suspense fallback={<div>Loading...</div>}><MaterialLibraryPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="selection" icon={<Crosshair className="w-4 h-4" />} title="Selection">
              <Suspense fallback={<div>Loading...</div>}><SelectionPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="transform" icon={<Settings2 className="w-4 h-4" />} title="Transform">
              <Suspense fallback={<div>Loading...</div>}><TransformPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'build') && (
            <DraggablePanel id="procedural" icon={<Settings2 className="w-4 h-4" />} title="Procedural Authoring">
              <Suspense fallback={<div>Loading...</div>}><ProceduralAuthoringPanel /></Suspense>
            </DraggablePanel>
          )}

          {canUseStudioDock(permissionLevel, 'interface') && (
            <DraggablePanel id="interface" icon={<Activity className="w-4 h-4" />} title="Interface Editor">
              <Suspense fallback={<div>Loading...</div>}><InterfaceEditorPanel /></Suspense>
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
    </>
  );
};
