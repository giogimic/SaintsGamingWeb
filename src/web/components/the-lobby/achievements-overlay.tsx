'use client';

import React, { useState } from 'react';
import { HudPanelShell } from './hud/HudPanelShell';
import { useGameStore } from './store';
import { unlockGameAchievement } from '@/app/actions/game';
import { Award, CheckCircle2, Lock, Coins, Sparkles, Trophy } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  rewardCoins: number;
  rewardXp: number;
  category: string;
}

const GAME_ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_capture', title: 'First Companion Bound', desc: 'Capture or claim your first Creature beast companion.', rewardCoins: 50, rewardXp: 100, category: 'Taming' },
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
        soundSynth?.playLevelUpSound?.();
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
    <div className="pointer-events-auto z-40 flex w-[min(95vw,600px)] max-w-full flex-col font-mono text-xs select-none">
      <HudPanelShell 
        title="ACHIEVEMENTS & BADGES" 
        icon={<Award className="w-4 h-4 text-amber-400" />}
        onClose={() => setGameMode('EXPLORING')}
        headerRight={
          <span className="text-[9px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/40 uppercase">
            SITE SYNC
          </span>
        }
      >
        <div className="flex flex-col gap-3.5 h-[68vh] p-3">
          
          {/* Header Summary */}
          <div className="p-3 bg-black/60 border border-purple-500/30 rounded-xl flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="font-bold text-white text-xs">COMMUNITY BADGES & REWARDS</span>
                <p className="text-[10px] text-slate-400">Claim site Coins & platform XP directly into your Saints Gaming account!</p>
              </div>
            </div>
            {player && (
              <span className="text-[9px] text-cyan-300 font-bold bg-black/60 px-2 py-1 rounded border border-slate-800">
                LVL {player.level || 1}
              </span>
            )}
          </div>

          {/* Achievement List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {GAME_ACHIEVEMENTS.map(ach => {
              const isClaimed = claimedIds.includes(ach.id);
              const isClaiming = claimingId === ach.id;

              return (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    isClaimed
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                      : 'bg-black/50 border-slate-800 hover:border-slate-700'
                  }`}
                  style={{
                    clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
                  }}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{ach.title}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-black/60 text-cyan-300 border border-cyan-500/30 rounded uppercase font-bold">
                        {ach.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{ach.desc}</p>

                    <div className="flex gap-3 text-[10px] font-bold text-amber-300 mt-1">
                      <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400" /> +{ach.rewardCoins} Coins</span>
                      <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> +{ach.rewardXp} Platform XP</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaim(ach.id)}
                    disabled={isClaiming || isClaimed}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isClaimed
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50 cursor-default'
                        : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-md border border-amber-400/50 active:scale-95'
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
      </HudPanelShell>
    </div>
  );
}

