'use client';

import React from 'react';
import {
  Gamepad2,
  Boxes,
  Eye,
  Camera,
  Layers,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Swords,
  Shield,
  Compass,
} from 'lucide-react';

export interface GameDefinitionData {
  name: string;
  description: string;
  genre: 'CREATURE_MMO' | 'CLASSIC_MMO';
  style: 'SAINTS_HYBRID' | 'REAL_TIME' | 'TURN_BASED';
  camera: 'ISOMETRIC_25D' | 'TOP_DOWN';
  defaultBlockSizePx: number; // 16, 32, 64, 128, 256
}

interface GameDefinitionStepProps {
  data: GameDefinitionData;
  onChange: (updates: Partial<GameDefinitionData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const BLOCK_RESOLUTION_OPTIONS = [
  { size: 16, label: '16px Block', desc: 'Micro voxel detail (High density)' },
  { size: 32, label: '32px Block', desc: 'Classic retro pixel block scale' },
  { size: 64, label: '64px Block', desc: 'Saints Standard (Recommended)', recommended: true },
  { size: 128, label: '128px Block', desc: 'High-res large block aesthetic' },
  { size: 256, label: '256px Block', desc: 'Stylized low-poly chunky' },
];

export function GameDefinitionStep({ data, onChange, onNext, onBack }: GameDefinitionStepProps) {
  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            2. Game Engine & Identity Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure your 3D voxel engine specifications, game name, and vantage perspective.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. GAME NAME & DESCRIPTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
              Game Title <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Saints Adventure, Realm of Elyria"
              className="w-full bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-3 py-2 text-white text-xs outline-none transition font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
              Game Genre & Ruleset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: 'CREATURE_MMO',
                  name: 'Creature Battler',
                  icon: Sparkles,
                },
                {
                  id: 'CLASSIC_MMO',
                  name: 'Classic Hero MMO',
                  icon: Swords,
                },
              ].map((g) => {
                const Icon = g.icon;
                const isSelected = data.genre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onChange({ genre: g.id as any })}
                    className={`p-2 rounded-lg border text-left transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                        : 'bg-[#050b14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold truncate">{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. DESCRIPTION */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
            World Overview / Description
          </label>
          <input
            type="text"
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A brief overview of your world lore, game mechanics, and player objectives..."
            className="w-full bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-3 py-2 text-white text-xs outline-none transition font-sans"
          />
        </div>

        {/* 3. 3D VOXEL BLOCK RESOLUTION */}
        <div className="p-3.5 rounded-xl bg-[#070e1b] border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
                <Boxes className="w-3.5 h-3.5 text-amber-400" />
                3D Voxel Block Resolution Scale
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Defines the physical pixel unit size for world voxel blocks in the Babylon 3D engine.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
              {data.defaultBlockSizePx || 64}px
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BLOCK_RESOLUTION_OPTIONS.map((opt) => {
              const isSelected = (data.defaultBlockSizePx || 64) === opt.size;
              return (
                <button
                  key={opt.size}
                  type="button"
                  onClick={() => onChange({ defaultBlockSizePx: opt.size })}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                      : 'bg-[#050b14] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs font-bold">{opt.size}px</span>
                    {opt.recommended && (
                      <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-black">
                        Std
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight line-clamp-2">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. CAMERA & VANTAGE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              3D Camera Perspective
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: 'ISOMETRIC_25D',
                  name: '2.5D Angled View',
                  desc: 'Classic angled perspective',
                  icon: Compass,
                },
                {
                  id: 'TOP_DOWN',
                  name: 'Top-Down Ortho',
                  desc: 'Direct overhead view',
                  icon: Eye,
                },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = data.camera === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange({ camera: c.id as any })}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-[#050b14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs text-white">
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      {c.name}
                    </div>
                    <span className="text-[10px] text-slate-400">{c.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              Combat Engine Flow
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'SAINTS_HYBRID',
                  name: 'Real-Time Hybrid',
                  desc: 'Action movement with pacing',
                },
                {
                  id: 'ACTION',
                  name: 'Action Combat',
                  desc: 'Fast-paced direct control',
                },
                {
                  id: 'TURN_BASED',
                  name: 'Turn-Based Classic',
                  desc: 'Discrete strategic turns',
                },
              ].map((s) => {
                const isSelected = data.style === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChange({ style: s.id as any })}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-[#050b14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold text-xs text-white mb-1">{s.name}</span>
                    <span className="text-[10px] text-slate-400">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
          disabled={!data.name.trim()}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-mono font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 cursor-pointer shadow-md shadow-amber-600/20"
        >
          Continue to Requirements
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
