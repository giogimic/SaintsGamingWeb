'use client';

import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { useGameStore } from '../store';
import { canUseStudioDock } from '@/shared/game/studioPermissions';
import { STUDIO_MAP_CELLS_CHANGED_EVENT, STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { StudioMenuBar } from './StudioMenuBar';
import { StudioOmnisearch } from './StudioOmnisearch';
import { StudioFavoritesStrip } from './StudioFavoritesStrip';
import { StudioBottomToolbar } from './StudioBottomToolbar';
import { FullScreenMapBrowser } from './FullScreenMapBrowser';
import { FullScreenAssetBrowser } from './FullScreenAssetBrowser';
import { StudioContextMenu } from './StudioContextMenu';

import { WorldBuilderPanel } from './panels/WorldBuilderPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { AssetBrowserPanel } from './panels/AssetBrowserPanel';
import { EntityEditorPanel } from './panels/EntityEditorPanel';
import { DevToolsPanel } from './panels/DevToolsPanel';
import { StarterHeroEditorPanel } from './panels/StarterHeroEditorPanel';
import { CreatureDefEditorPanel } from './panels/CreatureDefEditorPanel';
import { ClassEditorPanel } from './panels/ClassEditorPanel';
import { QuestEditorPanel } from './panels/QuestEditorPanel';
import { DialogueEditorPanel } from './panels/DialogueEditorPanel';
import { LootManagerPanel } from './panels/LootManagerPanel';
import { ItemEditorPanel } from './panels/ItemEditorPanel';
import { MonsterSpawnerPanel } from './panels/MonsterSpawnerPanel';
import { PrefabBuilderPanel } from './panels/PrefabBuilderPanel';
import { WorldAtlasPanel } from './panels/WorldAtlasPanel';
import { StudioProblemsPanel } from './panels/StudioProblemsPanel';

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
        { type: "tab", id: "assets", name: "Assets", component: "assets" },
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
  const [assetBrowserOpen, setAssetBrowserOpen] = useState(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Ctrl+E toggles Editor ↔ Playtest
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const mode = useGameStore.getState().gameMode;
        if (mode !== 'EXPLORING' && mode !== 'BATTLE') return;
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

      // Ctrl+Shift+M or Ctrl+Shift+P opens Full-Screen World Atlas / Map Browser
      if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setMapBrowserOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+A opens Full-Screen Asset Browser
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAssetBrowserOpen((prev) => !prev);
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
      case 'viewport': return <div className="sg-viewport-container w-full h-full pointer-events-none" />;
      default: return <div>Unknown component: {component}</div>;
    }
  };

  const handleAction = (action: Action) => {
    return action;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col pt-9 pb-10">
      <StudioMenuBar
        onOpenMapBrowser={() => setMapBrowserOpen(true)}
        onOpenAssetBrowser={() => setAssetBrowserOpen(true)}
      />
      <StudioFavoritesStrip />
      <StudioOmnisearch open={omnisearchOpen} onClose={() => setOmnisearchOpen(false)} />
      
      {/* Full-Screen Overlay Modals */}
      <FullScreenMapBrowser isOpen={mapBrowserOpen} onClose={() => setMapBrowserOpen(false)} />
      <FullScreenAssetBrowser isOpen={assetBrowserOpen} onClose={() => setAssetBrowserOpen(false)} />

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

      {/* FlexLayout Workspace Container */}
      <div className="flex-1 relative pointer-events-none">
        <Layout 
          ref={layoutRef} 
          model={model} 
          factory={factory} 
          onAction={handleAction} 
        />
      </div>

      {/* Unified Bottom Studio Toolbar */}
      <StudioBottomToolbar
        layoutRef={layoutRef}
        model={model}
        onOpenMapBrowser={() => setMapBrowserOpen(true)}
        onOpenAssetBrowser={() => setAssetBrowserOpen(true)}
      />
    </div>
  );
};
