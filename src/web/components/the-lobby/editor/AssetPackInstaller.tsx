'use client';

import React, { useState } from 'react';
import {
  Package,
  CheckCircle2,
  RefreshCw,
  Download,
  Layers,
  Sparkles,
  PawPrint,
  Users,
  Sword,
  Box,
  Monitor,
  Check,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from '../store';

export interface AssetPackCard {
  id: string;
  name: string;
  description: string;
  category: string;
  relativeDir: string;
  estimatedCount: number;
  badge?: string;
  recommended?: boolean;
}

export const PACK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tilesets: Layers,
  creatures: PawPrint,
  portraits: Sparkles,
  npc: Users,
  heroes: Sword,
  items: Box,
  objects: Box,
  ui: Monitor,
};

export const PACK_PREVIEWS: Record<string, string[]> = {
  tilesets: [
    '/game-assets/tilesets/summer_grass.png',
    '/game-assets/tilesets/dirt_path.png',
    '/game-assets/tilesets/water_animated.png',
  ],
  creatures: [
    '/game-assets/monster/battle/agnite-sheet.png',
    '/game-assets/monster/battle/rockodile-sheet.png',
    '/game-assets/monster/battle/budbad-sheet.png',
  ],
  npc: [
    '/game-assets/npc/civilian_01.png',
    '/game-assets/npc/guard_01.png',
    '/game-assets/npc/shopkeeper_01.png',
  ],
  heroes: [
    '/game-assets/monster/player/warrior_m.png',
    '/game-assets/monster/player/mage_f.png',
  ],
  items: [
    '/game-assets/items/potion.png',
    '/game-assets/items/sword.png',
  ],
};

const DEFAULT_PACKS: AssetPackCard[] = [
  {
    id: 'tilesets',
    name: 'Core Tilesets',
    description: 'Terrain, buildings, indoor, and outdoor tilemaps for Studio world painting.',
    category: 'environment',
    relativeDir: 'tilesets',
    estimatedCount: 79,
    badge: 'Essential',
    recommended: true,
  },
  {
    id: 'creatures',
    name: 'Creature Battle Sheets',
    description: 'Creature & monster battle spritesheets.',
    category: 'monster',
    relativeDir: 'monster/battle',
    estimatedCount: 413,
    badge: 'Creatures',
    recommended: true,
  },
  {
    id: 'npc',
    name: 'NPC Walk Cycles',
    description: 'Citizen, guard, and vendor walk animations.',
    category: 'character',
    relativeDir: 'npc',
    estimatedCount: 221,
    badge: 'Characters',
    recommended: true,
  },
  {
    id: 'heroes',
    name: 'Hero / Operative Walk Cycles',
    description: 'Player class character sprites and walk animations.',
    category: 'character',
    relativeDir: 'monster/player',
    estimatedCount: 357,
  },
  {
    id: 'items',
    name: 'Item & Inventory Icons',
    description: 'Potions, food, equipment, badges, and resource inventory icons.',
    category: 'item',
    relativeDir: 'items',
    estimatedCount: 177,
  },
  {
    id: 'objects',
    name: 'Props & World Objects',
    description: 'Chests, signs, interactive boulders, and environmental props.',
    category: 'object',
    relativeDir: 'objects',
    estimatedCount: 24,
  },
  {
    id: 'ui',
    name: 'Interface & Combat UI',
    description: 'HUD icons, health bars, and dialogue frames.',
    category: 'ui',
    relativeDir: 'ui',
    estimatedCount: 50,
  },
];

interface AssetPackInstallerProps {
  onInstalled?: () => void;
}

export default function AssetPackInstaller({ onInstalled }: AssetPackInstallerProps) {
  const showToast = useGameStore((s) => s.showToast);
  const [installingPack, setInstallingPack] = useState<string | null>(null);
  const [installedPacks, setInstalledPacks] = useState<Set<string>>(new Set());
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  const handleInstall = async (packId: string) => {
    soundSynth?.playActionSound?.();
    setInstallingPack(packId);
    setInstallStatus(`Installing ${packId === 'all' ? 'all packs' : packId}...`);

    try {
      const res = await fetch('/api/assets/install-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: packId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Installation failed');
      }

      soundSynth?.playLevelUpSound?.();
      showToast?.(`Installed ${data.installed} assets (${data.skipped} already in DB)`);
      setInstallStatus(`Done: +${data.installed} installed, ${data.skipped} existing`);

      if (packId === 'all') {
        setInstalledPacks(new Set(DEFAULT_PACKS.map((p) => p.id)));
      } else {
        setInstalledPacks((prev) => new Set([...prev, packId]));
      }

      onInstalled?.();
    } catch (err: any) {
      console.error('Install pack error:', err);
      showToast?.(err.message || 'Failed to install pack');
      setInstallStatus(`Error: ${err.message}`);
    } finally {
      setInstallingPack(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-100 font-mono p-4 overflow-y-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 bg-[#0b1320] border border-amber-500/30 rounded-2xl mb-4 gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            Bundled Asset Pack Library
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Install and register curated sprites, tilesets, and icons from the local game assets repository into the Studio catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {installStatus && (
            <span className="text-xs text-amber-400 bg-black/60 px-3 py-1.5 rounded-xl border border-amber-500/20">
              {installStatus}
            </span>
          )}
          <button
            disabled={installingPack !== null}
            onClick={() => void handleInstall('all')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {installingPack === 'all' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Install All Packs (~1,300+ Assets)
          </button>
        </div>
      </div>

      {/* Grid of Packs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEFAULT_PACKS.map((pack) => {
          const IconComp = PACK_ICONS[pack.id] || Box;
          const isBusy = installingPack === pack.id || installingPack === 'all';
          const isDone = installedPacks.has(pack.id);
          const previews = PACK_PREVIEWS[pack.id] || [];

          return (
            <div
              key={pack.id}
              className={`flex flex-col justify-between p-3.5 bg-[#0b1320] border rounded-xl transition-all ${
                pack.recommended
                  ? 'border-amber-500/40 shadow-amber-950/20 shadow-md'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200">{pack.name}</h3>
                      <span className="text-[10px] text-slate-500">{pack.category} • ~{pack.estimatedCount} assets</span>
                    </div>
                  </div>

                  {pack.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-500/30 font-bold">
                      {pack.badge}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {pack.description}
                </p>

                {/* Thumbnail Preview Strip */}
                {previews.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3 bg-black/40 p-1.5 rounded-lg border border-slate-800/80 overflow-hidden">
                    {previews.map((src, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center p-0.5 shrink-0 overflow-hidden"
                      >
                        <img
                          src={src}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                          style={{ imageRendering: 'pixelated' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                    <span className="text-[9px] text-slate-500 ml-1">+{pack.estimatedCount - previews.length} more</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                disabled={isBusy}
                onClick={() => void handleInstall(pack.id)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDone
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-purple-950/50 border border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:text-white'
                } disabled:opacity-50`}
              >
                {isBusy ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Installing...
                  </>
                ) : isDone ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Re-sync Pack
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" /> Install Pack
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
