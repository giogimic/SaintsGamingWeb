'use client';

import React, { useState } from 'react';
import RpgPanel from './rpg-panel';
import { useGameStore } from './store';
import { unlockGameAchievement } from '@/app/actions/game';
import { Award, CheckCircle2, Lock, Coins, Sparkles } from 'lucide-react';

interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  rewardCoins: number;
  rewardXp: number;
  category: string;
}

const GAME_ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_capture', title: 'First Companion Bound', desc: 'Capture or claim your first Tuxemon beast companion.', rewardCoins: 50, rewardXp: 100, category: 'Taming' },
  { id: 'campaign_explorer', title: 'Campaign Explorer', desc: 'Warp through 5 different campaign region maps.', rewardCoins: 100, rewardXp: 250, category: 'Exploration' },
  { id: 'master_crafter', title: 'Master Weapon Crafter', desc: 'Craft a weapon with ARPG stat affixes at the Crafting Station.', rewardCoins: 75, rewardXp: 150, category: 'Crafting' },
  { id: 'keeper_conqueror', title: 'Keeper Conqueror', desc: 'Defeat a trainer Keeper in Phase 2 ARPG combat.', rewardCoins: 150, rewardXp: 300, category: 'Combat' },
  { id: 'base_tycoon', title: 'Sanctuary Base Tycoon', desc: 'Assign 3 beasts to base automation facilities.', rewardCoins: 120, rewardXp: 200, category: 'Automation' }
];

export default function AchievementsOverlay() {
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const showToast = useGameStore(state => state.showToast);

  const handleClaim = async (badgeId: string) => {
    setClaimingId(badgeId);
    try {
      const res = await unlockGameAchievement(badgeId);
      if (res.success) {
        setClaimedIds(prev => [...prev, badgeId]);
        showToast(res.alreadyUnlocked ? 'Badge already unlocked!' : 'Unlocked Achievement! +50 Site Coins added to account!');
      } else {
        showToast('Failed to claim badge: ' + res.error);
      }
    } catch (err: any) {
      showToast('Error claiming badge: ' + err?.message);
    }
    setClaimingId(null);
  };

  return (
    <RpgPanel title="ACHIEVEMENTS & BADGES" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex flex-col gap-4 h-full font-mono text-xs overflow-hidden">
        
        {/* Header Summary */}
        <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <span className="font-bold text-white text-xs">COMMUNITY BADGES & REWARDS</span>
              <p className="text-[10px] text-slate-400">Claim site Coins & platform XP directly into your Saints Gaming account!</p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded font-bold uppercase">
            SITE SYNC
          </span>
        </div>

        {/* Player Info */}
        {player && (
          <div className="px-3 py-2 bg-slate-900/40 border border-slate-800 rounded-xl text-[10px] text-slate-400 font-mono flex items-center gap-3">
            <span>TRAINER: <span className="text-cyan-300 font-bold">{player.name || 'Unknown'}</span></span>
            <span>LEVEL: <span className="text-amber-300 font-bold">{player.level || 1}</span></span>
            <span>DAEMONS: <span className="text-purple-300 font-bold">{player.caughtDaemons?.length || 0}</span></span>
          </div>
        )}

        {/* Achievement List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {GAME_ACHIEVEMENTS.map(ach => {
            const isClaimed = claimedIds.includes(ach.id);
            const isClaiming = claimingId === ach.id;

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  isClaimed
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{ach.title}</span>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-800 text-cyan-300 border border-slate-700 rounded uppercase font-bold">
                      {ach.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{ach.desc}</p>

                  <div className="flex gap-3 text-[10px] font-bold text-amber-400 mt-1">
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> +{ach.rewardCoins} Coins</span>
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> +{ach.rewardXp} Platform XP</span>
                  </div>
                </div>

                <button
                  onClick={() => handleClaim(ach.id)}
                  disabled={isClaiming || isClaimed}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    isClaimed
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/60 cursor-default'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                  }`}
                >
                  {isClaimed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      UNLOCKED
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      {isClaiming ? 'CLAIMING...' : 'CLAIM REWARD'}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </RpgPanel>
  );
}
