'use client';

import React from 'react';
import { useGameStore } from '../store';
import { Heart, Sparkles, User, Zap, Shield, Swords, Coins } from 'lucide-react';
import { CharacterSpritePreview } from '../CharacterSpritePreview';
import { getHudTheme } from './hud-themes';
import { HeartContainersView } from './HeartContainersView';
import { IconContainersView } from './IconContainersView';
import { PokemonBattleGauge } from './PokemonBattleGauge';

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
            <span className="font-extrabold uppercase tracking-wider text-slate-200">
              {label}
            </span>
          </div>
          <span className="font-bold tabular-nums text-slate-100 text-[10px]">
            {value}
            <span className="text-slate-500 font-normal">/{max}</span>
          </span>
        </div>
      )}
      <div className={`relative w-full overflow-hidden rounded-md bg-black/90 border border-white/10 ${hideHeader ? 'h-1.5' : 'h-3'}`}>
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
  const hp = useGameStore((state) => state.player.hp ?? 100);
  const maxHp = useGameStore((state) => state.player.maxHp ?? 100);
  const mp = useGameStore((state) => state.player.mp ?? 100);
  const maxMp = useGameStore((state) => state.player.maxMp ?? 100);
  const stamina = useGameStore((state) => state.player.stamina ?? 100);
  const maxStamina = useGameStore((state) => state.player.maxStamina ?? 100);
  const level = useGameStore((state) => state.player.level || 1);
  const xp = useGameStore((state) => state.player.xp || 0);
  const credits = useGameStore((state) => state.player.credits || 1000);
  const perkRaw = useGameStore((state) => state.player.perk);
  const name = useGameStore((state) => state.player.name || 'Saint');
  const assetProfileId = useGameStore((state) => state.player.assetProfileId);
  const combatStyle = useGameStore((state) => state.player.combatStyle || 'WARRIOR');
  
  const hudThemeId = useGameStore((state) => state.hudThemeId);
  const hudConfig = useGameStore((state) => state.hudConfig);
  const theme = getHudTheme(hudThemeId || hudConfig?.themeId);

  const hpPercent = Math.min(100, Math.max(0, Math.floor((hp / Math.max(1, maxHp)) * 100)));
  const mpPercent = Math.min(100, Math.max(0, Math.floor((mp / Math.max(1, maxMp)) * 100)));
  const staminaPercent = Math.min(100, Math.max(0, Math.floor((stamina / Math.max(1, maxStamina)) * 100)));

  const nextLevelXp = Math.pow(level, 2) * 50;
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 50;
  const xpIntoLevel = Math.max(0, xp - currentLevelBaseXp);
  const xpSpan = Math.max(1, nextLevelXp - currentLevelBaseXp);
  const xpProgress = Math.min(100, Math.max(0, Math.floor((xpIntoLevel / xpSpan) * 100)));

  const isCriticalHp = hpPercent <= 25;
  const perk = perkRaw ? perkRaw.replace(/_/g, ' ') : null;

  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-3xl'
      : theme.borderRadiusClass || 'rounded-2xl';

  const effectiveVitalsFormat =
    hudConfig?.vitalsFormat ||
    (theme.id === 'pocket-creature'
      ? 'pokemon-gauge'
      : theme.id === 'retro-pixel-heart'
      ? 'heart-containers'
      : 'dual-bar');

  const isSeparated = hudConfig?.vitalsLayout === 'separate';
  const containerClass = isSeparated
    ? 'flex flex-col gap-2'
    : `w-full ${theme.palette.glassBg} border ${theme.palette.border} ${radiusClass} p-3.5 backdrop-blur-xl relative overflow-hidden`;

  const panelClass = isSeparated
    ? `w-full ${theme.palette.glassBg} border ${theme.palette.border} ${radiusClass} p-2.5 backdrop-blur-xl relative overflow-hidden`
    : '';

  const renderIdentityHeader = () => (
    <div className={`flex items-center gap-2.5 ${isSeparated ? '' : `pb-2.5 mb-2.5 border-b ${theme.palette.border}`}`}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-black/80 shadow-inner overflow-hidden">
        {assetProfileId ? (
          <CharacterSpritePreview assetProfileId={assetProfileId} size={28} scale={1.5} />
        ) : (
          <User className="h-5 w-5 text-amber-400" />
        )}
        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-black" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h2 className="truncate text-xs font-black tracking-wide text-slate-100">
            {name || 'Saint'}
          </h2>
          <span className={`px-2 py-0.5 rounded ${theme.palette.badgeBg} border ${theme.palette.border} ${theme.palette.badgeText} text-[9px] font-extrabold`}>
            LVL {level}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
          <span className="text-amber-400 font-bold uppercase truncate">
            {combatStyle || 'WARRIOR'}
          </span>
          <span className="flex items-center gap-1 text-amber-300 font-bold">
            <Coins size={10} />
            {credits.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`pointer-events-auto w-[min(92vw,240px)] select-none font-mono transition-all duration-300 ${
        isCriticalHp ? 'animate-pulse' : ''
      }`}
      style={{
        filter: isCriticalHp ? 'drop-shadow(0 0 12px rgba(244,63,94,0.7))' : 'drop-shadow(0 4px 20px rgba(0,0,0,0.7))',
        opacity: hudConfig?.opacity ?? 0.95,
      }}
    >
      <div
        className={containerClass}
        style={{
          boxShadow: !isSeparated && isCriticalHp
            ? '0 0 25px rgba(244,63,94,0.4), inset 0 0 15px rgba(244,63,94,0.2)'
            : !isSeparated && hudConfig?.borderGlow ? theme.palette.accentGlow : undefined,
        }}
      >
        {/* 1. Identity Header */}
        {isSeparated ? (
          <div className={panelClass}>{renderIdentityHeader()}</div>
        ) : (
          renderIdentityHeader()
        )}

        {/* 2. Vitality Display Wrapper */}
        <div className={isSeparated ? 'flex flex-col gap-2' : ''}>

        {/* 2. Vitality Display (Theme / Format Responsive) */}
        {effectiveVitalsFormat === 'pokemon-gauge' ? (
          /* ── POKÉMON BATTLE GAUGE ── */
          <div className={isSeparated ? panelClass : ''}>
            <PokemonBattleGauge
              name={name}
              level={level}
              hp={hp}
              maxHp={maxHp}
              mp={mp}
              maxMp={maxMp}
              xpIntoLevel={xpIntoLevel}
              xpSpan={xpSpan}
              xpProgress={xpProgress}
              perk={perk}
              combatStyle={combatStyle}
              themeId={theme.id}
            />
          </div>
        ) : effectiveVitalsFormat === 'heart-containers' ? (
          /* ── HEART CONTAINERS VIEW ── */
          /* ── HEART CONTAINERS VIEW ── */
          <>
            <div className={isSeparated ? panelClass : ''}>
              <HeartContainersView
                hp={hp}
                maxHp={maxHp}
                containerCount={hudConfig?.heartContainerCount || 10}
                size="md"
                showLabel={true}
                isRetroPixel={theme.id === 'retro-pixel-heart'}
              />
            </div>
            <div className={isSeparated ? panelClass : 'mt-2'}>
              <StatBar
                label="MP"
                value={mp}
                max={maxMp}
                percent={mpPercent}
                fillClass={theme.palette.mpFill}
                accentClass="text-sky-400"
                icon={<Sparkles className="h-3 w-3" fill="currentColor" />}
                ticksCount={4}
              />
            </div>
            <div className={isSeparated ? panelClass : 'mt-2'}>
              <StatBar
                label="SP"
                value={stamina}
                max={maxStamina}
                percent={staminaPercent}
                fillClass={(theme.palette as any).staminaFill || 'bg-amber-400'}
                accentClass="text-amber-400"
                icon={<Zap className="h-3 w-3" fill="currentColor" />}
                ticksCount={4}
              />
            </div>
            <div className={isSeparated ? panelClass : 'mt-2'}>
              <StatBar
                label="EXP"
                value={xpIntoLevel}
                max={xpSpan}
                percent={xpProgress}
                fillClass={theme.palette.xpFill}
                ticksCount={4}
                hideHeader={true}
                subtext="LEVEL PROGRESS"
              />
            </div>
          </>
        ) : effectiveVitalsFormat === 'icon-bars' ? (
          /* ── ICON BARS (Hearts, Droplets, Zaps) ── */
          <>
            <div className={isSeparated ? panelClass : ''}>
              <IconContainersView
                vitalType="heart"
                label="HP"
                value={hp}
                maxValue={maxHp}
                baseColorClass="text-rose-400"
                baseGradientStart="#ff4b72"
                baseGradientMid="#e11d48"
                baseGradientEnd="#9f1239"
                emptyColorClass="text-rose-950/70"
              />
            </div>
            <div className={isSeparated ? panelClass : 'mt-2'}>
              <IconContainersView
                vitalType="droplet"
                label="MP"
                value={mp}
                maxValue={maxMp}
                baseColorClass="text-sky-400"
                baseGradientStart="#38bdf8"
                baseGradientMid="#0284c7"
                baseGradientEnd="#075985"
                emptyColorClass="text-sky-950/70"
              />
            </div>
            <div className={isSeparated ? panelClass : 'mt-2'}>
              <IconContainersView
                vitalType="zap"
                label="SP"
                value={stamina}
                maxValue={maxStamina}
                baseColorClass="text-amber-400"
                baseGradientStart="#facc15"
                baseGradientMid="#ca8a04"
                baseGradientEnd="#854d0e"
                emptyColorClass="text-amber-950/70"
              />
            </div>
          </>
        ) : effectiveVitalsFormat === 'compact-stacked' ? (
          /* ── COMPACT STACKED BARS ── */
          <div className={isSeparated ? panelClass : 'flex flex-col gap-1.5'}>
            <StatBar
              label="HP"
              value={hp}
              max={maxHp}
              percent={hpPercent}
              fillClass={
                hpPercent <= 25
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                  : theme.palette.hpFill
              }
              accentClass="text-rose-400"
              icon={<Heart className="h-3 w-3" fill="currentColor" />}
              ticksCount={2}
            />
            <StatBar
              label="MP"
              value={mp}
              max={maxMp}
              percent={mpPercent}
              fillClass={theme.palette.mpFill}
              accentClass="text-sky-400"
              icon={<Sparkles className="h-3 w-3" fill="currentColor" />}
              ticksCount={2}
              hideHeader={true}
            />
            <StatBar
              label="SP"
              value={stamina}
              max={maxStamina}
              percent={staminaPercent}
              fillClass={(theme.palette as any).staminaFill || 'bg-amber-400'}
              accentClass="text-amber-400"
              icon={<Zap className="h-3 w-3" fill="currentColor" />}
              ticksCount={2}
              hideHeader={true}
            />
          </div>
        ) : (
          /* ── DUAL BARS (DEFAULT) ── */
          <>
            <div className={isSeparated ? panelClass : 'flex flex-col gap-2'}>
              <StatBar
                label="HP"
                value={hp}
                max={maxHp}
                percent={hpPercent}
                fillClass={
                  hpPercent <= 25
                    ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                    : theme.palette.hpFill
                }
                accentClass="text-rose-400"
                icon={<Heart className="h-3 w-3" fill="currentColor" />}
                ticksCount={4}
              />
              <StatBar
                label="MP"
                value={mp}
                max={maxMp}
                percent={mpPercent}
                fillClass={theme.palette.mpFill}
                accentClass="text-sky-400"
                icon={<Sparkles className="h-3 w-3" fill="currentColor" />}
                ticksCount={4}
              />
              <StatBar
                label="SP"
                value={stamina}
                max={maxStamina}
                percent={staminaPercent}
                fillClass={(theme.palette as any).staminaFill || 'bg-amber-400'}
                accentClass="text-amber-400"
                icon={<Zap className="h-3 w-3" fill="currentColor" />}
                ticksCount={4}
              />
              <StatBar
                label="EXP"
                value={xpIntoLevel}
                max={xpSpan}
                percent={xpProgress}
                fillClass={theme.palette.xpFill}
                ticksCount={4}
                hideHeader={true}
                subtext="LEVEL PROGRESS"
              />
            </div>
          </>
        )}
        </div>

        {/* 3. Active Perk / Buff Footer */}
        {perk && effectiveVitalsFormat !== 'pokemon-gauge' && (
          <div className={isSeparated ? panelClass : `mt-2 pt-2 border-t ${theme.palette.border} flex items-center justify-between text-[9px] text-amber-300`}>
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
