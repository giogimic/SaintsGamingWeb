'use client';

import React from 'react';
import { useGameStore } from '../store';
import { Heart, Sparkles, Aperture, Camera } from 'lucide-react';

function StatBar({
  label,
  value,
  max,
  percent,
  fillClass,
  icon,
  accentClass,
}: {
  label: string;
  value: number;
  max: number;
  percent: number;
  fillClass: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`flex h-5 w-5 items-center justify-center rounded-sm ${accentClass}`}>
            {icon}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-lobby-fog">
            {label}
          </span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-lobby-mist/90">
          {value}
          <span className="text-lobby-ash"> / {max}</span>
        </span>
      </div>
      <div className="lobby-stat-track relative h-2.5 w-full overflow-hidden rounded-sm">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-300 ${fillClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export const SaintsHudOrbs: React.FC = () => {
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
    <div className="pointer-events-none absolute top-5 left-5 z-30 flex w-[240px] select-none flex-col gap-3">
      {/* Identity — soul-camera plate */}
      <div className="lobby-panel pointer-events-auto rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-lobby-border-strong bg-lobby-panel-soft shadow-[inset_0_0_12px_rgba(167,139,250,0.25)]">
            <Camera className="h-5 w-5 text-lobby-soul" strokeWidth={1.75} />
            <span className="absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full bg-lobby-film shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold tracking-wide text-lobby-mist">
              {player.name || 'Tamer'}
            </h2>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-lobby-fog">
              <span className="text-lobby-film">Lv {level}</span>
              <span className="text-lobby-ash">·</span>
              <span className="text-lobby-soul">Soul Film</span>
            </div>
          </div>
        </div>
      </div>

      {/* Separate HP / MP / EXP */}
      <div className="lobby-panel pointer-events-auto flex flex-col gap-3 rounded-lg px-3 py-3">
        <StatBar
          label="HP"
          value={hp}
          max={maxHp}
          percent={hpPercent}
          fillClass="lobby-stat-fill-hp"
          accentClass="bg-lobby-film/15 text-lobby-film"
          icon={<Heart className="h-3 w-3" fill="currentColor" />}
        />
        <StatBar
          label="MP"
          value={mp}
          max={maxMp}
          percent={mpPercent}
          fillClass="lobby-stat-fill-mp"
          accentClass="bg-lobby-soul/15 text-lobby-soul"
          icon={<Sparkles className="h-3 w-3" />}
        />
        <StatBar
          label="EXP"
          value={xpIntoLevel}
          max={xpSpan}
          percent={xpProgress}
          fillClass="lobby-stat-fill-exp"
          accentClass="bg-white/10 text-lobby-mist"
          icon={<Aperture className="h-3 w-3" />}
        />
      </div>
    </div>
  );
};

export default SaintsHudOrbs;
