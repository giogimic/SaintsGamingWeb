'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Gamepad2,
  Hammer,
  Loader2,
  ShieldAlert,
  User,
  Sparkles,
  Layers,
  Compass,
  MapPin,
  ArrowLeft,
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
          defaultGroundGid: environment.defaultGroundGid,
        },
        startingMap: {
          id: startingMap.id,
          name: startingMap.name,
          width: startingMap.width,
          height: startingMap.height,
          grid: startingMap.grid,
          tileLayers: startingMap.tileLayers,
          spawnPoint: startingMap.spawnPoint,
          tilesetAsset: startingMap.tilesetAsset,
        },
      };

      const res = await fetch('/api/setup/initialize-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize game');
      }

      setPersistedMapId(data.defaultMapId || startingMap.id);
      setCompleted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Game initialization failed');
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 md:p-12 backdrop-blur-xl text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            {gameDefinition.name} Initialized!
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Your game configuration, starting characters, and initial map have been successfully persisted.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-left space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">Game Name:</span>
            <span className="text-white font-semibold">{gameDefinition.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Starting Map:</span>
            <span className="text-amber-300 font-semibold">{persistedMapId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Player Characters:</span>
            <span className="text-emerald-300 font-semibold">{characters.length} Registered</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Spawn Point:</span>
            <span className="text-cyan-300 font-semibold">
              X={startingMap.spawnPoint.x}, Y={startingMap.spawnPoint.y}
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onCompleteSuccess(persistedMapId)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition cursor-pointer"
          >
            <Hammer className="w-4 h-4" />
            Launch World Studio
          </button>

          <button
            onClick={() => {
              window.location.href = '/lobby';
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            Enter Multiplayer Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            6. Final Review & Initialization
          </h2>
          <p className="text-sm text-slate-400">
            Review the persisted configuration before finalizing. All assets and map definitions will be registered immediately.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GAME IDENTITY */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Game Identity
            </div>
            <div className="text-base font-bold text-white">{gameDefinition.name}</div>
            <div className="text-xs text-slate-400">{gameDefinition.description}</div>
            <div className="text-[11px] text-slate-400 pt-1">
              Genre: <span className="text-slate-200 font-semibold">{gameDefinition.genre}</span> · Style:{' '}
              <span className="text-amber-300 font-semibold">
                {gameDefinition.style === 'SAINTS_HYBRID'
                  ? 'Saints Hybrid Combat (Real-time + Turn-based)'
                  : gameDefinition.style === 'ACTION_REALTIME'
                  ? 'Real-Time Action'
                  : gameDefinition.style === 'TURN_BASED'
                  ? 'Turn-Based Tactics'
                  : 'Narrative & Exploration'}
              </span>
            </div>
          </div>

          {/* PLAYER CHARACTERS */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              Characters ({characters.length})
            </div>
            <div className="space-y-1">
              {characters.map((c) => (
                <div key={c.slug} className="text-xs flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-white">{c.name}</span>
                  <span className="text-slate-400 font-mono">{c.classId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ENVIRONMENT TILES & DEFAULT */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Environment & Default Tile
            </div>
            <div className="text-xs text-slate-300">
              Default Fill Tile GID: <strong className="text-white">{environment.defaultGroundGid}</strong>
            </div>
            <div className="text-xs text-slate-400">
              Enabled Categories: {environment.enabledCategories.join(', ')}
            </div>
          </div>

          {/* STARTING MAP & SPAWN */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Starting Zone & Spawn
            </div>
            <div className="text-xs text-slate-300">
              Map Name: <strong className="text-white">{startingMap.name}</strong> ({startingMap.id})
            </div>
            <div className="text-xs text-slate-300">
              Dimensions: {startingMap.width} × {startingMap.height} tiles
            </div>
            <div className="text-xs text-cyan-300 font-mono flex items-center gap-1.5 pt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              Spawn Point: X={startingMap.spawnPoint.x}, Y={startingMap.spawnPoint.y}
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handleInitializeGame}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl font-extrabold text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/30 transition disabled:opacity-50 cursor-pointer text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Initializing Your Game...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Create & Initialize Game
            </>
          )}
        </button>
      </div>
    </div>
  );
}
