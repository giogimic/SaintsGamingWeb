'use client';

import React, { useState, useEffect } from 'react';
import {
  UserRound,
  PawPrint,
  Map,
  Sword,
  Music,
  Package,
  Shield,
  Upload,
  Scissors,
  Layers,
  Search,
  ImageIcon,
  RefreshCw,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import AssetEditor from './AssetEditor';
import SpriteBrowser from './SpriteBrowser';
import { AssetUploadView } from './AssetUploadView';
import { SpritesheetSlicer } from './SpritesheetSlicer';
import { EntityAssetWorkspace } from './EntityAssetWorkspace';
import AssetPackInstaller from './AssetPackInstaller';
import { AnimationStudioPanel } from './panels/AnimationStudioPanel';
import { useGameStore } from '../store';
import type { GameAssetItem } from '@/engine/assets/AssetManager';
import { Film } from 'lucide-react';

// ─── Sub-Studio identifiers ───────────────────────────────────────────────────
export type AssetWorkspaceId =
  | 'characters'
  | 'creatures'
  | 'animations'
  | 'tilesets'
  | 'items'
  | 'audio'
  | 'packs'
  | 'catalog';

// ─── Sub-Studio metadata ──────────────────────────────────────────────────────
const WORKSPACE_META: Record<
  AssetWorkspaceId,
  { label: string; icon: LucideIcon; blurb: string; color: string }
> = {
  characters: {
    label: 'Characters & Sprites',
    icon: UserRound,
    blurb: 'Player avatars, NPCs, modular equipment layers, and character generators.',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
  },
  creatures: {
    label: 'Creatures & Monsters',
    icon: PawPrint,
    blurb: 'Battle sheets, overworld sprites, shiny variants, and boss encounters.',
    color: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  },
  animations: {
    label: 'Animation Studio',
    icon: Film,
    blurb: 'Frame sequence timelines, sprite playback, onion skinning, and loop timing.',
    color: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
  },
  tilesets: {
    label: 'Tilesets & World Art',
    icon: Map,
    blurb: 'Map terrain, autotiles, environment props, buildings, and decorations.',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  items: {
    label: 'Items & UI Icons',
    icon: Sword,
    blurb: 'Inventory icons, weapons, armor, consumables, and UI badges.',
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  audio: {
    label: 'Audio & SFX',
    icon: Music,
    blurb: 'Background music, ambient soundscapes, combat SFX, and voice emotes.',
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
  packs: {
    label: 'Packs & Bundles',
    icon: Package,
    blurb: 'Pre-packaged asset packs, community expansions, and modular add-ons.',
    color: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  },
  catalog: {
    label: 'Master Catalog',
    icon: Shield,
    blurb: 'Universal search, batch tagging, moderation queue, and full asset repository.',
    color: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  },
};

const WORKSPACE_ORDER: AssetWorkspaceId[] = [
  'characters',
  'creatures',
  'animations',
  'tilesets',
  'items',
  'audio',
  'packs',
  'catalog',
];

// ─── Sub-tab type per workspace ───────────────────────────────────────────────
type SubTab = 'browse' | 'builder' | 'upload' | 'slicer' | 'packs' | 'sprites';

/**
 * AssetStudioSuite — the full-workspace Asset Management Mode view.
 * Renders instead of FlexLayout + Babylon viewport when `studioMode === 'assets'`.
 */
export function AssetStudioSuite() {
  const showToast = useGameStore((s) => s.showToast);
  const [activeWorkspace, setActiveWorkspace] = useState<AssetWorkspaceId>('catalog');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('browse');
  const [slicerSource, setSlicerSource] = useState<
    { id: string; filename: string; storagePath: string } | undefined
  >(undefined);

  // Listen for cross-component asset refresh events
  useEffect(() => {
    const onRefresh = () => showToast('Asset catalog refreshed.');
    window.addEventListener('assets:refreshed', onRefresh);
    return () => window.removeEventListener('assets:refreshed', onRefresh);
  }, [showToast]);

  const meta = WORKSPACE_META[activeWorkspace];
  const Icon = meta.icon;

  // ── Type filter mapping per workspace ──
  const getTypeFilter = (): string | undefined => {
    switch (activeWorkspace) {
      case 'characters':
        return 'CHARACTER';
      case 'creatures':
        return 'CREATURE';
      case 'tilesets':
        return 'TILE';
      case 'items':
        return 'OBJECT';
      case 'audio':
        return 'AUDIO';
      default:
        return undefined;
    }
  };

  // ── Tag filter mapping per workspace ──
  const getTagFilters = (): string[] => {
    switch (activeWorkspace) {
      case 'characters':
        return [];
      case 'creatures':
        return [];
      default:
        return [];
    }
  };

  // ── Import Profile mapping per workspace ──
  const getImportProfile = (): any => {
    switch (activeWorkspace) {
      case 'characters':
        return 'character';
      case 'creatures':
        return 'creature';
      case 'tilesets':
        return 'tile';
      case 'items':
        return 'item';
      default:
        return undefined;
    }
  };

  // ── Default Grid Size mapping per workspace ──
  const getDefaultGridSize = (): number => {
    switch (activeWorkspace) {
      case 'tilesets':
      case 'items':
        return 32;
      default:
        return 64;
    }
  };

  // ── Upload Asset Type mapping per workspace ──
  const getUploadAssetType = (): string => {
    switch (activeWorkspace) {
      case 'characters':
        return 'CHARACTER';
      case 'creatures':
        return 'CREATURE';
      case 'tilesets':
        return 'TILE';
      case 'items':
        return 'ITEM';
      case 'audio':
        return 'AUDIO';
      default:
        return 'OBJECT';
    }
  };

  // ── Sub-tabs per workspace ──
  const getSubTabs = (): { id: SubTab; label: string; icon: LucideIcon }[] => {
    switch (activeWorkspace) {
      case 'characters':
        return [
          { id: 'browse', label: 'Browse Characters', icon: Layers },
          { id: 'builder', label: 'Slot Builder', icon: LayoutGrid },
          { id: 'upload', label: 'Upload Character', icon: Upload },
          { id: 'slicer', label: 'Sprite Slicer', icon: Scissors },
        ];
      case 'creatures':
        return [
          { id: 'browse', label: 'Browse Creatures', icon: Layers },
          { id: 'builder', label: 'Slot Builder', icon: LayoutGrid },
          { id: 'upload', label: 'Upload Creature', icon: Upload },
          { id: 'slicer', label: 'Sprite Slicer', icon: Scissors },
        ];
      case 'animations':
        return [
          { id: 'browse', label: 'Animation Studio', icon: Film },
          { id: 'slicer', label: 'Sprite Slicer', icon: Scissors },
        ];
      case 'tilesets':
        return [
          { id: 'browse', label: 'Browse Tilesets', icon: Layers },
          { id: 'upload', label: 'Upload Tiles', icon: Upload },
          { id: 'slicer', label: 'Grid Slicer', icon: Scissors },
        ];
      case 'items':
        return [
          { id: 'browse', label: 'Browse Items', icon: Layers },
          { id: 'upload', label: 'Upload Icons', icon: Upload },
          { id: 'slicer', label: 'Icon Grid Slicer', icon: Scissors },
        ];
      case 'audio':
        return [
          { id: 'browse', label: 'Browse Audio', icon: Layers },
          { id: 'upload', label: 'Upload Audio', icon: Upload },
        ];
      case 'packs':
        return [{ id: 'packs', label: 'Asset Packs', icon: Package }];
      case 'catalog':
        return [
          { id: 'browse', label: 'Full Catalog', icon: Layers },
          { id: 'sprites', label: 'Sprite Picker', icon: ImageIcon },
          { id: 'upload', label: 'Upload', icon: Upload },
          { id: 'slicer', label: 'Slicer', icon: Scissors },
          { id: 'packs', label: 'Packs', icon: Package },
        ];
      default:
        return [{ id: 'browse', label: 'Browse', icon: Layers }];
    }
  };

  const subTabs = getSubTabs();

  // Reset sub-tab when workspace changes
  useEffect(() => {
    const tabs = getSubTabs();
    setActiveSubTab(tabs[0]?.id || 'browse');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  // ── Render active sub-tab content ──
  const renderContent = () => {
    switch (activeSubTab) {
      case 'builder':
        if (activeWorkspace === 'characters') {
          return <EntityAssetWorkspace entityType="CHARACTER" profileId="character" />;
        }
        if (activeWorkspace === 'creatures') {
          return <EntityAssetWorkspace entityType="CREATURE" profileId="creature" />;
        }
        return null;
      case 'browse':
        if (activeWorkspace === 'animations') {
          return <AnimationStudioPanel />;
        }
        return (
          <AssetEditor
            workspaceId={activeWorkspace}
            initialTypeFilter={getTypeFilter() || 'ALL'}
            onOpenSlicer={(asset) => {
              setSlicerSource(asset);
              setActiveSubTab('slicer');
            }}
          />
        );
      case 'sprites':
        return (
          <SpriteBrowser
            filterType={getTypeFilter()}
            filterTags={getTagFilters()}
            onSelect={() => {}}
          />
        );
      case 'upload':
        return (
          <AssetUploadView
            initialAssetType={getUploadAssetType()}
            initialImportProfile={getImportProfile()}
            onOpenSlicer={(asset) => {
              setSlicerSource(asset);
              setActiveSubTab('slicer');
            }}
          />
        );
      case 'slicer':
        return (
          <SpritesheetSlicer
            sourceAsset={slicerSource}
            defaultImportProfile={getImportProfile()}
            defaultGridSize={getDefaultGridSize()}
          />
        );
      case 'packs':
        return <AssetPackInstaller />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a tool to get started.
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex h-full pointer-events-auto select-none overflow-hidden">
      {/* ─── Left Sidebar: Workspace Navigation ─── */}
      <div className="w-56 flex-shrink-0 flex flex-col bg-[#030810]/95 border-r border-slate-800/60 overflow-y-auto">
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[11px] font-black tracking-wider text-amber-400 uppercase">
                Asset Studio
              </h2>
              <p className="text-[9px] text-slate-500">Manage all game assets</p>
            </div>
          </div>
        </div>

        {/* Workspace List */}
        <div className="flex-1 py-2 px-2 space-y-1">
          {WORKSPACE_ORDER.map((id) => {
            const ws = WORKSPACE_META[id];
            const WsIcon = ws.icon;
            const isActive = activeWorkspace === id;

            return (
              <button
                key={id}
                onClick={() => setActiveWorkspace(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer group ${
                  isActive
                    ? `${ws.color} border shadow-lg`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <WsIcon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? '' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <div className="min-w-0">
                  <div
                    className={`text-[11px] font-bold truncate ${
                      isActive ? '' : 'group-hover:text-slate-200'
                    }`}
                  >
                    {ws.label}
                  </div>
                  {isActive && (
                    <div className="text-[9px] text-inherit opacity-70 mt-0.5 line-clamp-2">
                      {ws.blurb}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="px-3 py-2 border-t border-slate-800/60">
          <div className="text-[9px] text-slate-600 text-center">
            Ctrl+Shift+A · Asset Studio
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050b14]/90">
        {/* Workspace Header + Sub-Tabs */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-[#050b14]/80">
          {/* Active Workspace Title */}
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${meta.color.split(' ')[0]}`} />
            <h1 className={`text-sm font-black tracking-wider uppercase ${meta.color.split(' ')[0]}`}>
              {meta.label}
            </h1>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex items-center bg-black/60 border border-slate-700/50 p-0.5 rounded-lg gap-0.5">
            {subTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
