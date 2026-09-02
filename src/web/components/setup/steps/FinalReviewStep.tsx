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
  MapPin,
  ArrowLeft,
  ArrowRight,
  Sun,
  Shield,
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
          spawnPoint: startingMap.spawnPoint,
        },
      };

      const res = await fetch('/api/setup/initialize-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Game initialization failed');
      }

      setPersistedMapId(data.defaultMapId || startingMap.id || 'STARTING_MEADOW');
      setCompleted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Initialization encountered an error');
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="bg-slate-900/90 border border-amber-400/50 rounded-3xl p-8 md:p-12 text-center backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-amber-400/30 animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white">3D Voxel World Deployed!</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
            <span className="font-bold text-amber-300">{gameDefinition.name}</span> has been initialized in MariaDB/MySQL. Starting 3D Voxel Realm is live and synchronized with the GameEngine.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => onCompleteSuccess(persistedMapId)}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-sm font-bold shadow-xl shadow-amber-500/30 transition-all"
          >
            Launch World Studio (Ctrl+E)
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="/lobby"
            className="px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition-all"
          >
            Enter Multiplayer Realm
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Review & Deploy 3D Voxel Realm
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Verify your game settings and starting 3D voxel world configuration before initializing the database.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Game Definition */}
          <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Gamepad2 className="w-4 h-4" />
              Game Identity & Engine
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Title:</span>
                <span className="font-bold text-white">{gameDefinition.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Genre:</span>
                <span className="text-slate-200">{gameDefinition.genre}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Combat Style:</span>
                <span className="text-slate-200">{gameDefinition.style}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Block Scale:</span>
                <span className="font-mono text-amber-400 font-bold">{gameDefinition.defaultBlockSizePx || 64}px</span>
              </div>
            </div>
          </div>

          {/* Card 2: 3D Voxel Starting Realm */}
          <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Boxes className="w-4 h-4" />
              Starting 3D Voxel Realm
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Realm ID:</span>
                <span className="font-mono font-bold text-amber-300">{startingMap.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Volume Dimensions:</span>
                <span className="font-mono text-white">
                  {(startingMap.widthChunks || 2) * 16} × {(startingMap.depthChunks || 2) * 16} × 32 Blocks
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Bedrock Stratum:</span>
                <span className="text-slate-200 capitalize">{startingMap.foundationMaterial || 'gunmetal'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Spawn Beacon:</span>
                <span className="font-mono text-amber-400">({startingMap.spawnPoint.x}, {startingMap.spawnPoint.y}, Y=16)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Starter Characters */}
          <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <User className="w-4 h-4" />
              Starter Heroes ({characters.length})
            </div>
            <div className="space-y-2">
              {characters.map((c) => (
                <div key={c.slug} className="flex items-center justify-between text-xs bg-slate-900/70 px-3 py-2 rounded-xl">
                  <span className="font-bold text-white">{c.name}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{c.classId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Companion Battlers & Atmosphere */}
          <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sun className="w-4 h-4" />
              Creatures & Atmosphere
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Creatures:</span>
                <span className="font-bold text-white">{creatures.length} Starter Battlers</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Atmosphere Preset:</span>
                <span className="text-slate-200 capitalize">{environment.atmospherePreset || 'noon'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Greedy Meshing:</span>
                <span className="text-emerald-400 font-semibold">Enabled (Seamless)</span>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={submitting}
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={handleInitializeGame}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-sm font-bold shadow-xl shadow-amber-500/30 disabled:opacity-50 transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Deploying 3D Voxel World...
            </>
          ) : (
            <>
              Initialize & Deploy Game
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
