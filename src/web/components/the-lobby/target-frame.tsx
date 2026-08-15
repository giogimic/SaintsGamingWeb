'use client';

import React from 'react';
import { useGameStore } from './store';
import { Flame, AlertTriangle, Wind, X, User, Skull, MessageSquare, UserPlus, Swords, Crosshair } from 'lucide-react';
import { HudPanelShell } from './hud/HudPanelShell';
import { soundSynth } from '@/engine/sound-synth';

export default function TargetFrame() {
  const combatTarget = useGameStore(state => state.combatTarget);
  const setCombatTarget = useGameStore(state => state.setCombatTarget);
  const otherPlayers = useGameStore(state => state.otherPlayers);
  const showToast = useGameStore(state => state.showToast);
  
  if (!combatTarget) return null;

  const target = combatTarget;
  const hpPercent = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));
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

  return (
    <div className="pointer-events-none flex flex-col items-center" data-testid="target-frame">
      <HudPanelShell 
        accentState={isPlayer ? 'active' : isCreature ? 'alert' : 'none'} 
        className="pointer-events-auto min-w-[260px] md:min-w-[300px] shadow-[0_0_20px_rgba(0,0,0,0.8)]"
        title={target.name}
        icon={<Crosshair className={`w-3.5 h-3.5 ${isPlayer ? 'text-cyan-400' : isCreature ? 'text-rose-400' : 'text-amber-400'}`} />}
        headerRight={
          <div className="flex items-center gap-1.5">
            {isPlayer && (
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 uppercase">
                PLAYER
              </span>
            )}
            {isCreature && (
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 uppercase">
                WILD
              </span>
            )}
            {isNpc && (
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 uppercase">
                NPC
              </span>
            )}
            <button
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setCombatTarget(null);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear Target"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 p-1 font-mono text-xs">
          {/* Health Gauge Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-bold uppercase">TARGET VITALITY</span>
              <span className="font-bold text-rose-300">
                {Math.ceil(target.hp)} <span className="text-slate-500">/ {target.maxHp}</span>
              </span>
            </div>

            <div className="relative w-full h-2 bg-black/80 overflow-hidden rounded border border-rose-500/30">
              <div 
                className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${
                  target.behavior === 'ENRAGED' 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-400 shadow-[0_0_10px_rgba(249,115,22,0.8)]' 
                    : 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
              <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 left-[25%]" />
              <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 left-[50%]" />
              <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 left-[75%]" />
            </div>
          </div>

          {/* Behavior Alert Icon */}
          {target.behavior && target.behavior !== 'CALM' && (
            <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-black/40 border border-slate-800">
              <span className="text-slate-400">STATE:</span>
              <span className={`font-bold uppercase ${
                target.behavior === 'ENRAGED' ? 'text-orange-400 animate-pulse' : 'text-amber-300'
              }`}>
                {target.behavior}
              </span>
            </div>
          )}
          
          {target.isCasting && target.castName && (
            <div className="text-[10px] text-amber-300 font-mono text-center animate-pulse uppercase tracking-widest font-black py-0.5 bg-amber-950/30 rounded border border-amber-500/30">
              [{target.castName}]
            </div>
          )}

          {/* Player Quick Actions */}
          {isPlayer && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-cyan-500/20 justify-end">
              <button
                onClick={handlePartyInvite}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                title={`Invite ${target.name} to Party`}
              >
                <UserPlus className="w-3 h-3" /> Invite
              </button>
              <button
                onClick={handleDuelChallenge}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                title={`Challenge ${target.name} to Duel`}
              >
                <Swords className="w-3 h-3" /> Duel
              </button>
              <button
                onClick={handleWhisper}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                title={`Whisper ${target.name}`}
              >
                <MessageSquare className="w-3 h-3" /> Msg
              </button>
            </div>
          )}
        </div>
      </HudPanelShell>
    </div>
  );
}

