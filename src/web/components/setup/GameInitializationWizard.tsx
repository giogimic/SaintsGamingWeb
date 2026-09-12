'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';
import type { SetupStatus } from '@/shared/game/setup/setupDetection';

// New Steps
import { GameIdentityStep, type GameDefinitionData } from './steps/GameIdentityStep';
import { ActorsSetupStep } from './steps/ActorsSetupStep';
import { WorldGenerationStep } from './steps/WorldGenerationStep';
import { PublishReviewStep } from './steps/PublishReviewStep';
import { type SetupStartingMapData } from './steps/StartingMapStep';

export function GameInitializationWizard({ isReinit = false }: { isReinit?: boolean }) {
  const router = useRouter();

  // Wizard Navigation
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [canSetup, setCanSetup] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Game Identity
  const [gameDefinition, setGameDefinition] = useState<GameDefinitionData>({
    name: 'Saints Adventure',
    description: 'A 2.5D multiplayer 3D voxel MMO world filled with quests, monsters, and player creation.',
    genre: 'CREATURE_MMO',
    style: 'SAINTS_HYBRID',
    defaultCameraMode: 'DYNAMIC',
    defaultBlockSizePx: 64,
  });

  // 3. Starting Map (World Generation)
  const [startingMap, setStartingMap] = useState<SetupStartingMapData>(() => ({
    id: 'STARTING_MEADOW',
    name: 'Starting Meadow',
    mapType: 'VOXEL',
    widthChunks: 4,
    depthChunks: 4,
    heightChunks: 1,
    width: 256,
    height: 256,
    blockSizePx: 64,
    foundationMaterial: 'saints_standard_stone',
    topologyArchetype: 'flat_bedrock',
    spawnPoint: { x: 32, y: 32, z: 32 },
    gates: [
      {
        id: 'spawn',
        name: 'Genesis Gate',
        category: 'SPAWN',
        position: { x: 32, y: 32, z: 32 },
        interactPrompt: 'Respawn',
      },
    ],
  }));

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
    window.location.href = '/studio';
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 font-mono">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-amber-500/40 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/10">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
        <h2 className="text-base font-bold text-white tracking-widest uppercase sg-text-gradient">Initializing System...</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying 3D Voxel Engine and database status</p>
      </div>
    );
  }

  if (!canSetup && setupStatus?.userCount && setupStatus.userCount > 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#050b14]/95 border border-red-500/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-red-950/40 via-[#0a1225] to-[#050b14] border-b border-red-500/30">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="font-mono text-xs font-semibold text-red-300 uppercase tracking-wider">Access Restricted</span>
            </div>
            <button onClick={() => router.push('/')} className="text-slate-500 hover:text-white transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-6 text-center space-y-4">
            <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Administrator Access Required</h2>
              <p className="text-xs text-slate-400 mt-1">
                Game Setup is restricted to server administrators and game developers.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-mono font-semibold transition cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const STEP_LABELS = [
    { num: 0, label: 'Game', sub: 'Identity' },
    { num: 1, label: 'Actors', sub: 'DRAFT Content' },
    { num: 2, label: 'World', sub: 'Generation' },
    { num: 3, label: 'Finish', sub: 'Publish' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 py-6 md:py-8 font-sans">
      {/* SAINTS OS WINDOW FRAME */}
      <div className="bg-[#050b14]/95 border border-primary/40 rounded-2xl shadow-[0_0_32px_rgba(203,178,106,0.12),0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden flex flex-col">
        
        {/* WINDOW TITLE BAR */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 via-[#0a1628] to-[#050b14] border-b border-primary/20 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <Boxes className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-mono text-xs font-bold tracking-widest uppercase sg-text-gradient truncate">
                Saints Game Studio — Onboarding
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-semibold">
              v2.5.0
            </span>
            <button
              onClick={() => router.push('/')}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md transition cursor-pointer"
              title="Close Wizard"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* STEP PROGRESS MENUBAR */}
        <div className="px-3 py-2 bg-[#08101e]/80 border-b border-border/40 overflow-x-auto flex items-center justify-between gap-1 text-xs font-mono select-none">
          <div className="flex items-center gap-1 min-w-max">
            {STEP_LABELS.map(({ num, label }) => {
              const isCurrent = step === num;
              const isPast = step > num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (num < step) setStep(num);
                  }}
                  disabled={num > step}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    isCurrent
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                      : isPast
                      ? 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer'
                      : 'text-slate-600 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : isPast
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3 h-3" /> : num + 1}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0 pl-2">
            <span>Step {step + 1} of {STEP_LABELS.length}</span>
          </div>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* EXISTING DATA NOTICE */}
        {setupStatus && !setupStatus.isFreshInstall && (
          <div className="mx-4 mt-4 p-3.5 rounded-xl bg-[#081224] border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300 truncate">
                Existing realm detected (<strong className="text-amber-300">{setupStatus.mapCount} maps</strong>). Setup preserves live database state.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => router.push('/studio')}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-semibold transition cursor-pointer"
              >
                Studio
              </button>
              <button
                onClick={() => router.push('/lobby')}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono text-[11px] font-bold transition cursor-pointer"
              >
                Play Lobby
              </button>
            </div>
          </div>
        )}

        {/* WINDOW BODY CONTENT */}
        <div className="p-4 sm:p-6 text-foreground">
          {step === 0 && (
            <div className="space-y-6">
              <GameIdentityStep
                data={gameDefinition}
                onChange={(updates) => setGameDefinition((prev) => ({ ...prev, ...updates }))}
              />
              <div className="flex justify-end pt-6 border-t border-border/40">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-sky-950 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Next: Actors
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <ActorsSetupStep />
              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                <button
                  onClick={() => setStep(0)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-sky-950 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Next: World Gen
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <WorldGenerationStep
                gameDefinition={gameDefinition}
                startingMap={startingMap}
                onChange={setStartingMap}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!startingMap.bootstrapRevisionId}
                  className="px-6 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-sky-950 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <PublishReviewStep
              gameDefinition={gameDefinition}
              startingMap={startingMap}
              onBack={() => setStep(2)}
              onCompleteSuccess={handleCompleteSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
