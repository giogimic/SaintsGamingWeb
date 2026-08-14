'use client';

import React from 'react';
import { useGameStore } from '../store';
import { Heart, Sparkles, Camera } from 'lucide-react';
import { HudPanelShell } from './HudPanelShell';

function StatBar({
  label,
  value,
  max,
  percent,
  fillClass,
  icon,
  accentClass,
  ticksCount,
  hideHeader,
}: {
  label: string;
  value: number;
  max: number;
  percent: number;
  fillClass: string;
  icon?: React.ReactNode;
  accentClass?: string;
  ticksCount?: number;
  hideHeader?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${hideHeader ? 'mt-0.5' : ''}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-1">
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm ${accentClass}`}>
              {icon}
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-teal-300/70">
              {label}
            </span>
          </div>
          <span className="text-[10px] font-bold tabular-nums text-slate-100">
            {value}
            <span className="text-slate-500 font-normal">/{max}</span>
          </span>
        </div>
      )}
      <div className={`relative w-full overflow-hidden rounded bg-black/60 border border-teal-500/20 ${hideHeader ? 'h-1' : 'h-2'}`}>
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-300 ${fillClass}`}
          style={{ width: `${percent}%` }}
        />
        {ticksCount && ticksCount > 0
          ? Array.from({ length: ticksCount - 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-black/50 z-10"
                style={{ left: `${((i + 1) / ticksCount) * 100}%` }}
              />
            ))
          : null}
      </div>
    </div>
  );
}

export const PlayerVitalsHud: React.FC = () => {
  const player = useGameStore((state) => state.player);

  const hp = player.hp ?? 100;
  const maxHp = player.maxHp ?? 100;
  const hpPercent = Math.min(100, Math.max(0, Math.floor((hp / Math.max(1, maxHp)) * 100)));

  const mp = player.mp ?? 100;
  const maxMp = player.maxMp ?? 100;
  const mpPercent = Math.min(100, Math.max(0, Math.floor((mp / Math.max(1, maxMp)) * 100)));

  const level = player.level || 1;
  const xp = player.xp || 0;
  const nextLevelXp = Math.pow(level, 2) * 50;
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 50;
  const xpIntoLevel = Math.max(0, xp - currentLevelBaseXp);
  const xpSpan = Math.max(1, nextLevelXp - currentLevelBaseXp);
  const xpProgress = Math.min(100, Math.max(0, Math.floor((xpIntoLevel / xpSpan) * 100)));

  return (
    <HudPanelShell className="pointer-events-auto w-[min(92vw,220px)] md:w-[240px] select-none shadow-lg">
      {/* 1. Identity Header: Camera/Avatar + Name + Level */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-teal-500/20">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded border border-teal-500/40 bg-[#02060a] shadow-inner">
          <Camera className="h-4 w-4 text-teal-300" />
          <span className="absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.8)]" />
        </div>
        <div className="min-w-0 flex-1 font-mono">
          <h2 className="truncate text-xs font-bold tracking-wide text-slate-100">
            {player.name || 'Tamer'}
          </h2>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-teal-300/70">
            <span className="text-teal-300 font-bold">Lv {level}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Film</span>
          </div>
        </div>
      </div>

      {/* 2. Stat Bars: HP, MP, and EXP Progress */}
      <div className="flex flex-col gap-2">
        <StatBar
          label="HP"
          value={hp}
          max={maxHp}
          percent={hpPercent}
          fillClass={
            hpPercent > 50
              ? 'bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.6)]'
              : hpPercent > 20
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
              : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
          }
          accentClass="text-teal-400"
          icon={<Heart className="h-3 w-3" fill="currentColor" />}
          ticksCount={4}
        />
        <StatBar
          label="MP"
          value={mp}
          max={maxMp}
          percent={mpPercent}
          fillClass="bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          accentClass="text-cyan-400"
          icon={<Sparkles className="h-3 w-3" fill="currentColor" />}
          ticksCount={4}
        />
        <StatBar
          label="EXP"
          value={xpIntoLevel}
          max={xpSpan}
          percent={xpProgress}
          fillClass="bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.5)]"
          ticksCount={4}
          hideHeader={true}
        />
      </div>
    </HudPanelShell>
  );
};

export default PlayerVitalsHud;
