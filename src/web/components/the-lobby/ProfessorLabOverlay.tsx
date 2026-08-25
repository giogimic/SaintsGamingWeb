'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from './store';
import { Sparkles, CheckCircle2, FlaskConical, Shield, Zap, Heart, Sword, X } from 'lucide-react';
import { getActiveStarterCreatures } from '@/app/actions/creature-defs';
import { soundSynth } from '@/engine/sound-synth';
import {
  CreatureDefData,
  creatureAssetUrl,
} from '@/shared/game/creatureCatalog';

function listFallbackStarters(): CreatureDefData[] {
  return [];
}

export default function ProfessorLabOverlay({ onClose }: { onClose: () => void }) {
  const [starters, setStarters] = useState<CreatureDefData[]>(listFallbackStarters());
  const [selected, setSelected] = useState<CreatureDefData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const showToast = useGameStore((state) => state.showToast);
  const gameMode = useGameStore((state) => state.gameMode);

  useEffect(() => {
    void getActiveStarterCreatures().then((res) => {
      if (res.success && res.data.length > 0) {
        setStarters(res.data);
        setSelected(res.data[0]);
      }
    });
  }, []);

  // Close when server confirms claim (index.tsx sets EXPLORING on starter_claimed)
  useEffect(() => {
    if (confirming && gameMode !== 'PROFESSOR_LAB') {
      onClose();
    }
  }, [confirming, gameMode, onClose]);

  // Safety timeout if socket never answers
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => {
      setConfirming(false);
      showToast('Claim timed out — try again or check connection.');
    }, 8000);
    return () => clearTimeout(t);
  }, [confirming, showToast]);

  const handleClaim = () => {
    if (!selected || confirming) return;
    soundSynth?.playLevelUpSound?.();
    setConfirming(true);
    emitSocketEvent?.('claim_starter', { speciesSlug: selected.slug });
    showToast(`Commencing bonding sequence with ${selected.name}...`);
  };

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundSynth?.playSelectSound?.();
        onClose();
      } else if (e.key === 'Enter' && selected && !confirming) {
        handleClaim();
      } else if (['1', '2', '3'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (starters[idx]) {
          soundSynth?.playSelectSound?.();
          setSelected(starters[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [starters, selected, confirming, onClose]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md font-mono select-none animate-in fade-in">
      <div 
        className="w-full max-w-4xl p-[1px] bg-gradient-to-r from-emerald-500/60 via-cyan-500/50 to-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.25)]"
        style={{
          clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
        }}
      >
        <div 
          className="w-full h-full bg-[#04090e]/95 p-6 sm:p-7 space-y-6"
          style={{
            clipPath: 'polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px)',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-emerald-500/20 pb-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-widest font-bold">
                <FlaskConical className="w-4 h-4" /> PROFESSOR OAKWOOD&apos;S RESEARCH SANCTUARY
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mt-1">
                SELECT YOUR COMPANION
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose one soul-bonded starter companion to accompany your journey across the realm.
              </p>
            </div>

            <button 
              onClick={() => {
                soundSynth?.playSelectSound?.();
                onClose();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Starter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {starters.map((c, idx) => {
              const isSelected = selected?.slug === c.slug;
              const defaultPassive = c.passives.find((p) => p.isDefault) || c.passives[0];
              return (
                <div
                  key={c.slug}
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    setSelected(c);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]'
                      : 'border-slate-800 bg-black/50 hover:border-slate-600 hover:bg-black/70'
                  }`}
                  style={{
                    clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
                  }}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono"
                        style={{ backgroundColor: `${c.tagColor}33`, color: c.tagColor }}
                      >
                        {c.typePrimary}
                        {c.typeSecondary !== 'None' ? ` / ${c.typeSecondary}` : ''}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">[{idx + 1}]</span>
                    </div>

                    <div className="w-24 h-24 bg-black/80 rounded-xl mx-auto flex items-center justify-center border border-slate-800 mb-3 overflow-hidden shadow-inner">
                      <img
                        src={creatureAssetUrl(c.spriteOverworld || c.spriteBattle)}
                        alt={c.name}
                        className="max-w-full max-h-full object-contain pixelated transition-transform hover:scale-110"
                      />
                    </div>

                    <h3 className="font-black text-center text-white text-base tracking-wide">{c.name}</h3>
                    <p className="text-[10px] text-slate-400 text-center mt-1 leading-relaxed line-clamp-2">{c.flavor}</p>
                  </div>

                  {/* Stat Metrics */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-300 space-y-1.5 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-400 flex items-center gap-1"><Heart className="w-3 h-3" /> HP</span>
                      <strong>{c.baseHp}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-400 flex items-center gap-1"><Sword className="w-3 h-3" /> Power</span>
                      <strong>{c.physicalPower}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sky-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Defense</span>
                      <strong>{c.physicalDefense}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Tempo</span>
                      <strong>{c.combatTempo}</strong>
                    </div>
                    {defaultPassive && (
                      <div className="text-emerald-400/90 pt-1.5 border-t border-slate-800/50 text-[9px] leading-tight">
                        <strong>{defaultPassive.name}:</strong> {defaultPassive.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center border-t border-emerald-500/20 pt-4">
            <button 
              onClick={() => {
                soundSynth?.playSelectSound?.();
                onClose();
              }} 
              className="text-xs text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
            >
              [ESC] CANCEL
            </button>

            <button
              onClick={handleClaim}
              disabled={!selected || confirming}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95 cursor-pointer border border-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirming ? 'BONDING COMPANION…' : selected ? `BOND WITH ${selected.name.toUpperCase()} [ENTER]` : 'SELECT A STARTER'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

