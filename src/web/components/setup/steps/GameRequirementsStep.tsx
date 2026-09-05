'use client';

import React from 'react';
import { Layers, User, Sparkles, Box, Compass, ArrowRight, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import type { GameDefinitionData } from './GameDefinitionStep';

interface GameRequirementsStepProps {
  gameDefinition: GameDefinitionData;
  onNext: () => void;
  onBack: () => void;
}

export function GameRequirementsStep({ gameDefinition, onNext, onBack }: GameRequirementsStepProps) {
  const isCreatureGame = gameDefinition.genre === 'CREATURE_MMO';

  const requirements = [
    {
      icon: User,
      title: 'Player Character(s)',
      minCount: '1+ Required',
      description: 'At least one playable hero archetype (Knight, Mage, Ranger, Paladin).',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
    },
    ...(isCreatureGame
      ? [
          {
            icon: Sparkles,
            title: 'Companion Creature(s)',
            minCount: '1+ Required',
            description: 'At least one catchable companion creature with elemental typing and combat stats.',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10 border-emerald-500/30',
          },
        ]
      : []),
    {
      icon: Box,
      title: '3D Voxel Material Sets',
      minCount: '4 Sets',
      description: 'Bedrock foundations, foliage, masonry architecture, and elemental fluid voxels.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/30',
    },
    {
      icon: Compass,
      title: '3D Starting Realm & Spawn',
      minCount: '1 Map',
      description: 'Volumetric starting map volume (e.g. 32x32x32) with a player spawn anchor.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30',
    },
  ];

  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-amber-400" />
            3. Content Requirements Summary
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Overview of foundational content needed to initialize <strong className="text-white">{gameDefinition.name}</strong>.
          </p>
        </div>

        <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300 self-start sm:self-auto">
          Scale: {gameDefinition.defaultBlockSizePx || 64}px Voxels
        </div>
      </div>

      {/* REQUIREMENTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {requirements.map((req, idx) => {
          const Icon = req.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#070e1b] border border-slate-800/80 flex items-start gap-3 justify-between"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg border shrink-0 ${req.bgColor}`}>
                  <Icon className={`w-4 h-4 ${req.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white truncate">{req.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{req.description}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 font-bold shrink-0">
                {req.minCount}
              </span>
            </div>
          );
        })}
      </div>

      {/* HELPER INFO */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2.5 text-xs text-amber-200">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <span>You will be guided through configuring each requirement. You can always add more content in Studio later.</span>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-mono font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition cursor-pointer shadow-md shadow-amber-600/20"
        >
          Continue to Entities
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
