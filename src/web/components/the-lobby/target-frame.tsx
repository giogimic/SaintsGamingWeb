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
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export default function TargetFrame() {
  const combatTarget = useGameStore((state) => state.combatTarget);
  const setCombatTarget = useGameStore((state) => state.setCombatTarget);
  const otherPlayers = useGameStore((state) => state.otherPlayers);
  const showToast = useGameStore((state) => state.showToast);

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
    ? 'rgba(0, 245, 212, 0.5)'
    : isCreature
    ? 'rgba(244, 63, 94, 0.5)'
    : 'rgba(251, 191, 36, 0.5)';

  const glowShadow = isPlayer
    ? '0 0 20px rgba(0, 245, 212, 0.2)'
    : isCreature
    ? '0 0 20px rgba(244, 63, 94, 0.25)'
    : '0 0 20px rgba(251, 191, 36, 0.2)';

  return (
    <div className="pointer-events-none flex flex-col items-center select-none font-mono" data-testid="target-frame">
      <div
        className="pointer-events-auto min-w-[280px] md:min-w-[320px] bg-[#0a0318]/95 border rounded-2xl p-3.5 backdrop-blur-xl relative overflow-hidden"
        style={{
          borderColor,
          boxShadow: `${glowShadow}, inset 0 0 15px rgba(0,0,0,0.8)`,
          clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
        }}
      >
        {/* Header: Icon, Target Name & Badges */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-black/80 border border-white/10 flex items-center justify-center shrink-0">
              <Crosshair
                className={`w-3.5 h-3.5 ${
                  isPlayer ? 'text-[#00f5d4]' : isCreature ? 'text-rose-400' : 'text-amber-400'
                }`}
              />
            </div>
            <h3 className="text-xs font-black text-white truncate max-w-[140px] tracking-wide">
              {target.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {isPlayer && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-cyan-950/80 text-[#00f5d4] border border-cyan-400/50 uppercase shadow-[0_0_6px_rgba(0,245,212,0.3)]">
                PLAYER
              </span>
            )}
            {isCreature && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50 uppercase shadow-[0_0_6px_rgba(244,63,94,0.3)]">
                WILD
              </span>
            )}
            {isNpc && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/50 uppercase shadow-[0_0_6px_rgba(251,191,36,0.3)]">
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
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 font-bold uppercase text-[9px]">TARGET VITALITY</span>
            <span className="font-extrabold text-rose-300">
              {Math.ceil(target.hp)} <span className="text-slate-500 font-normal">/ {target.maxHp}</span>
            </span>
          </div>

          {/* Health Bar with Animated Loss */}
          <div className="relative w-full h-2.5 bg-black/90 overflow-hidden rounded-md border border-rose-500/30">
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${
                target.behavior === 'ENRAGED'
                  ? 'bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]'
                  : 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
            <div className="absolute top-0 bottom-0 w-px bg-black/50 z-10 left-[25%]" />
            <div className="absolute top-0 bottom-0 w-px bg-black/50 z-10 left-[50%]" />
            <div className="absolute top-0 bottom-0 w-px bg-black/50 z-10 left-[75%]" />
          </div>
        </div>

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
          <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-cyan-500/20 justify-end">
            <button
              onClick={handlePartyInvite}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-[#00f5d4] text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title={`Invite ${target.name} to Party`}
            >
              <UserPlus className="w-3 h-3" /> Party
            </button>
            <button
              onClick={handleDuelChallenge}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-400/50 text-amber-200 text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title={`Challenge ${target.name} to Duel`}
            >
              <Swords className="w-3 h-3" /> Duel
            </button>
            <button
              onClick={handleWhisper}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-400/50 text-purple-200 text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title={`Whisper ${target.name}`}
            >
              <MessageSquare className="w-3 h-3" /> Comms
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
