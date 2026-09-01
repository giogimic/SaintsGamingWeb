'use client';

import React from 'react';
import { useGameStore } from './store';
import {
  Flame,
  AlertTriangle,
  Wind,
  X,
  User,
  Skull,
  MessageSquare,
  UserPlus,
  Swords,
  Crosshair,
  Sparkles,
  Zap,
  Heart,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { getHudTheme } from './hud/hud-themes';
import { HeartContainersView } from './hud/HeartContainersView';

export default function TargetFrame() {
  const combatTarget = useGameStore((state) => state.combatTarget);
  const setCombatTarget = useGameStore((state) => state.setCombatTarget);
  const otherPlayers = useGameStore((state) => state.otherPlayers);
  const showToast = useGameStore((state) => state.showToast);

  const hudThemeId = useGameStore((state) => state.hudThemeId);
  const hudConfig = useGameStore((state) => state.hudConfig);
  const theme = getHudTheme(hudThemeId || hudConfig?.themeId);

  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-3xl'
      : theme.borderRadiusClass || 'rounded-2xl';

  if (!combatTarget) return null;

  const target = combatTarget;
  const hpPercent = Math.max(0, Math.min(100, (target.hp / Math.max(1, target.maxHp)) * 100));
  const isPlayer = !!(otherPlayers && otherPlayers[target.entityId]);
  const isCreature = target.entityId.startsWith('creature_') || target.entityId.startsWith('mob_');
  const isNpc = target.entityId.startsWith('npc_');

  const handlePartyInvite = () => {
    if (!target.name) return;
    soundSynth?.playActionSound?.();
    const emitSocketEvent = useGameStore.getState().emitSocketEvent;
    emitSocketEvent?.('party_invite_send', { targetName: target.name });
    showToast(`Sent party invitation to ${target.name}!`);
  };

  const handleDuelChallenge = () => {
    if (!target.name) return;
    soundSynth?.playActionSound?.();
    const emitSocketEvent = useGameStore.getState().emitSocketEvent;
    emitSocketEvent?.('battle_invite_send', { targetId: target.entityId, targetName: target.name });
    showToast(`Challenged ${target.name} to a Saints Buddy Battle!`);
  };

  const handleWhisper = () => {
    if (!target.name) return;
    soundSynth?.playSelectSound?.();
    window.dispatchEvent(
      new CustomEvent('game_chat_msg', {
        detail: {
          id: Date.now().toString(),
          sender: 'System',
          text: `Press Enter to chat: /w ${target.name} [message]`,
          timestamp: Date.now(),
          type: 'SYSTEM',
        },
      })
    );
  };

  const borderColor = isPlayer
    ? 'border-amber-500/40'
    : isCreature
    ? 'border-rose-500/40'
    : 'border-slate-500/40';

  return (
    <div className="pointer-events-none flex flex-col items-center select-none font-mono" data-testid="target-frame">
      <div
        className={`pointer-events-auto min-w-[280px] md:min-w-[320px] ${theme.palette.glassBg} border ${borderColor} ${radiusClass} p-3.5 backdrop-blur-xl relative overflow-hidden`}
        style={{
          boxShadow: hudConfig?.borderGlow ? theme.palette.accentGlow : '0 8px 30px rgba(0,0,0,0.7)',
          opacity: hudConfig?.opacity ?? 0.95,
        }}
      >
        {/* Header: Icon, Target Name & Badges */}
        <div className={`flex items-center justify-between pb-2 mb-2 border-b ${theme.palette.border}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-black/80 border border-white/10 flex items-center justify-center shrink-0">
              <Crosshair
                className={`w-3.5 h-3.5 ${
                  isPlayer ? 'text-amber-400' : isCreature ? 'text-rose-400' : 'text-slate-300'
                }`}
              />
            </div>
            <h3 className="text-xs font-black text-slate-100 truncate max-w-[140px] tracking-wide">
              {target.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {isPlayer && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                PLAYER
              </span>
            )}
            {isCreature && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50 uppercase">
                WILD
              </span>
            )}
            {isNpc && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600 uppercase">
                NPC
              </span>
            )}

            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setCombatTarget(null);
              }}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear Target"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Vitality Bar Deck */}
        {hudConfig?.vitalsFormat === 'heart-containers' || theme.id === 'retro-pixel-heart' ? (
          <div className="flex flex-col gap-1">
            <HeartContainersView
              hp={target.hp}
              maxHp={target.maxHp}
              containerCount={8}
              size="sm"
              showLabel={true}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.2 rounded border text-[8px] font-black uppercase flex items-center gap-1 ${
                  hpPercent <= 20
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : hpPercent <= 50
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  <Heart className="w-2 h-2" fill="currentColor" />
                  <span>HP</span>
                </span>
                <span className="text-slate-400 font-bold uppercase text-[9px]">TARGET VITALITY</span>
              </div>
              <span className={`font-extrabold tabular-nums ${
                hpPercent <= 20 ? 'text-rose-400 animate-pulse' : hpPercent <= 50 ? 'text-amber-300' : 'text-emerald-300'
              }`}>
                {Math.ceil(target.hp)} <span className="text-slate-500 font-normal">/ {target.maxHp}</span>
              </span>
            </div>

            {/* Health Bar with Animated Loss & Tri-Color Thresholds */}
            <div className="relative w-full h-2.5 bg-black/90 overflow-hidden rounded-md border border-white/15">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${
                  target.behavior === 'ENRAGED'
                    ? 'bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]'
                    : hpPercent <= 20
                    ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse'
                    : hpPercent <= 50
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                    : theme.palette.hpFill || 'bg-gradient-to-r from-emerald-500 to-green-400'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
              <div className="absolute top-0 bottom-0 w-px bg-black/50 z-10 left-[25%]" />
              <div className="absolute top-0 bottom-0 w-px bg-black/50 z-10 left-[50%]" />
              <div className="absolute top-0 bottom-0 w-px bg-black/50 z-10 left-[75%]" />
            </div>
          </div>
        )}

        {/* Target Behavior / Cast Status */}
        {target.isCasting && target.castName ? (
          <div className="mt-2 text-[10px] text-amber-300 font-mono text-center animate-pulse uppercase tracking-widest font-black py-1 bg-amber-950/60 rounded-lg border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)]">
            ⚡ CASTING: [{target.castName}]
          </div>
        ) : target.behavior && target.behavior !== 'CALM' ? (
          <div className="mt-2 flex items-center justify-between text-[9px] px-2 py-0.5 rounded bg-black/50 border border-white/10">
            <span className="text-slate-400">STATE:</span>
            <span
              className={`font-black uppercase ${
                target.behavior === 'ENRAGED' ? 'text-orange-400 animate-pulse' : 'text-amber-300'
              }`}
            >
              {target.behavior}
            </span>
          </div>
        ) : null}

        {/* Player Quick Actions */}
        {isPlayer && (
          <div className={`flex items-center gap-1.5 pt-2 mt-2 border-t ${theme.palette.border} justify-end`}>
            <button
              onClick={handleWhisper}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[9px] font-bold transition-colors cursor-pointer"
              title={`Whisper ${target.name}`}
            >
              <MessageSquare className="w-3 h-3 text-amber-400" />
              <span>Whisper</span>
            </button>
            <button
              onClick={handlePartyInvite}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-white text-[9px] font-bold transition-colors border border-emerald-500/30 cursor-pointer"
              title={`Invite ${target.name} to Party`}
            >
              <UserPlus className="w-3 h-3" />
              <span>Party</span>
            </button>
            <button
              onClick={handleDuelChallenge}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white text-[9px] font-bold transition-colors border border-amber-500/40 cursor-pointer"
              title={`Challenge ${target.name} to Buddy Battle`}
            >
              <Swords className="w-3 h-3" />
              <span>Battle</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
