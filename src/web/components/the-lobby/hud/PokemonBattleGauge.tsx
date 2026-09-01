'use client';

import React from 'react';
import { Heart, Zap, Sparkles, Shield, Swords } from 'lucide-react';
import { getHudTheme } from './hud-themes';

interface PokemonBattleGaugeProps {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xpIntoLevel: number;
  xpSpan: number;
  xpProgress: number;
  perk?: string | null;
  combatStyle?: string;
  themeId?: string;
  className?: string;
}

/**
 * Pokemon-Style Dynamic Battle Vitality Gauge
 * Features:
 * - Tri-color status HP gauge (>50% Green, 20-50% Yellow, <=20% Red Critical)
 * - Distinctive "HP" & "PP" status badges
 * - Tabular numerical readout
 * - Smooth EXP progress bar
 */
export const PokemonBattleGauge: React.FC<PokemonBattleGaugeProps> = ({
  name,
  level,
  hp,
  maxHp,
  mp,
  maxMp,
  xpIntoLevel,
  xpSpan,
  xpProgress,
  perk,
  combatStyle = 'WARRIOR',
  themeId,
  className = '',
}) => {
  const theme = getHudTheme(themeId);

  const safeMaxHp = Math.max(1, maxHp);
  const safeHp = Math.max(0, Math.min(safeMaxHp, hp));
  const hpPercent = Math.min(100, Math.max(0, Math.floor((safeHp / safeMaxHp) * 100)));

  const safeMaxMp = Math.max(1, maxMp);
  const safeMp = Math.max(0, Math.min(safeMaxMp, mp));
  const mpPercent = Math.min(100, Math.max(0, Math.floor((safeMp / safeMaxMp) * 100)));

  // Dynamic Pokémon Tri-Color HP Thresholds
  let hpColorClass = 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
  let hpBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  let hpTextClass = 'text-emerald-400';

  if (hpPercent <= 20) {
    hpColorClass = 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse';
    hpBadgeClass = 'bg-rose-500/25 text-rose-300 border-rose-500/50';
    hpTextClass = 'text-rose-400 animate-pulse';
  } else if (hpPercent <= 50) {
    hpColorClass = 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    hpBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    hpTextClass = 'text-amber-400';
  }

  const isCritical = hpPercent <= 20;

  return (
    <div className={`flex flex-col gap-2 w-full select-none font-mono ${className}`}>
      {/* ── POKEMON-STYLE HP SECTION ── */}
      <div className="p-2.5 rounded-xl bg-black/70 border border-white/10 shadow-inner flex flex-col gap-1.5 relative overflow-hidden">
        {/* Top Header: HP Tag & Exact Numeric Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.2 rounded border text-[9px] font-black uppercase flex items-center gap-1 ${hpBadgeClass}`}>
              <Heart className="w-2.5 h-2.5" fill="currentColor" />
              <span>HP</span>
            </span>
            <span className="text-[10px] font-black tracking-wider text-slate-300">
              VITALITY
            </span>
          </div>

          <div className="text-[10px] font-black tabular-nums">
            <span className={hpTextClass}>{safeHp}</span>
            <span className="text-slate-500 font-normal"> / {safeMaxHp}</span>
          </div>
        </div>

        {/* Segmented Tri-Color HP Bar */}
        <div className="relative w-full h-3.5 bg-black/90 rounded-full border border-white/15 overflow-hidden p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ${hpColorClass}`}
            style={{ width: `${hpPercent}%` }}
          />
          {/* Tick marks (Pokemon segmented style) */}
          <div className="absolute inset-0 flex justify-between pointer-events-none px-2">
            <div className="w-px h-full bg-black/30" />
            <div className="w-px h-full bg-black/30" />
            <div className="w-px h-full bg-black/30" />
          </div>
        </div>
      </div>

      {/* ── PP / ENERGY (MP) SECTION ── */}
      <div className="p-2 rounded-xl bg-black/60 border border-white/10 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span>PP / ENERGY</span>
          </div>
          <span className="tabular-nums font-bold text-amber-300 text-[9px]">
            {safeMp} <span className="text-slate-500 font-normal">/ {safeMaxMp}</span>
          </span>
        </div>

        <div className="relative w-full h-2 bg-black/90 rounded-full border border-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
            style={{ width: `${mpPercent}%` }}
          />
        </div>
      </div>

      {/* ── EXP BAR ── */}
      <div className="px-1 flex flex-col gap-0.5">
        <div className="flex justify-between items-center text-[8px] text-slate-400">
          <span className="font-bold uppercase tracking-widest text-cyan-400">EXP NEXT LVL</span>
          <span className="tabular-nums">{xpProgress}%</span>
        </div>
        <div className="relative w-full h-1.5 bg-black/90 rounded-full border border-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default PokemonBattleGauge;
