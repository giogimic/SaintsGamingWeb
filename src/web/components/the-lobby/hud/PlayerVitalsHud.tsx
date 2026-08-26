'use client';

import React from 'react';
import { useGameStore } from '../store';
import { Heart, Sparkles, User, Zap, Shield, Swords, Coins } from 'lucide-react';
import { CharacterSpritePreview } from '../CharacterSpritePreview';

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
  subtext,
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
  subtext?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 w-full ${hideHeader ? 'mt-1' : ''}`}>
      {!hideHeader && (
        <div className="flex items-center justify-between font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            {icon && (
              <span className={`flex h-3.5 w-3.5 items-center justify-center ${accentClass}`}>
                {icon}
              </span>
            )}
            <span className="font-extrabold uppercase tracking-wider text-cyan-200">
              {label}
            </span>
          </div>
          <span className="font-bold tabular-nums text-slate-100 text-[10px]">
            {value}
            <span className="text-slate-500 font-normal">/{max}</span>
          </span>
        </div>
      )}
      <div className={`relative w-full overflow-hidden rounded-md bg-black/90 border border-white/10 ${hideHeader ? 'h-2' : 'h-3'}`}>
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
      {subtext && (
        <div className="flex justify-between items-center text-[8px] font-mono text-slate-400 mt-0.5">
          <span>{subtext}</span>
          <span>{percent}%</span>
        </div>
      )}
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

  const isCriticalHp = hpPercent <= 25;
  const credits = player.credits || 1000;
  const perk = player.perk ? player.perk.replace(/_/g, ' ') : null;

  return (
    <div
      className={`pointer-events-auto w-[min(92vw,240px)] select-none font-mono transition-all duration-300 ${
        isCriticalHp ? 'animate-pulse' : ''
      }`}
      style={{
        filter: isCriticalHp ? 'drop-shadow(0 0 12px rgba(244,63,94,0.7))' : 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))',
      }}
    >
      <div
        className="w-full bg-[#0a0318]/95 border border-pink-500/30 rounded-2xl p-3.5 backdrop-blur-xl relative overflow-hidden"
        style={{
          clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
          boxShadow: isCriticalHp
            ? '0 0 25px rgba(244,63,94,0.4), inset 0 0 15px rgba(244,63,94,0.2)'
            : '0 0 20px rgba(0,245,212,0.15), inset 0 0 15px rgba(0,0,0,0.8)',
        }}
      >
        {/* 1. Identity Header with Sprite Avatar */}
        <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-pink-500/20">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00f5d4]/50 bg-black/80 shadow-inner overflow-hidden">
            {player.assetProfileId ? (
              <CharacterSpritePreview assetProfileId={player.assetProfileId} size={28} scale={1.5} />
            ) : (
              <User className="h-5 w-5 text-[#00f5d4]" />
            )}
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-black" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="truncate text-xs font-black tracking-wide text-white">
                {player.name || 'Saint'}
              </h2>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-400/50 text-[#00f5d4] text-[9px] font-extrabold shadow-[0_0_6px_rgba(0,245,212,0.3)]">
                LVL {level}
              </span>
            </div>

            <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
              <span className="text-pink-300 font-bold uppercase truncate">
                {player.combatStyle || 'WARRIOR'}
              </span>
              <span className="flex items-center gap-1 text-amber-300 font-bold">
                <Coins size={10} />
                {credits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Stat Bars Deck */}
        <div className="flex flex-col gap-2">
          {/* Health Bar */}
          <StatBar
            label="HP"
            value={hp}
            max={maxHp}
            percent={hpPercent}
            fillClass={
              hpPercent > 50
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#00f5d4] shadow-[0_0_10px_rgba(0,245,212,0.6)]'
                : hpPercent > 25
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                : 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
            }
            accentClass={isCriticalHp ? 'text-rose-400' : 'text-[#00f5d4]'}
            icon={<Heart className="h-3 w-3" fill="currentColor" />}
            ticksCount={4}
          />

          {/* Mana / Energy Bar */}
          <StatBar
            label="MP"
            value={mp}
            max={maxMp}
            percent={mpPercent}
            fillClass="bg-gradient-to-r from-purple-600 via-violet-400 to-cyan-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            accentClass="text-purple-400"
            icon={<Sparkles className="h-3 w-3" fill="currentColor" />}
            ticksCount={4}
          />

          {/* EXP Progress Bar */}
          <StatBar
            label="EXP"
            value={xpIntoLevel}
            max={xpSpan}
            percent={xpProgress}
            fillClass="bg-gradient-to-r from-pink-600 to-[#ffbe0b] shadow-[0_0_8px_rgba(255,190,11,0.5)]"
            ticksCount={4}
            hideHeader={true}
            subtext="NEXT LEVEL PROGRESS"
          />
        </div>

        {/* 3. Active Perk / Buff Footer */}
        {perk && (
          <div className="mt-2 pt-2 border-t border-pink-500/20 flex items-center justify-between text-[9px] text-purple-300">
            <span className="flex items-center gap-1">
              <Zap size={10} className="text-amber-400" />
              {perk}
            </span>
            <span className="text-slate-500 uppercase tracking-widest text-[8px]">Active</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerVitalsHud;
