'use client';

import React, { useEffect, useState } from 'react';
import RpgPanel from './rpg-panel';
import { useGameStore } from './store';
import { getTopLobbyOperatives } from '@/app/actions/game';
import { Trophy, Crown, BadgeCheck, ShieldCheck, User } from 'lucide-react';

export default function LeaderboardOverlay() {
  const [operatives, setOperatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setGameMode = useGameStore(state => state.setGameMode);

  useEffect(() => {
    async function loadData() {
      const res = await getTopLobbyOperatives();
      if (res.success && res.data) {
        setOperatives(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <RpgPanel title="GLOBAL OPERATIVE LEADERBOARDS" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex flex-col gap-4 h-full font-mono text-xs overflow-hidden">
        
        {/* Header Summary */}
        <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <span className="font-bold text-white text-xs">TOP COMMUNITY OPERATIVES</span>
              <p className="text-[10px] text-slate-400">Ranked by Level, 27-Skill Total XP, Credits & Caught Beasts.</p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded font-bold uppercase">
            LIVE SYNC
          </span>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="text-center text-slate-400 italic p-8">
              Syncing operative rankings...
            </div>
          ) : operatives.length === 0 ? (
            <div className="text-center text-slate-500 italic p-8 border border-dashed rounded">
              No operative rankings recorded yet.
            </div>
          ) : (
            operatives.map((op, idx) => (
              <div 
                key={op.id}
                className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 font-bold text-sm">
                    {idx === 0 && <span className="text-amber-400 font-extrabold">🥇</span>}
                    {idx === 1 && <span className="text-slate-300 font-extrabold">🥈</span>}
                    {idx === 2 && <span className="text-amber-600 font-extrabold">🥉</span>}
                    {idx > 2 && <span className="text-slate-400">#{idx + 1}</span>}
                  </div>

                  <div>
                    <div className="font-bold text-slate-200 text-sm flex items-center gap-1">
                      <span>{op.name}</span>
                      {op.user?.isFounder && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                      {op.user?.isVIP && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                      {op.user?.isTrusted && <ShieldCheck className="w-3.5 h-3.5 text-green-500 fill-green-500" />}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Class: <span className="text-cyan-400">{op.classId}</span> | Perk: {op.perk.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-bold text-emerald-400">LVL {op.level}</div>
                    <div className="text-[10px] text-slate-400">{op.totalXp.toLocaleString()} XP</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="font-bold text-amber-400">{op.credits.toLocaleString()} C</div>
                    <div className="text-[10px] text-purple-400">{op.caughtCount} Beasts</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </RpgPanel>
  );
}
