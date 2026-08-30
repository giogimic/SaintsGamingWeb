'use client';

import React, { useState, useEffect } from 'react';
import {
  UserRound,
  PawPrint,
  Map,
  Sword,
  Music,
  Shield,
  Upload,
  Scissors,
  Layers,
  Search,
  ImageIcon,
  RefreshCw,
  LayoutGrid,
  type LucideIcon,
  Film,
} from 'lucide-react';
import AssetEditor from './AssetEditor';
import SpriteBrowser from './SpriteBrowser';
import { AssetUploadView } from './AssetUploadView';
import { SpritesheetSlicer } from './SpritesheetSlicer';
import { EntityAssetWorkspace } from './EntityAssetWorkspace';
import { AnimationStudioPanel } from './panels/AnimationStudioPanel';
import { useGameStore } from '../store';
import type { GameAssetItem } from '@/engine/assets/AssetManager';
import type { AssetImportProfileId } from '@/shared/game/assetImportProfiles';

// ─── Sub-Studio identifiers ───────────────────────────────────────────────────
export type AssetWorkspaceId =
  | 'characters'
  | 'creatures'
  | 'animations'
  | 'tilesets'
  | 'items'
  | 'audio'
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
  'catalog',
];

// ─── Sub-tab type per workspace ───────────────────────────────────────────────
type SubTab = 'browse' | 'builder' | 'upload' | 'slicer' | 'sprites';

/**
 * AssetStudioSuite — the full-workspace Asset Management Mode view.
 * Renders instead of FlexLayout + Babylon viewport when `studioMode === 'assets'`.
 */
export function AssetStudioSuite() {
  const showToast = useGameStore((s) => s.showToast);
  const [activeWorkspace, setActiveWorkspace] = useState<AssetWorkspaceId>('catalog');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('browse');
  const [slicerSource, setSlicerSource] = useState<
    { id: string; filename: string; storagePath: string; width?: number; height?: number } | undefined
  >(undefined);

  // Derive initial filter for AssetEditor based on active workspace
  const getTypeFilter = (): string | undefined => {
    switch (activeWorkspace) {
      case 'characters':
        return 'CHARACTER';
      case 'creatures':
        return 'CREATURE';
      case 'tilesets':
        return 'TILESET';
      case 'items':
        return 'ITEM';
      case 'audio':
        return 'AUDIO';
      default:
        return undefined; // All for catalog
    }
  };

  const getTagFilters = (): string[] | undefined => {
    switch (activeWorkspace) {
      case 'characters':
        return ['character', 'npc', 'player'];
      case 'creatures':
        return ['creature', 'monster', 'pet'];
      case 'tilesets':
        return ['tileset', 'map', 'terrain'];
      case 'items':
        return ['item', 'icon', 'weapon', 'armor'];
      case 'audio':
        return ['audio', 'music', 'sfx'];
      default:
        return undefined;
    }
  };

  const getImportProfile = (): AssetImportProfileId | undefined => {
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

  const getDefaultGridSize = (): number => {
    switch (activeWorkspace) {
      case 'tilesets':
        return 16;
      case 'items':
        return 32;
      default:
        return 64;
    }
  };

  const getUploadAssetType = () => {
    switch (activeWorkspace) {
      case 'characters':
        return 'CHARACTER';
      case 'creatures':
        return 'CREATURE';
      case 'tilesets':
        return 'TILESET';
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
      case 'catalog':
        return [
          { id: 'browse', label: 'Full Catalog', icon: Layers },
          { id: 'sprites', label: 'Sprite Picker', icon: ImageIcon },
          { id: 'upload', label: 'Upload', icon: Upload },
          { id: 'slicer', label: 'Slicer', icon: Scissors },
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
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a tool to get started.
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex h-full pointer-events-auto select-none overflow-hidden pb-9">
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
                className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-black/20 border-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg border flex-shrink-0 mt-0.5 ${ws.color}`}
                >
                  <WsIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{ws.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {ws.blurb}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer / Quick Info */}
        <div className="p-3 border-t border-slate-800/60 bg-black/40">
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Active Suite:</span>
            <span className="font-mono text-amber-400 font-bold capitalize">
              {activeWorkspace}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#02050b]/90">
        {/* Sub-tab Navigation Bar */}
        <div className="px-6 py-2.5 border-b border-slate-800/60 bg-[#050b14]/90 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-black/60 border border-slate-800/80 p-1 rounded-xl">
            {subTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Workspace: <strong className="text-slate-300">{WORKSPACE_META[activeWorkspace]?.label}</strong>
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
