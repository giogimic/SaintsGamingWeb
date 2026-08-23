'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Sparkles,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Info,
  Hammer,
} from 'lucide-react';
import type { SetupStatus } from '@/shared/game/setup/setupDetection';

// Steps
import { SetupModeSelection } from './steps/SetupModeSelection';
import { GameDefinitionStep, type GameDefinitionData } from './steps/GameDefinitionStep';
import { GameRequirementsStep } from './steps/GameRequirementsStep';
import { EntitySetupStep, type SetupCharacterData, type SetupCreatureData } from './steps/EntitySetupStep';
import { EnvironmentSetupStep, type SetupEnvironmentData } from './steps/EnvironmentSetupStep';
import { StartingMapStep, type SetupStartingMapData } from './steps/StartingMapStep';
import { FinalReviewStep } from './steps/FinalReviewStep';

export function GameInitializationWizard() {
  const router = useRouter();

  // Wizard Navigation
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [canSetup, setCanSetup] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── WIZARD FORM STATE ───

  // 1. Game Identity
  const [gameDefinition, setGameDefinition] = useState<GameDefinitionData>({
    name: 'Saints Adventure',
    description: 'A 2.5D multiplayer MMO world filled with quests, monsters, and player creation.',
    genre: 'CREATURE_MMO',
    style: 'ACTION_REALTIME',
    camera: 'ISOMETRIC_25D',
  });

  // 2. Characters & Creatures
  const [characters, setCharacters] = useState<SetupCharacterData[]>([
    {
      slug: 'knight_commander',
      name: 'Knight Commander',
      classId: 'WARRIOR',
      spriteKey: 'evil-berserker-bloodaxe-male',
      flavor: 'Frontline champion with high fortitude.',
      tag: 'Primary Hero',
      tagColor: '#f87171',
      assetType: 'SPRITE_SHEET',
    },
  ]);

  const [creatures, setCreatures] = useState<SetupCreatureData[]>([
    {
      slug: 'ignis_drake',
      name: 'Ignis Drake',
      typePrimary: 'Solar',
      spriteOverworld: 'monster/battle/agnite-sheet',
      spriteBattle: 'monster/battle/agnite-sheet',
      baseHp: 100,
      physicalPower: 14,
      physicalDefense: 10,
      abilityPower: 12,
      abilityDefense: 10,
      flavor: 'A fiery starter dragon with high burst damage.',
    },
  ]);

  // 3. Environment & Default Tile
  const [environment, setEnvironment] = useState<SetupEnvironmentData>({
    enabledCategories: ['terrain', 'nature', 'structures', 'furniture'],
    defaultGroundGid: 17, // Solid George Grass
  });

  // 4. Starting Map & Spawn
  const [startingMap, setStartingMap] = useState<SetupStartingMapData>(() => {
    const w = 24;
    const h = 24;
    const defaultGid = 17;
    const grid = Array.from({ length: h }, (_, r) =>
      Array.from({ length: w }, (_, c) => (r === 0 || r === h - 1 || c === 0 || c === w - 1 ? 1 : 0))
    );
    const tileLayers = [
      {
        name: 'Ground',
        grid: Array.from({ length: h }, () => Array.from({ length: w }, () => defaultGid)),
      },
    ];

    return {
      id: 'STARTING_MEADOW',
      name: 'Starting Meadow',
      width: w,
      height: h,
      grid,
      tileLayers,
      spawnPoint: { x: Math.floor(w / 2), y: Math.floor(h / 2) },
    };
  });

  // Fetch initial setup status
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const res = await fetch('/api/setup/status');
        if (!res.ok) throw new Error('Failed to load setup status');
        const data = await res.json();
        setSetupStatus(data.status);
        setCanSetup(data.canSetup);
        setAuthenticatedUser(data.authenticatedUser);

        if (data.status?.gameName) {
          setGameDefinition((prev) => ({
            ...prev,
            name: data.status.gameName,
            description: data.status.gameDescription || prev.description,
          }));
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error checking server state');
      } finally {
        setLoading(false);
      }
    }
    void fetchStatus();
  }, []);

  const handleCompleteSuccess = (defaultMapId: string) => {
    router.push('/studio');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white tracking-wide">Checking Game State...</h2>
        <p className="text-sm text-slate-400 mt-2">Checking database schema and game initialization status</p>
      </div>
    );
  }

  if (!canSetup && setupStatus?.userCount && setupStatus.userCount > 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Administrator Access Required</h2>
          <p className="text-sm text-slate-300 mb-6">
            Game Setup is restricted to server administrators and game developers.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const STEP_LABELS = [
    { num: 0, label: 'Mode' },
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Requirements' },
    { num: 3, label: 'Entities' },
    { num: 4, label: 'Environment' },
    { num: 5, label: 'Starting Map' },
    { num: 6, label: 'Review' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/60 via-slate-900/80 to-amber-950/40 border border-purple-500/20 p-8 md:p-10 mb-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Game Initialization
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Saints <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">Game Setup</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl">
              Initialize a new game experience inside Saints. Define game rules, configure starting characters, and author your initial starting map.
            </p>
          </div>

          {/* STEP INDICATOR */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-2xl overflow-x-auto">
            {STEP_LABELS.map(({ num, label }) => (
              <div key={num} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (num < step) setStep(num);
                  }}
                  disabled={num > step}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                    step === num
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/30 scale-105'
                      : step > num
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                  }`}
                  title={label}
                >
                  {step > num ? <CheckCircle2 className="w-3.5 h-3.5" /> : num + 1}
                </button>
                {num < 6 && <div className={`w-2 h-0.5 ${step > num ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* UPDATED SERVER / EXISTING DATA NOTICE */}
      {setupStatus && !setupStatus.isFreshInstall && (
        <div className="mb-8 p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-base">Existing Game Detected</h3>
              <p className="text-sm text-slate-300">
                This installation already has <span className="text-amber-300 font-semibold">{setupStatus.mapCount} active maps</span> and existing game configuration. Game setup is non-blocking and will preserve all your live world data.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => router.push('/studio')}
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-purple-600/30 border border-purple-500/40 hover:bg-purple-600/50 text-purple-200 text-sm font-semibold transition cursor-pointer"
            >
              Enter Studio
            </button>
            <button
              onClick={() => router.push('/lobby')}
              className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Play Game
            </button>
          </div>
        </div>
      )}

      {/* STEP 0: MODE SELECTION */}
      {step === 0 && (
        <SetupModeSelection onSelectFresh={() => setStep(1)} />
      )}

      {/* STEP 1: GAME QUESTIONS */}
      {step === 1 && (
        <GameDefinitionStep
          data={gameDefinition}
          onChange={(updates) => setGameDefinition((prev) => ({ ...prev, ...updates }))}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {/* STEP 2: REQUIREMENTS SUMMARY */}
      {step === 2 && (
        <GameRequirementsStep
          gameDefinition={gameDefinition}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {/* STEP 3: CHARACTERS & CREATURES */}
      {step === 3 && (
        <EntitySetupStep
          gameDefinition={gameDefinition}
          characters={characters}
          creatures={creatures}
          onUpdateCharacters={setCharacters}
          onUpdateCreatures={setCreatures}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* STEP 4: ENVIRONMENT TILES & DEFAULT FILL */}
      {step === 4 && (
        <EnvironmentSetupStep
          environment={environment}
          onChange={(updates) => setEnvironment((prev) => ({ ...prev, ...updates }))}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}

      {/* STEP 5: STARTING MAP & SPAWN */}
      {step === 5 && (
        <StartingMapStep
          environment={environment}
          startingMap={startingMap}
          onChange={setStartingMap}
          onNext={() => setStep(6)}
          onBack={() => setStep(4)}
        />
      )}

      {/* STEP 6: FINAL REVIEW & TRANSACTION-SAFE SUBMIT */}
      {step === 6 && (
        <FinalReviewStep
          gameDefinition={gameDefinition}
          characters={characters}
          creatures={creatures}
          environment={environment}
          startingMap={startingMap}
          onBack={() => setStep(5)}
          onCompleteSuccess={handleCompleteSuccess}
        />
      )}
    </div>
  );
}
