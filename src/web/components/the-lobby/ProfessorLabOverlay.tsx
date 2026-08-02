'use client';

import React, { useState } from 'react';
import { useGameStore } from './store';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { TEST_CREATURE, testCreatureSpriteUrl } from '@/shared/game/testCreature';

export default function ProfessorLabOverlay({ onClose }: { onClose: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  const showToast = useGameStore(state => state.showToast);

  const handleClaimStarter = () => {
    if (confirming) return;
    setConfirming(true);
    // Server persists real PlayerCreature (Rockitten) — no client-only fake starter
    emitSocketEvent?.('claim_starter', { speciesSlug: TEST_CREATURE.slug });
    showToast(`Requesting ${TEST_CREATURE.name}...`);
    // Overlay closes when starter_claimed arrives (or after short fallback)
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm uppercase tracking-widest font-bold">
            <Sparkles className="w-5 h-5" /> PROFESSOR OAKWOOD&apos;S RESEARCH LAB
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">YOUR STARTER COMPANION</h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            MPV testing uses one Tuxemon species — <strong className="text-white">{TEST_CREATURE.name}</strong> —
            for both turn-based capture battles and real-time overworld combat.
          </p>
        </div>

        <div className="p-4 rounded-xl border-2 border-emerald-400 bg-slate-800 shadow-[0_0_20px_rgba(16,185,129,0.3)] space-y-4">
          <div className="w-28 h-28 bg-black/80 rounded-xl mx-auto flex items-center justify-center border border-slate-700 overflow-hidden">
            <img
              src={testCreatureSpriteUrl('overworld')}
              alt={TEST_CREATURE.name}
              className="max-w-full max-h-full object-contain pixelated"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/game-assets/daemon_data.png';
              }}
            />
          </div>
          <h3 className="font-bold text-center text-white text-lg">{TEST_CREATURE.name}</h3>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            {TEST_CREATURE.description}
          </p>
          <div className="pt-3 border-t border-slate-700 text-[10px] space-y-1 text-slate-300">
            <div className="flex justify-between"><span>HP</span><strong>{TEST_CREATURE.maxHp}</strong></div>
            <div className="flex justify-between"><span>Level</span><strong>{TEST_CREATURE.level}</strong></div>
            <div className="flex justify-between"><span>Power</span><strong>{TEST_CREATURE.stats.physicalPower}</strong></div>
            <div className="flex justify-between"><span>Defense</span><strong>{TEST_CREATURE.stats.physicalDefense}</strong></div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-slate-800 pt-4">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white font-bold">
            CANCEL
          </button>
          
          <button
            onClick={handleClaimStarter}
            disabled={confirming}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all uppercase tracking-wider"
          >
            <CheckCircle2 className="w-4 h-4" />
            {confirming ? 'CLAIMING…' : `CLAIM ${TEST_CREATURE.name.toUpperCase()}`}
          </button>
        </div>

      </div>
    </div>
  );
}
