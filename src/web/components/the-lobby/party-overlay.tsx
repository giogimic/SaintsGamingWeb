/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import { GamePanelShell } from './hud/GamePanelShell';
import { getCreatureById } from './data/saints-dex';
import { UserPlus, LogOut, Users } from 'lucide-react';

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
    const emitSocketEvent = useGameStore.getState().emitSocketEvent;
    emitSocketEvent?.('party_invite_send', { targetName: name });
    showToast(`Sent party invitation to ${name}!`);
    if (!targetName) setInviteInput('');
  };

  const handleLeaveParty = () => {
    const emitSocketEvent = useGameStore.getState().emitSocketEvent;
    emitSocketEvent?.('party_leave', {});
    useGameStore.setState(state => { state.player.party = []; });
    showToast('Left party.');
  };

  return (
    <GamePanelShell neonAccent="cyan" className="pointer-events-auto z-40 flex w-[min(95vw,100%)] max-w-full flex-col overflow-hidden sm:w-[600px] h-[75vh]">
      <div className="flex justify-between items-center bg-black/40 p-2 border-b border-[#22d3ee]/20 backdrop-blur-md">
        <h2 className="font-extrabold text-cyan-50 tracking-widest text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">PARTY & CO-OP MANAGEMENT</h2>
        <button onClick={() => setGameMode('EXPLORING')} className="text-cyan-200/50 hover:text-cyan-100 transition-colors font-mono cursor-pointer">
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-4 h-full font-mono text-xs p-4 bg-[#050b14]/90 overflow-hidden">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center bg-black/60 p-2 rounded-lg border border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('BEASTS')}
              className={`px-3 py-1.5 rounded font-bold transition-colors cursor-pointer ${
                activeTab === 'BEASTS' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🐾 BEAST SQUAD ({caughtDaemons.length})
            </button>
            <button
              onClick={() => setActiveTab('MULTIPLAYER')}
              className={`px-3 py-1.5 rounded font-bold transition-colors cursor-pointer ${
                activeTab === 'MULTIPLAYER' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              👥 CO-OP PARTY ({party.length + 1}/4)
            </button>
          </div>

          <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-900">
            CO-OP BONUS: +25% SHARED XP
          </div>
        </div>

        {/* TAB 1: BEAST SQUAD */}
        {activeTab === 'BEASTS' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {caughtDaemons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 font-mono text-center p-4 gap-3">
                <p className="italic">
                  No party creature yet. Claim your Rockitten starter first,<br/>
                  then battle wild Rockitten in tall grass.
                </p>
                <button
                  onClick={() => setGameMode('PROFESSOR_LAB')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded cursor-pointer"
                >
                  Open Lab — Choose Starter
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {caughtDaemons.map((id) => {
                  const daemon = getCreatureById(id);
                  if (!daemon) return null;
                  const isActive = activeDaemonId === id;

                  return (
                    <div 
                      key={id} 
                      className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-all ${
                        isActive 
                          ? 'bg-[#3e2723]/80 border-[#ca8a04] shadow-[0_0_15px_rgba(202,138,4,0.3)]' 
                          : 'bg-[#1a1a1a]/80 border-[#333] hover:border-[#666]'
                      }`}
                    >
                      <div className="w-16 h-16 bg-black rounded border border-[#3e2723] flex items-center justify-center overflow-hidden shrink-0">
                        {daemon.assetPath ? (
                          <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                        ) : (
                          <span className="text-[#5d4037] text-2xl font-mono">?</span>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[#e0e0e0] font-bold text-lg">{daemon.name}</h3>
                          {isActive && <span className="text-[10px] bg-[#ca8a04] text-black font-bold px-2 py-0.5 rounded-full">ACTIVE</span>}
                        </div>
                        <span className="text-[#a1887f] text-sm font-mono mt-1">{daemon.type_primary} / {daemon.type_secondary}</span>
                      </div>

                      {!isActive && (
                        <button 
                          onClick={() => useGameStore.setState(state => { state.player.activeDaemonId = id })}
                          className="px-4 py-2 bg-[#4e342e] hover:bg-[#5d4037] text-white text-sm font-bold rounded border border-[#3e2723] transition-colors cursor-pointer"
                        >
                          EQUIP
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MULTIPLAYER CO-OP PARTY */}
        {activeTab === 'MULTIPLAYER' && (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Invite Form */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteInput}
                  onChange={e => setInviteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendInvite(); }}
                  placeholder="Enter player name to invite to Party..."
                  className="flex-1 bg-black/60 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleSendInvite()}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> INVITE
                </button>
              </div>

              {/* Nearby online players quick invite */}
              {nearbyPlayers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400">Nearby in Realm:</span>
                  {nearbyPlayers.map((peer) => (
                    <button
                      key={peer.name}
                      onClick={() => handleSendInvite(peer.name)}
                      className="px-2 py-0.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-[10px] rounded transition-colors flex items-center gap-1 cursor-pointer"
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
              <div className="p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-lg border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400">
                    👑
                  </div>
                  <div>
                    <h4 className="font-bold text-cyan-200 text-sm">{useGameStore.getState().player.name || 'Operative'} (You)</h4>
                    <span className="text-[10px] text-cyan-400 font-mono">PARTY LEADER</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold uppercase">
                    ONLINE
                  </span>
                  {party.length > 0 && (
                    <button
                      onClick={handleLeaveParty}
                      className="px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 text-[10px] rounded font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Leave current party"
                    >
                      <LogOut className="w-3 h-3" /> LEAVE
                    </button>
                  )}
                </div>
              </div>

              {/* Members */}
              {party.length === 0 ? (
                <div className="text-slate-500 text-xs italic text-center p-6 border border-dashed rounded">
                  No party members joined yet. Invite nearby online players to share XP!
                </div>
              ) : (
                party.map((m: any) => (
                  <div key={m.userId || m.name} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black rounded-lg border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                        🛡️
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">{m.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Member</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold uppercase">
                      ONLINE
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </GamePanelShell>
  );
}
