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
} from 'lucide-react';
import { useGameStore } from '../store';
import { canUseStudioDock } from '@/shared/game/studioPermissions';
import { STUDIO_MAP_CELLS_CHANGED_EVENT } from '@/shared/game/studioEvents';
import { StudioPaintHud } from './StudioPaintHud';
import { StudioMenuBar } from './StudioMenuBar';
import { StudioOmnisearch } from './StudioOmnisearch';
import { StudioFavoritesStrip } from './StudioFavoritesStrip';

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
import { StudioStatusBar } from './StudioStatusBar';

const MODE_BUTTONS: Array<{
  id: StudioMode;
  icon: React.ReactNode;
}> = [
  { id: 'develop', icon: <Wrench className="w-4 h-4" /> },
  { id: 'npc', icon: <Users className="w-4 h-4" /> },
  { id: 'quest', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'creature', icon: <PawPrint className="w-4 h-4" /> },
  { id: 'test', icon: <Footprints className="w-4 h-4" /> },
];

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
          { type: "tab", name: "World Builder", component: "build" }
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
            name: "Viewport",
            component: "viewport",
            enableClose: false,
            className: "sg-viewport-tab",
            // Applied to parent tabset when this is the sole stretched tab.
            tabsetClassName: "sg-viewport-tabset",
          }
        ]
      },
      {
        type: "tabset",
        weight: 20,
        id: "right-dock",
        children: [
          { type: "tab", name: "Properties", component: "properties" }
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
        { type: "tab", name: "Assets", component: "assets" },
        { type: "tab", name: "Dev Tools", component: "dev" }
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

  useEffect(() => {
    // Restore dock geometry, then enter Development Mode (tools on by default).
    useEditorStore.getState().hydratePanelLayouts();
    enterDevelopmentMode();
  }, [enterDevelopmentMode]);

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

      // Ctrl+Shift+P toggles Project Browser (stubbed for now)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        showToast('Project Browser panel');
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
        showToast('Save triggered');
        return;
      }

      // Ctrl+Shift+S Save All
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        showToast('Save All triggered');
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
          className="sg-glass flex items-center gap-2 rounded-full border border-[#806f47]/50 bg-[#050b14]/95 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#cbb26a] shadow-2xl hover:bg-[#806f47]/20"
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
    // If a user clicks a dock button, we can dispatch actions to FlexLayout
    return action;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col pt-8">
      <StudioMenuBar />
      <StudioFavoritesStrip />
      <StudioOmnisearch open={omnisearchOpen} onClose={() => setOmnisearchOpen(false)} />
      <StudioStatusBar />
      <StudioPaintHud />

      {/* FlexLayout Container */}
      <div className="flex-1 relative pointer-events-none">
        <Layout 
          ref={layoutRef} 
          model={model} 
          factory={factory} 
          onAction={handleAction} 
        />
      </div>

      {/* Legacy Mode strip + dock - keep for quick launching panels into flexlayout */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2 max-w-[95vw]">
        <div className="sg-glass bg-[#050b14]/90 border border-[#806f47]/40 rounded-full px-3 py-2 flex items-center gap-1.5 sm:gap-2 shadow-2xl overflow-x-auto max-w-full">
          <DockButton id="build" layoutRef={layoutRef} model={model} icon={<Hammer className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="atlas" layoutRef={layoutRef} model={model} icon={<Globe className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="properties" layoutRef={layoutRef} model={model} icon={<Settings2 className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="prefab" layoutRef={layoutRef} model={model} icon={<Package className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="assets" layoutRef={layoutRef} model={model} icon={<ImageIcon className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="npc" layoutRef={layoutRef} model={model} icon={<Users className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="quest" layoutRef={layoutRef} model={model} icon={<ScrollText className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="dialogue" layoutRef={layoutRef} model={model} icon={<MessageSquare className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <div className="w-px h-6 bg-[#806f47]/30 mx-0.5 shrink-0" />
          {canDev && (
            <DockButton id="dev" layoutRef={layoutRef} model={model} icon={<TerminalSquare className="w-5 h-5" />} permissionLevel={permissionLevel} />
          )}
          <DockButton id="characters" layoutRef={layoutRef} model={model} icon={<Sword className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="creature" layoutRef={layoutRef} model={model} icon={<PawPrint className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="loot" layoutRef={layoutRef} model={model} icon={<Coins className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="items" layoutRef={layoutRef} model={model} icon={<Package className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="classes" layoutRef={layoutRef} model={model} icon={<UserCheck className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <div className="w-px h-6 bg-[#806f47]/30 mx-0.5 shrink-0" />
          <button
            type="button"
            onClick={() => {
              useGameStore.getState().setGameMode('CHARACTER_SELECT');
              showToast('Load a character for Playtest');
            }}
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-w-[64px]"
            title="Load a game character (optional)"
          >
            <UserRound className="w-4 h-4" />
            <span className="font-bold text-[9px] uppercase font-mono tracking-wider">Hero</span>
          </button>
          <button
            type="button"
            onClick={() => {
              useEditorStore.getState().enterPlaytest();
              showToast('Playtest — gameplay systems on');
            }}
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors min-w-[64px]"
            title={STUDIO_MODE_META.test.blurb}
          >
            <Play className="w-4 h-4" />
            <span className="font-bold text-[9px] uppercase font-mono tracking-wider">Play</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DockButton: React.FC<{
  id: PanelId;
  icon: React.ReactNode;
  permissionLevel: number;
  layoutRef: React.RefObject<any>;
  model: Model;
}> = ({ id, icon, permissionLevel, layoutRef, model }) => {
  const showToast = useGameStore((state) => state.showToast);
  const meta = STUDIO_DOCK_META[id];

  if (!canUseStudioDock(permissionLevel, id)) return null;

  return (
    <button
      type="button"
      title={`${meta.label} — ${meta.blurb}`}
      onClick={() => {
        if (!layoutRef.current) return;
        
        // Check if tab already exists
        const nodes = model.getNodeById(id);
        if (nodes) {
          model.doAction(Actions.selectTab(id));
        } else {
          // Add tab to the left dock by default
          model.doAction(Actions.addNode({
            type: "tab",
            id: id,
            name: meta.label,
            component: id,
          }, "left-dock", DockLocation.CENTER, -1));
        }
      }}
      className={`
        flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[56px] text-slate-400 hover:text-white hover:bg-white/5
      `}
    >
      {icon}
      <span className="font-bold text-[9px] uppercase font-mono tracking-wider">{meta.label}</span>
    </button>
  );
};
