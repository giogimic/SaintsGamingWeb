'use client';

import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { Layout, Model, TabNode, IJsonModel, Action, Actions, DockLocation } from 'flexlayout-react';
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
import { StudioMenuBar } from './StudioMenuBar';
import { PasteOptionsToolbar } from './PasteOptionsToolbar';
import { StudioOmnisearch } from './StudioOmnisearch';
import { StudioFavoritesStrip } from './StudioFavoritesStrip';
import { StudioBottomToolbar } from './StudioBottomToolbar';
import { FullScreenMapBrowser } from './FullScreenMapBrowser';
import { AssetStudioSuite } from './AssetStudioSuite';
import { AtlasStudioSuite } from './AtlasStudioSuite';
import { StudioContextMenu } from './StudioContextMenu';

// Lazy-loaded dock panels for maximum code-splitting & startup performance (Phase 8 Track D2)
const WorldBuilderPanel = lazy(() => import('./panels/WorldBuilderPanel').then((m) => ({ default: m.WorldBuilderPanel })));
const PropertiesPanel = lazy(() => import('./panels/PropertiesPanel').then((m) => ({ default: m.PropertiesPanel })));
const AssetBrowserPanel = lazy(() => import('./panels/AssetBrowserPanel').then((m) => ({ default: m.AssetBrowserPanel })));
const EntityEditorPanel = lazy(() => import('./panels/EntityEditorPanel').then((m) => ({ default: m.EntityEditorPanel })));
const DevToolsPanel = lazy(() => import('./panels/DevToolsPanel').then((m) => ({ default: m.DevToolsPanel })));
const StreamingInspectorPanel = lazy(() => import('./panels/StreamingInspectorPanel').then((m) => ({ default: m.StreamingInspectorPanel })));
const StarterHeroEditorPanel = lazy(() => import('./panels/StarterHeroEditorPanel').then((m) => ({ default: m.StarterHeroEditorPanel })));
const CreatureDefEditorPanel = lazy(() => import('./panels/CreatureDefEditorPanel').then((m) => ({ default: m.CreatureDefEditorPanel })));
const ClassEditorPanel = lazy(() => import('./panels/ClassEditorPanel').then((m) => ({ default: m.ClassEditorPanel })));
const QuestEditorPanel = lazy(() => import('./panels/QuestEditorPanel').then((m) => ({ default: m.QuestEditorPanel })));
const DialogueEditorPanel = lazy(() => import('./panels/DialogueEditorPanel').then((m) => ({ default: m.DialogueEditorPanel })));
const LootManagerPanel = lazy(() => import('./panels/LootManagerPanel').then((m) => ({ default: m.LootManagerPanel })));
const ItemEditorPanel = lazy(() => import('./panels/ItemEditorPanel').then((m) => ({ default: m.ItemEditorPanel })));
const MonsterSpawnerPanel = lazy(() => import('./panels/MonsterSpawnerPanel').then((m) => ({ default: m.MonsterSpawnerPanel })));
const PrefabBuilderPanel = lazy(() => import('./panels/PrefabBuilderPanel').then((m) => ({ default: m.PrefabBuilderPanel })));
const WorldAtlasPanel = lazy(() => import('./panels/WorldAtlasPanel').then((m) => ({ default: m.WorldAtlasPanel })));
const StudioProblemsPanel = lazy(() => import('./panels/StudioProblemsPanel').then((m) => ({ default: m.StudioProblemsPanel })));
const GameplayStudioPanels = lazy(() => import('./panels/GameplayStudioPanels'));
const RealmSettingsPanel = lazy(() => import('./panels/RealmSettingsPanel').then((m) => ({ default: m.RealmSettingsPanel })));

const initialLayout: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabSetEnableMaximize: false
  },
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 20,
        id: "left-dock",
        children: [
          { type: "tab", id: "build", name: "World Builder", component: "build" }
        ]
      },
      {
        type: "tabset",
        weight: 60,
        id: "center-viewport",
        enableDrop: false,
        enableDrag: false,
        children: [
          {
            type: "tab",
            id: "viewport",
            name: "Viewport",
            component: "viewport",
            enableClose: false,
            className: "sg-viewport-tab",
            tabsetClassName: "sg-viewport-tabset",
          }
        ]
      },
      {
        type: "tabset",
        weight: 20,
        id: "right-dock",
        children: [
          { type: "tab", id: "properties", name: "Properties", component: "properties" }
        ]
      }
    ]
  },
  borders: [
    {
      type: "border",
      location: "bottom",
      size: 300,
      children: [
        { type: "tab", id: "assets", name: "Sprite Picker", component: "assets" },
        { type: "tab", id: "dev", name: "Dev Tools", component: "dev" }
      ]
    }
  ]
};

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
  
  const layoutRef = useRef<any>(null);
  const [model] = useState(() => Model.fromJson(initialLayout));
  const [omnisearchOpen, setOmnisearchOpen] = useState(false);
  const [mapBrowserOpen, setMapBrowserOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tileR: number; tileC: number } | null>(null);

  useEffect(() => {
    // Restore dock geometry, then enter Development Mode (tools on by default).
    useEditorStore.getState().hydratePanelLayouts();
    enterDevelopmentMode();
  }, [enterDevelopmentMode]);

  // Handle dynamic dock panel opening (from menus, shortcuts, omnisearch)
  useEffect(() => {
    const handleOpenDock = (e: Event) => {
      const customEv = e as CustomEvent<{ panelId: PanelId }>;
      const panelId = customEv.detail?.panelId;
      if (!panelId || !model) return;

      const meta = STUDIO_DOCK_META[panelId];
      if (!meta) return;

      const existingNode = model.getNodeById(panelId);
      if (existingNode) {
        model.doAction(Actions.selectTab(panelId));
      } else {
        const isRightDock = panelId === 'properties' || panelId === 'problems';
        const targetTabsetId = isRightDock ? 'right-dock' : 'left-dock';
        
        try {
          model.doAction(Actions.addNode({
            type: "tab",
            id: panelId,
            name: meta.label,
            component: panelId,
          }, targetTabsetId, DockLocation.CENTER, -1));
        } catch {
          // Fallback to active tabset
          model.doAction(Actions.addNode({
            type: "tab",
            id: panelId,
            name: meta.label,
            component: panelId,
          }, "left-dock", DockLocation.CENTER, -1));
        }
      }
    };

    window.addEventListener('studio_open_dock', handleOpenDock);
    return () => window.removeEventListener('studio_open_dock', handleOpenDock);
  }, [model]);

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

      // Ctrl+D — Deselect / clear selection (Phase 5C)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'd') {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        useEditorStore.getState().setSelectionStart(null);
        useEditorStore.getState().setSelectionEnd(null);
        const activeEng = (window as any).__babylonEngine;
        if (activeEng?.clearSelectionPreview) {
          activeEng.clearSelectionPreview();
        }
        showToast('Deselected (Ctrl+D)');
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
          className="sg-glass flex items-center gap-2 rounded-full border border-[#806f47]/50 bg-[#050b14]/95 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#cbb26a] shadow-2xl hover:bg-[#806f47]/20 cursor-pointer"
          title="Return to Editor (Ctrl+E)"
        >
          <Wrench className="h-4 w-4" />
          Stop Playtest
          <span className="font-medium normal-case tracking-normal text-slate-500">Ctrl+E</span>
        </button>
      </div>
    );
  }

  const factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'viewport') {
      return <div className="sg-viewport-container w-full h-full pointer-events-none" />;
    }
    return (
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-[#050b14]/80 p-4">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading panel...</span>
            </div>
          </div>
        }
      >
        {(() => {
          switch (component) {
            case 'build': return <WorldBuilderPanel />;
            case 'properties': return <PropertiesPanel />;
            case 'assets': return <AssetBrowserPanel />;
            case 'npc': return <EntityEditorPanel />;
            case 'dev': return <DevToolsPanel />;
            case 'characters': return <StarterHeroEditorPanel />;
            case 'creature': return <CreatureDefEditorPanel />;
            case 'classes': return <ClassEditorPanel />;
            case 'quest': return <QuestEditorPanel />;
            case 'dialogue': return <DialogueEditorPanel />;
            case 'loot': return <LootManagerPanel />;
            case 'items': return <ItemEditorPanel />;
            case 'spawner': return <MonsterSpawnerPanel />;
            case 'prefab': return <PrefabBuilderPanel />;
            case 'atlas': return <WorldAtlasPanel />;
            case 'problems': return <StudioProblemsPanel />;
            case 'streaming': return <StreamingInspectorPanel />;
            case 'gameplay': return <GameplayStudioPanels />;
            case 'settings': return <RealmSettingsPanel />;
            default: return <div>Unknown component: {component}</div>;
          }
        })()}
      </Suspense>
    );
  };

  const handleAction = (action: Action) => {
    return action;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col pt-9 pb-10">
      <StudioMenuBar
        onOpenMapBrowser={() => setMapBrowserOpen(true)}
        onOpenAssetBrowser={() => setStudioMode('assets')}
      />
      <PasteOptionsToolbar />
      <StudioFavoritesStrip />
      <StudioOmnisearch open={omnisearchOpen} onClose={() => setOmnisearchOpen(false)} />
      
      {/* Full-Screen Overlay Modals */}
      <FullScreenMapBrowser isOpen={mapBrowserOpen} onClose={() => setMapBrowserOpen(false)} />

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

      {/* FlexLayout Workspace Container — hidden when in Assets or Atlas mode */}
      <div className={`flex-1 relative pointer-events-none ${studioMode === 'assets' || studioMode === 'atlas' ? 'hidden' : ''}`}>
        <Layout 
          ref={layoutRef} 
          model={model} 
          factory={factory} 
          onAction={handleAction} 
        />
      </div>

      {/* Asset Management Mode — full workspace replacement */}
      {studioMode === 'assets' && (
        <AssetStudioSuite />
      )}

      {/* Atlas World Mode — full workspace replacement */}
      {studioMode === 'atlas' && (
        <AtlasStudioSuite />
      )}

      {/* Unified Bottom Studio Toolbar */}
      <StudioBottomToolbar
        layoutRef={layoutRef}
        model={model}
        onOpenMapBrowser={() => setStudioMode('atlas')}
        onOpenAssetBrowser={() => setStudioMode('assets')}
      />
    </div>
  );
};
