'use client';

import React from 'react';
import { useGameStore } from './store';
import { Flame, AlertTriangle, Wind, X, User, Skull, MessageSquare, UserPlus } from 'lucide-react';
import { GamePanelShell } from './ui/GamePanelShell';

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
    const emitSocketEvent = useGameStore.getState().emitSocketEvent;
    emitSocketEvent?.('party_invite_send', { targetName: target.name });
    showToast(`Sent party invitation to ${target.name}!`);
  };

  const handleWhisper = () => {
    if (!target.name) return;
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
      <GamePanelShell neonAccent={isPlayer ? 'cyan' : 'magenta'} className="pointer-events-auto px-4 py-2.5 min-w-[240px] md:min-w-[280px] relative">
        <div className="flex justify-between items-center mb-1.5 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isPlayer && (
              <span className="flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50 shrink-0">
                <User className="w-2.5 h-2.5" /> PLAYER
              </span>
            )}
            {isCreature && (
              <span className="flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700/50 shrink-0">
                <Skull className="w-2.5 h-2.5" /> WILD
              </span>
            )}
            {isNpc && (
              <span className="flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/50 shrink-0">
                <MessageSquare className="w-2.5 h-2.5" /> NPC
              </span>
            )}
            <div className="font-extrabold text-white text-[13px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate">
              {target.name}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-[11px] text-red-200/80 font-mono tracking-tighter">
              {Math.ceil(target.hp)} <span className="text-red-400/50">/ {target.maxHp}</span>
            </div>
            <button
              onClick={() => setCombatTarget(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear Target"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <div className="relative w-full h-1.5 bg-black/60 overflow-hidden rounded-sm border border-red-500/20">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${target.behavior === 'ENRAGED' ? 'bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}
            style={{ width: `${hpPercent}%` }}
          />
          {/* Tick marks */}
          <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 mix-blend-overlay left-[25%]" />
          <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 mix-blend-overlay left-[50%]" />
          <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 mix-blend-overlay left-[75%]" />
        </div>
        
        {target.behavior && target.behavior !== 'CALM' && (
          <div className="absolute -top-2.5 -right-2.5 z-20">
            {target.behavior === 'ENRAGED' && (
              <div className="bg-[#050b14]/90 backdrop-blur-sm border border-orange-500 p-1.5 rounded-md shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse">
                <Flame size={14} className="text-orange-400" />
              </div>
            )}
            {target.behavior === 'ALERT' && (
              <div className="bg-[#050b14]/90 backdrop-blur-sm border border-yellow-400 p-1.5 rounded-md shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                <AlertTriangle size={14} className="text-yellow-400" />
              </div>
            )}
            {target.behavior === 'FLEEING' && (
              <div className="bg-[#050b14]/90 backdrop-blur-sm border border-cyan-400 p-1.5 rounded-md shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-bounce">
                <Wind size={14} className="text-cyan-400" />
              </div>
            )}
          </div>
        )}
        
        {target.isCasting && target.castName && (
          <div className="mt-1.5 text-[10px] text-orange-400 font-mono text-center animate-pulse uppercase tracking-widest font-bold">
            [{target.castName}]
          </div>
        )}

        {isPlayer && (
          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-cyan-900/40 justify-end">
            <button
              onClick={handlePartyInvite}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[10px] font-mono font-bold transition-colors cursor-pointer"
              title={`Invite ${target.name} to Party`}
            >
              <UserPlus className="w-3 h-3" /> Invite
            </button>
            <button
              onClick={handleWhisper}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 text-[10px] font-mono font-bold transition-colors cursor-pointer"
              title={`Whisper ${target.name}`}
            >
              <MessageSquare className="w-3 h-3" /> Whisper
            </button>
          </div>
        )}
      </GamePanelShell>
    </div>
  );
}
