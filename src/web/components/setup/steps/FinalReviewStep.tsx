'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Gamepad2,
  Boxes,
  Loader2,
  ShieldAlert,
  User,
  Sparkles,
  Layers,
  Compass,
  ArrowLeft,
  ArrowRight,
  Sun,
  Shield,
  Zap,
} from 'lucide-react';
import type { GameDefinitionData } from './GameDefinitionStep';
import type { SetupCharacterData, SetupCreatureData } from './EntitySetupStep';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';
import type { SetupStartingMapData } from './StartingMapStep';

interface FinalReviewStepProps {
  gameDefinition: GameDefinitionData;
  characters: SetupCharacterData[];
  creatures: SetupCreatureData[];
  environment: SetupEnvironmentData;
  startingMap: SetupStartingMapData;
  onBack: () => void;
  onCompleteSuccess: (defaultMapId: string) => void;
}

export function FinalReviewStep({
  gameDefinition,
  characters,
  creatures,
  environment,
  startingMap,
  onBack,
  onCompleteSuccess,
}: FinalReviewStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [persistedMapId, setPersistedMapId] = useState('STARTING_MEADOW');

  const handleInitializeGame = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        game: {
          name: gameDefinition.name,
          description: gameDefinition.description,
          genre: gameDefinition.genre,
          style: gameDefinition.style,
          camera: gameDefinition.camera,
          defaultBlockSizePx: gameDefinition.defaultBlockSizePx || 64,
        },
        characters: characters.map((c) => ({
          slug: c.slug,
          name: c.name,
          classId: c.classId,
          spriteKey: c.spriteKey,
          spriteBundleId: c.spriteBundleId,
          flavor: c.flavor,
          tag: c.tag,
          tagColor: c.tagColor,
        })),
        creatures: creatures.map((c) => ({
          slug: c.slug,
          name: c.name,
          typePrimary: c.typePrimary,
          spriteOverworld: c.spriteOverworld,
          spriteBattle: c.spriteBattle,
          baseHp: c.baseHp,
          physicalPower: c.physicalPower,
          physicalDefense: c.physicalDefense,
          abilityPower: c.abilityPower,
          abilityDefense: c.abilityDefense,
          flavor: c.flavor,
        })),
        environment: {
          defaultBlockSizePx: gameDefinition.defaultBlockSizePx || 64,
          foundationMaterial: startingMap.foundationMaterial,
          atmospherePreset: environment.atmospherePreset,
        },
        startingMap: {
          id: startingMap.id,
          name: startingMap.name,
          widthChunks: startingMap.widthChunks || 2,
          depthChunks: startingMap.depthChunks || 2,
          heightChunks: startingMap.heightChunks || 1,
          width: (startingMap.widthChunks || 2) * 16,
          height: (startingMap.depthChunks || 2) * 16,
          blockSizePx: gameDefinition.defaultBlockSizePx || 64,
          foundationMaterial: startingMap.foundationMaterial,
          topologyArchetype: startingMap.topologyArchetype,
          spawnPoint: startingMap.spawnPoint,
          gates: startingMap.gates,
          mapType: startingMap.mapType || 'VOXEL',
        },
      };

      const res = await fetch('/api/setup/initialize-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize 3D Voxel game');
      }

      setCompleted(true);
      const defaultId = data.startingMapId || startingMap.id || 'STARTING_MEADOW';
      setPersistedMapId(defaultId);

      setTimeout(() => {
        onCompleteSuccess(defaultId);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during world initialization.');
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="text-center py-10 space-y-4 font-mono">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-widest sg-text-gradient">
          3D Voxel World Initialized!
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Generated starting realm <strong className="text-white">{startingMap.name}</strong> ({startingMap.id}). Redirecting to Saints Studio...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            7. Final Review & World Deployment
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review your world parameters and initialize the 3D Voxel foundation.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4 SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg bg-[#070e1b] border border-slate-800/80">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-0.5">Game Title</span>
          <span className="text-xs font-bold text-white truncate block">{gameDefinition.name}</span>
          <span className="text-[10px] font-mono text-amber-400">{gameDefinition.defaultBlockSizePx || 64}px Blocks</span>
        </div>

        <div className="p-3 rounded-lg bg-[#070e1b] border border-slate-800/80">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-0.5">Heroes & Beasts</span>
          <span className="text-xs font-bold text-white block">
            {characters.length} Heroes · {creatures.length} Beasts
          </span>
          <span className="text-[10px] font-mono text-emerald-400">Class & Type Configured</span>
        </div>

        <div className="p-3 rounded-lg bg-[#070e1b] border border-slate-800/80">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-0.5">Atmosphere</span>
          <span className="text-xs font-bold text-white capitalize block">{environment.atmospherePreset}</span>
          <span className="text-[10px] font-mono text-sky-400">{environment.enabledMaterialSets?.length || 4} Material Sets</span>
        </div>

        <div className="p-3 rounded-lg bg-[#070e1b] border border-slate-800/80">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-0.5">3D Starting Realm</span>
          <span className="text-xs font-bold text-white block">
            {(startingMap.widthChunks || 2) * 16}x{(startingMap.depthChunks || 2) * 16} Blocks
          </span>
          <span className="text-[10px] font-mono text-purple-400 capitalize">{startingMap.mapType || 'VOXEL'} Engine Mode</span>
        </div>
      </div>

      {/* DETAILED SUMMARY ACCORDION */}
      <div className="p-3.5 rounded-xl bg-[#070e1b] border border-slate-800/80 space-y-2.5 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1.5">
          <Boxes className="w-3.5 h-3.5" />
          Deployment Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
          <div className="flex items-center justify-between p-2 rounded bg-[#050b14] border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-400">Voxel Engine Resolution:</span>
            <span className="text-amber-300 font-bold">{gameDefinition.defaultBlockSizePx || 64}px / Voxel Block</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#050b14] border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-400">Camera Vantage:</span>
            <span className="text-white font-bold">{gameDefinition.camera === 'ISOMETRIC_25D' ? '2.5D Angled' : 'Top-Down Ortho'}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#050b14] border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-400">Spawn Coordinates:</span>
            <span className="text-sky-300 font-bold">
              X: {startingMap.spawnPoint?.x || 16}, Y: {startingMap.spawnPoint?.y || 16}, Z: 16
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-[#050b14] border border-slate-800 font-mono text-[11px]">
            <span className="text-slate-400">Gateways Configured:</span>
            <span className="text-teal-400 font-bold">{startingMap.gates?.length || 1} Gateways Named</span>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <button
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={handleInitializeGame}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-mono font-bold text-xs bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 transition disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Initializing 3D World...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Launch Game & Open Studio
            </>
          )}
        </button>
      </div>
    </div>
  );
}
