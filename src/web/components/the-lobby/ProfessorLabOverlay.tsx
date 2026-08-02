'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from './store';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { getActiveStarterCreatures } from '@/app/actions/creature-defs';
import {
  CreatureDefData,
  creatureAssetUrl,
  listFallbackStarters,
} from '@/shared/game/creatureCatalog';

export default function ProfessorLabOverlay({ onClose }: { onClose: () => void }) {
  const [starters, setStarters] = useState<CreatureDefData[]>(listFallbackStarters());
  const [selected, setSelected] = useState<CreatureDefData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const showToast = useGameStore((state) => state.showToast);

  useEffect(() => {
    void getActiveStarterCreatures().then((res) => {
      if (res.success && res.data.length > 0) setStarters(res.data);
    });
  }, []);

  const handleClaim = () => {
    if (!selected || confirming) return;
    setConfirming(true);
    emitSocketEvent?.('claim_starter', { speciesSlug: selected.slug });
    showToast(`Requesting ${selected.name}...`);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm uppercase tracking-widest font-bold">
            <Sparkles className="w-5 h-5" /> PROFESSOR OAKWOOD&apos;S RESEARCH LAB
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">CHOOSE YOUR STARTER</h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            One companion per journey. Catalog-driven — add more in Studio → Creatures.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {starters.map((c) => {
            const isSelected = selected?.slug === c.slug;
            const defaultPassive = c.passives.find((p) => p.isDefault) || c.passives[0];
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setSelected(c)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                    style={{ backgroundColor: `${c.tagColor}33`, color: c.tagColor }}
                  >
                    {c.typePrimary}
                    {c.typeSecondary !== 'None' ? ` / ${c.typeSecondary}` : ''}
                  </span>
                </div>
                <div className="w-24 h-24 bg-black/80 rounded-xl mx-auto flex items-center justify-center border border-slate-800 mb-3 overflow-hidden">
                  <img
                    src={creatureAssetUrl(c.spriteOverworld || c.spriteBattle)}
                    alt={c.name}
                    className="max-w-full max-h-full object-contain pixelated"
                  />
                </div>
                <h3 className="font-bold text-center text-white">{c.name}</h3>
                <p className="text-[10px] text-slate-400 text-center mt-1 leading-relaxed">{c.flavor}</p>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-300 space-y-0.5">
                  <div className="flex justify-between"><span>HP</span><strong>{c.baseHp}</strong></div>
                  <div className="flex justify-between"><span>Power</span><strong>{c.physicalPower}</strong></div>
                  <div className="flex justify-between"><span>Defense</span><strong>{c.physicalDefense}</strong></div>
                  <div className="flex justify-between"><span>Tempo</span><strong>{c.combatTempo}</strong></div>
                  {defaultPassive && (
                    <p className="text-emerald-400/90 pt-1">
                      <strong>{defaultPassive.name}:</strong> {defaultPassive.description}
                    </p>
                  )}
                  {c.worldSkillName && (
                    <p className="text-sky-400/90">
                      World: {c.worldSkillName}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center border-t border-slate-800 pt-4">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white font-bold">
            CANCEL
          </button>
          <button
            onClick={handleClaim}
            disabled={!selected || confirming}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 uppercase tracking-wider"
          >
            <CheckCircle2 className="w-4 h-4" />
            {confirming ? 'CLAIMING…' : selected ? `CLAIM ${selected.name.toUpperCase()}` : 'SELECT A STARTER'}
          </button>
        </div>
      </div>
    </div>
  );
}
