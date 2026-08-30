'use client';

import React, { useMemo } from 'react';
import { useGameStore } from './store';
import { ITEM_DB } from './data/items';
import { calculatePlayerCombatStats } from './combat';
import { soundSynth } from '@/engine/sound-synth';
import {
  Shield,
  Sword,
  Sparkles,
  Zap,
  Crosshair,
  Crown,
  Shirt,
  Footprints,
  ShieldAlert,
  CircleDot,
  Flame,
  Scale,
  Sparkle
} from 'lucide-react';

export default function EquipmentOverlay() {
  const equipment = useGameStore((state) => state.player.equipment) || {};
  const level = useGameStore((state) => state.player.level || 1);
  const activeDaemonId = useGameStore((state) => state.player.activeDaemonId);
  const equipItem = useGameStore((state) => state.equipItem);
  const showToast = useGameStore((state) => state.showToast);

  const stats = useMemo(
    () => calculatePlayerCombatStats({ level, activeDaemonId, equipment } as any),
    [level, activeDaemonId, equipment]
  );

  // Determine speed tier rating and styling
  const speedTier = (stats as any).speedTier || 'NORMAL';
  const speedMultiplier = speedTier === 'FAST' ? '1.25x' : speedTier === 'SLOW' ? '0.85x' : '1.00x';
  const speedBadgeStyle =
    speedTier === 'FAST'
      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
      : speedTier === 'SLOW'
      ? 'border-amber-500/50 bg-amber-950/60 text-amber-300'
      : 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300';

  const handleUnequip = (slot: string) => {
    const currentId = (equipment as Record<string, string | null | undefined>)[slot];
    if (currentId) {
      soundSynth?.playSelectSound?.();
      const itemName = ITEM_DB[currentId]?.name || 'Item';
      showToast(`Unequipped ${itemName}`);
      equipItem(slot as any, null);
    }
  };

  const renderSlot = (
    slot: string,
    label: string,
    Icon: React.ComponentType<any>,
    subLabel?: string
  ) => {
    const itemId = (equipment as Record<string, string | null | undefined>)[slot];
    const item = itemId ? ITEM_DB[itemId] : null;

    return (
      <div
        className={`relative p-2.5 flex flex-col items-center justify-between min-h-[92px] transition-all duration-200 cursor-pointer group select-none ${
          item
            ? 'border border-cyan-400/80 bg-gradient-to-b from-cyan-950/40 to-black/80 shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:border-cyan-300'
            : 'border border-slate-800 bg-black/40 hover:border-cyan-500/40 hover:bg-black/60'
        }`}
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
        }}
        onClick={() => handleUnequip(slot)}
      >
        <span className="w-full text-left text-[8px] text-cyan-300 font-mono font-bold tracking-widest uppercase truncate">
          {label}
        </span>

        {item ? (
          <div className="flex flex-col items-center text-center my-auto w-full px-1">
            <span className="text-emerald-300 font-mono text-[11px] font-bold leading-tight drop-shadow-sm truncate max-w-full">
              {item.name}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
              {item.stats?.atk && (
                <span className="text-[8px] text-rose-400 font-mono font-bold bg-rose-950/70 px-1 py-0.5 rounded border border-rose-500/40">
                  +{item.stats.atk} ATK
                </span>
              )}
              {item.stats?.def && (
                <span className="text-[8px] text-sky-400 font-mono font-bold bg-sky-950/70 px-1 py-0.5 rounded border border-sky-500/40">
                  +{item.stats.def} DEF
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-cyan-500/60 transition-colors my-auto">
            <Icon className="w-5 h-5 mb-0.5" strokeWidth={1.5} />
            <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500">
              {subLabel || 'Empty'}
            </span>
          </div>
        )}

        {item && (
          <div className="absolute hidden group-hover:flex flex-col -top-12 left-1/2 -translate-x-1/2 bg-black/95 border border-rose-500/60 text-rose-200 px-2.5 py-1 rounded text-[9px] font-mono z-30 pointer-events-none whitespace-nowrap shadow-2xl">
            <span className="text-white font-bold">{item.name}</span>
            <span className="text-rose-400 font-bold text-[8px]">[CLICK TO UNEQUIP]</span>
          </div>
        )}
      </div>
    );
  };

  // Calculate total gear score
  const gearScore = Object.values(equipment).reduce((acc, id) => {
    if (!id || !ITEM_DB[id]) return acc;
    const it = ITEM_DB[id];
    return acc + (it.stats?.atk || 0) * 2 + (it.stats?.def || 0) * 2 + 10;
  }, 0);

  return (
    <div className="flex h-full w-full flex-col p-3 animate-in fade-in font-mono text-xs select-none space-y-3">
      {/* Total Combat Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-black/60 border border-rose-500/40 rounded-xl p-2.5 text-center shadow-[0_0_10px_rgba(244,63,94,0.15)] flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
            <Sword className="w-3 h-3 text-rose-400" /> ATK POWER
          </span>
          <span className="text-xl font-black text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] my-0.5">
            {stats.atk}
          </span>
          <span className="text-[8px] text-rose-300/70 font-semibold">Damage Scaling</span>
        </div>

        <div className="bg-black/60 border border-sky-500/40 rounded-xl p-2.5 text-center shadow-[0_0_10px_rgba(56,189,248,0.15)] flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-sky-400" /> DEF RATING
          </span>
          <span className="text-xl font-black text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] my-0.5">
            {stats.def}
          </span>
          <span className="text-[8px] text-sky-300/70 font-semibold">Armor Mitigation</span>
        </div>

        <div className="bg-black/60 border border-amber-500/40 rounded-xl p-2.5 text-center shadow-[0_0_10px_rgba(245,158,11,0.15)] flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
            <Crosshair className="w-3 h-3 text-amber-400" /> CRIT CHANCE
          </span>
          <span className="text-xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] my-0.5">
            12%
          </span>
          <span className="text-[8px] text-amber-300/70 font-semibold">Crit Multiplier 1.5x</span>
        </div>

        <div className="bg-black/60 border border-emerald-500/40 rounded-xl p-2.5 text-center shadow-[0_0_10px_rgba(16,185,129,0.15)] flex flex-col justify-between">
          <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" /> SPEED TIER
          </span>
          <div className="my-0.5 flex items-center justify-center">
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-black uppercase tracking-wide flex items-center gap-1 ${speedBadgeStyle}`}>
              <Footprints className="w-3 h-3" /> {speedTier} ({speedMultiplier})
            </span>
          </div>
          <span className="text-[8px] text-emerald-300/70 font-semibold">Move & Atk Cadence</span>
        </div>
      </div>

      {/* Equipment Paperdoll Layout */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-black/40 border border-slate-800/80 rounded-xl p-3">
        <div className="flex items-center justify-between w-full max-w-md pb-2 border-b border-slate-800 mb-2.5 text-[10px]">
          <span className="text-slate-400 font-bold uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Gear Power: <span className="text-cyan-300 font-mono font-black">{gearScore}</span>
          </span>
          <span className="text-slate-500 text-[9px]">Click slot to unequip</span>
        </div>

        {/* 3-Column MMO Paperdoll */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-md">
          {/* Left Column (Accessories & Head) */}
          <div className="space-y-2">
            {renderSlot('head', 'HELMET', Crown)}
            {renderSlot('amulet', 'AMULET', Sparkle, 'Accessory')}
            {renderSlot('gloves', 'GAUNTLETS', Shield, 'Hands')}
            {renderSlot('ring', 'RING', CircleDot, 'Finger')}
          </div>

          {/* Center Column (Core Armor & Back) */}
          <div className="space-y-2">
            {renderSlot('cape', 'CLOAK', Shirt, 'Back')}
            {renderSlot('chest', 'CHEST ARMOR', Shirt)}
            {renderSlot('legs', 'GREAVES', Footprints)}
            {renderSlot('boots', 'BOOTS', Footprints, 'Feet')}
          </div>

          {/* Right Column (Weapons & Off-Hand) */}
          <div className="space-y-2">
            {renderSlot('weapon', 'MAIN WEAPON', Sword)}
            {renderSlot('offhand', 'OFF-HAND', ShieldAlert, 'Shield / Focus')}
            <div
              className="p-2.5 flex flex-col items-center justify-center min-h-[92px] border border-slate-800/50 bg-black/20 text-slate-600 rounded"
              style={{
                clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
              }}
            >
              <Scale className="w-4 h-4 mb-1 text-slate-700" />
              <span className="text-[8px] uppercase tracking-wider text-slate-600">Weight Load</span>
              <span className="text-[9px] text-emerald-400/80 font-bold mt-0.5">Light (4.2 kg)</span>
            </div>
            <div
              className="p-2.5 flex flex-col items-center justify-center min-h-[92px] border border-slate-800/50 bg-black/20 text-slate-600 rounded"
              style={{
                clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
              }}
            >
              <Flame className="w-4 h-4 mb-1 text-amber-600/70" />
              <span className="text-[8px] uppercase tracking-wider text-slate-600">Set Bonus</span>
              <span className="text-[9px] text-slate-400 font-bold mt-0.5">None (0/4)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
