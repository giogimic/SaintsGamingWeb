'use client';

import React, { useEffect, useState } from 'react';
import { HudPanelShell } from './hud/HudPanelShell';
import { useGameStore } from './store';
import { getTopLobbyOperatives } from '@/app/actions/game';
import { Trophy, Crown, BadgeCheck, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export default function LeaderboardOverlay() {
  const [operatives, setOperatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setGameMode = useGameStore(state => state.setGameMode);

  const loadData = async () => {
    setLoading(true);
    const res = await getTopLobbyOperatives();
    if (res.success && res.data) {
      setOperatives(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    soundSynth?.playSelectSound?.();
    loadData();
  };

  return (
    <div className="pointer-events-auto z-40 flex w-[min(95vw,600px)] max-w-full flex-col font-mono text-xs select-none">
      <HudPanelShell 
        title="GLOBAL SAINTS LEADERBOARDS" 
        icon={<Trophy className="w-4 h-4 text-amber-400" />}
        onClose={() => setGameMode('EXPLORING')}
        headerRight={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500/40 uppercase transition-colors cursor-pointer"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        }
      >
        <div className="flex flex-col gap-3.5 h-[68vh] p-3">
          
          {/* Header Summary */}
          <div className="p-3 bg-black/60 border border-amber-500/30 rounded-xl flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="font-bold text-white text-xs">TOP COMMUNITY SAINTS</span>
                <p className="text-[10px] text-slate-400">Ranked by Level, 27-Skill Total XP, Sanctuary Wealth & Captured Beasts.</p>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/40 rounded font-bold uppercase">
              LIVE SYNC
            </span>
          </div>

          {/* Directory List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center text-slate-400 italic p-8 border border-slate-800 rounded-xl bg-black/40">
                Syncing global saints rankings...
              </div>
            ) : operatives.length === 0 ? (
              <div className="text-center text-slate-500 italic p-8 border border-dashed border-slate-800 rounded-xl bg-black/40">
                No rankings recorded yet.
              </div>
            ) : (
              operatives.map((op, idx) => (
                <div 
                  key={op.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    idx === 0
                      ? 'bg-amber-950/30 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : idx === 1
                      ? 'bg-slate-900/60 border-slate-400/40'
                      : idx === 2
                      ? 'bg-amber-950/20 border-amber-700/40'
                      : 'bg-black/40 border-slate-800 hover:border-slate-700'
                  }`}
                  style={{
                    clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 font-bold text-sm text-center">
                      {idx === 0 && <span className="text-amber-400 font-extrabold text-base">🥇</span>}
                      {idx === 1 && <span className="text-slate-300 font-extrabold text-base">🥈</span>}
                      {idx === 2 && <span className="text-amber-600 font-extrabold text-base">🥉</span>}
                      {idx > 2 && <span className="text-slate-500">#{idx + 1}</span>}
                    </div>

                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{op.name}</span>
                        {op.user?.isFounder && <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                        {op.user?.isVIP && <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />}
                        {op.user?.isTrusted && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Class: <span className="text-cyan-400 uppercase font-bold">{op.classId}</span> | Perk: <span className="text-slate-300">{op.perk.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="font-bold text-emerald-400 text-xs">LVL {op.level}</div>
                      <div className="text-[10px] text-slate-400">{op.totalXp.toLocaleString()} XP</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="font-bold text-amber-300 text-xs">{op.credits.toLocaleString()} C</div>
                      <div className="text-[10px] text-purple-400">{op.caughtCount} Beasts</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </HudPanelShell>
    </div>
  );
}

