/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import { HudPanelShell } from './hud/HudPanelShell';
import { getCreatureById } from './data/saints-dex';
import { UserPlus, LogOut, Users, Sparkles, PawPrint, Shield, Check } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export default function PartyOverlay() {
  const [activeTab, setActiveTab] = useState<'BEASTS' | 'MULTIPLAYER'>('BEASTS');
  const [inviteInput, setInviteInput] = useState('');

  const caughtDaemons = useGameStore(state => state.player.caughtDaemons);
  const activeDaemonId = useGameStore(state => state.player.activeDaemonId);
  const party = useGameStore(state => state.player.party) || [];
  const otherPlayers = useGameStore(state => state.otherPlayers);
  const setGameMode = useGameStore(state => state.setGameMode);
  const showToast = useGameStore(state => state.showToast);

  const nearbyPlayers = Object.values(otherPlayers || {}).filter(p => p && p.name);

  const handleSendInvite = (targetName?: string) => {
    const name = (targetName || inviteInput).trim();
    if (!name) return;
    soundSynth?.playActionSound?.();
    const emitSocketEvent = useGameStore.getState().emitSocketEvent;
    emitSocketEvent?.('party_invite_send', { targetName: name });
    showToast(`Sent party invitation to ${name}!`);
    if (!targetName) setInviteInput('');
  };

  const handleLeaveParty = () => {
    soundSynth?.playSelectSound?.();
    const emitSocketEvent = useGameStore.getState().emitSocketEvent;
    emitSocketEvent?.('party_leave', {});
    useGameStore.setState(state => { state.player.party = []; });
    showToast('Left party.');
  };

  const handleEquipDaemon = (id: string) => {
    soundSynth?.playSelectSound?.();
    useGameStore.setState(state => { state.player.activeDaemonId = id; });
    const daemon = getCreatureById(id);
    showToast(`Active companion set to ${daemon?.name || id}`);
  };

  return (
    <div className="pointer-events-auto z-40 flex w-[min(95vw,560px)] max-w-full flex-col font-mono text-xs select-none">
      <HudPanelShell 
        title="PARTY & CO-OP MANAGEMENT" 
        icon={<Users className="w-4 h-4 text-cyan-400" />}
        onClose={() => setGameMode('EXPLORING')}
        headerRight={
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 uppercase">
            +25% SHARED XP
          </span>
        }
      >
        <div className="flex flex-col gap-3.5 h-[68vh] p-3">
          
          {/* Navigation Bar */}
          <div className="flex justify-between items-center bg-black/60 p-1.5 rounded-xl border border-cyan-500/20">
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setActiveTab('BEASTS');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  activeTab === 'BEASTS' 
                    ? 'bg-purple-600/80 text-purple-100 border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PawPrint className="w-3.5 h-3.5" /> BEAST SQUAD ({caughtDaemons.length})
              </button>
              <button
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setActiveTab('MULTIPLAYER');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  activeTab === 'MULTIPLAYER' 
                    ? 'bg-cyan-600/80 text-cyan-100 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> CO-OP PARTY ({party.length + 1}/4)
              </button>
            </div>
          </div>

          {/* TAB 1: BEAST SQUAD */}
          {activeTab === 'BEASTS' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
              {caughtDaemons.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6 gap-3 border border-slate-800 rounded-xl bg-black/40">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    No companion bonded yet.<br/>
                    Visit Professor Oakwood&apos;s Lab or capture wild beasts in tall grass.
                  </p>
                  <button
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      setGameMode('PROFESSOR_LAB');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer border border-emerald-400 shadow-md"
                  >
                    Open Research Sanctuary
                  </button>
                </div>
              ) : (
                caughtDaemons.map((id) => {
                  const daemon = getCreatureById(id);
                  if (!daemon) return null;
                  const isActive = activeDaemonId === id;

                  return (
                    <div 
                      key={id} 
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all ${
                        isActive 
                          ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)]' 
                          : 'bg-black/40 border-slate-800 hover:border-slate-700'
                      }`}
                      style={{
                        clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
                      }}
                    >
                      <div className="w-14 h-14 bg-black/80 rounded-lg border border-purple-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {daemon.assetPath ? (
                          <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" />
                        ) : (
                          <span className="text-purple-400 text-xl font-bold">?</span>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-bold text-sm truncate">{daemon.name}</h3>
                          {isActive && (
                            <span className="text-[9px] bg-purple-500/20 border border-purple-400 text-purple-300 font-bold px-2 py-0.5 rounded uppercase">
                              ACTIVE COMPANION
                            </span>
                          )}
                        </div>
                        <span className="text-purple-300/70 text-[10px] mt-0.5 uppercase">
                          {daemon.type_primary} {daemon.type_secondary ? `/ ${daemon.type_secondary}` : ''}
                        </span>
                      </div>

                      {!isActive && (
                        <button 
                          onClick={() => handleEquipDaemon(id)}
                          className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/50 text-purple-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          SUMMON
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: MULTIPLAYER CO-OP PARTY */}
          {activeTab === 'MULTIPLAYER' && (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              {/* Invite Form */}
              <div className="p-3 bg-black/50 border border-cyan-500/30 rounded-xl flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={e => setInviteInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendInvite(); }}
                    placeholder="Enter Saint name to invite to Party..."
                    className="flex-1 bg-black/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => handleSendInvite()}
                    className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> INVITE
                  </button>
                </div>

                {/* Nearby online players quick invite */}
                {nearbyPlayers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400">Nearby Saints:</span>
                    {nearbyPlayers.map((peer) => (
                      <button
                        key={peer.name}
                        onClick={() => handleSendInvite(peer.name)}
                        className="px-2 py-0.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-600/50 text-cyan-300 text-[10px] rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title={`Invite ${peer.name} to Party`}
                      >
                        <UserPlus className="w-2.5 h-2.5" /> {peer.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Party Roster */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {/* Leader */}
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/50 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black/80 rounded-lg border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400 text-lg">
                      👑
                    </div>
                    <div>
                      <h4 className="font-bold text-cyan-100 text-sm">{useGameStore.getState().player.name || 'Saint'} (You)</h4>
                      <span className="text-[9px] text-cyan-400 font-bold uppercase">PARTY LEADER</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded font-bold uppercase">
                      ACTIVE
                    </span>
                    {party.length > 0 && (
                      <button
                        onClick={handleLeaveParty}
                        className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-600/50 text-rose-300 text-[10px] rounded font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Leave current party"
                      >
                        <LogOut className="w-3 h-3" /> LEAVE
                      </button>
                    )}
                  </div>
                </div>

                {/* Members */}
                {party.length === 0 ? (
                  <div className="text-slate-500 text-xs italic text-center p-6 border border-dashed border-slate-800 rounded-xl">
                    No party members joined yet. Invite nearby online saints to share XP!
                  </div>
                ) : (
                  party.map((m: any) => (
                    <div key={m.userId || m.name} className="p-3 bg-black/40 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black/80 rounded-lg border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                          🛡️
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm">{m.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">Member</span>
                        </div>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold uppercase">
                        ACTIVE
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </HudPanelShell>
    </div>
  );
}

