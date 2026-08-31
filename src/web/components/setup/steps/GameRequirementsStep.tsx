'use client';

import React from 'react';
import { Layers, User, Sparkles, Box, MapPin, Compass, CheckCircle2, ArrowRight, ArrowLeft, Info } from 'lucide-react';
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
      minCount: '1+',
      description: 'At least one playable hero archetype (Knight, Mage, Ranger, etc.). You can create multiple characters.',
      required: true,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
    },
    ...(isCreatureGame
      ? [
          {
            icon: Sparkles,
            title: 'Companion Creature(s)',
            minCount: '1+',
            description: 'At least one catchable companion creature with elemental typing and combat stats.',
            required: true,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10 border-emerald-500/30',
          },
        ]
      : []),
    {
      icon: Box,
      title: 'Environment Tiles',
      minCount: '1+',
      description: 'Terrain and decorative tiles for painting maps (grass, dirt, water, stone, props).',
      required: true,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/30',
    },
    {
      icon: Layers,
      title: 'Default Fill Tile',
      minCount: '1',
      description: 'A primary base tile (e.g. Grass or Stone) used as the canvas background when creating new maps.',
      required: true,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30',
    },
    {
      icon: Compass,
      title: 'Starting Map & Player Spawn',
      minCount: '1',
      description: 'A starting zone with custom dimensions and a designated player spawn coordinate.',
      required: true,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/30',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-amber-400" />
              2. Content Requirements Summary
            </h2>
            <p className="text-sm text-slate-400">
              Based on your selection for <strong className="text-white">{gameDefinition.name}</strong>, here is what your game needs.
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono text-amber-300">
            Genre: {gameDefinition.genre}
          </div>
        </div>

        {/* NOTICE ABOUT MINIMUM VS MAXIMUM */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Required count is a minimum, not a limit.</span>
            <p className="text-amber-300/80 mt-0.5">
              The setup flow will guide you through satisfying the required minimums, but you are free to add as many characters, creatures, and tiles as you want.
            </p>
          </div>
        </div>

        {/* REQUIREMENTS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requirements.map((req, idx) => {
            const Icon = req.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${req.bgColor}`}>
                  <Icon className={`w-5 h-5 ${req.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-white text-sm truncate">{req.title}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-emerald-500/20">
                      Req: {req.minCount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{req.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-xl shadow-amber-500/20 transition cursor-pointer"
        >
          Start Creating Content
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
