'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'serapht/navigation';
import {
  Gamepad2,
  Sparkles,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Info,
  Boxes,
  Layers,
  Settings,
  X,
  Minus,
  Maximize2,
  Terminal,
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

  // â”€â”€â”€ WIZARD FORM STATE â”€â”€â”€

  // 1. Game Identity
  const [gameDefinition, setGameDefinition] = useState<GameDefinitionData>({
    name: 'Saints Adventure',
    description: 'A 2.5D multiplayer 3D voxel MMO world filled with quests, monsters, and player creation.',
    genre: 'CREATURE_MMO',
    style: 'SAINTS_HYBRID',
    camera: 'ISOMETRIC_25D',
    defaultBlockSizePx: 64,
  });

  // 2. Characters & Creatures
  const [characters, setCharacters] = useState<SetupCharacterData[]>([
    {
      slug: 'knight_commander',
      name: 'Knight Commander',
      classId: 'WARRIOR',
      spriteKey: 'evil-berserker-bloodaxe-male',
      flavor: 'Frontline champion with high fortitude and stalwart melee combat prowess.',
      tag: 'Primary Hero',
      tagColor: '#f87171',
      assetType: 'SPRITE_SHEET',
    },
    {
      slug: 'arcane_elementalist',
      name: 'Arcane Elementalist',
      classId: 'MAGE',
      spriteKey: 'good-wizard-archmage-male',
      flavor: 'Master of elemental forces, burst damage, and tactical zone control.',
      tag: 'Spellcaster',
      tagColor: '#a78bfa',
      assetType: 'SPRITE_SHEET',
    },
    {
      slug: 'shadow_stalker',
      name: 'Shadow Stalker',
      classId: 'RANGER',
      spriteKey: 'good-ranger-grovekeeper-female',
      flavor: 'Agile wilderness hunter with swift movement and precision strikes.',
      tag: 'Agile Marksman',
      tagColor: '#fbbf24',
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

  // 3. Environment & Materials
  const [environment, setEnvironment] = useState<SetupEnvironmentData>({
    enabledMaterialSets: ['natural_stone', 'nature_foliage', 'architecture', 'fluids_elemental'],
    foundationMaterial: 'gunmetal',
    atmospherePreset: 'noon',
    soundscapeTrack: 'track_peaceful_meadow',
  });

  // 4. Starting 3D Voxel Realm & Spawn
  const [startingMap, setStartingMap] = useState<SetupStartingMapData>(() => ({
    id: 'STARTING_MEADOW',
    name: 'Starting Meadow',
    widthChunks: 2,
    depthChunks: 2,
    heightChunks: 1,
    width: 32,
    height: 32,
    blockSizePx: 64,
    foundationMaterial: 'gunmetal',
    topologyArchetype: 'flat_bedrock',
    spawnPoint: { x: 16, y: 16, z: 16 },
    gates: [
      {
        id: 'spawn',
        name: 'Sanctuary Spawn Point',
        category: 'SPAWN',
        position: { x: 16, y: 16, z: 16 },
        interactPrompt: 'Respawn Sanctuary',
      },
      {
        id: 'town_gate',
        name: 'Capital City Portal',
        category: 'WARP',
        position: { x: 4, y: 16, z: 16 },
        targetMapId: 'SAINTS_VILLAGE',
        interactPrompt: 'Warp to Capital City',
      },
    ],
  }));

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
    { num: 0, label: 'Mode', sub: 'Setup or Import' },
    { num: 1, label: 'Identity', sub: 'Game Engine' },
    { num: 2, label: 'Specs', sub: 'Requirements' },
    { num: 3, label: 'Entities', sub: 'Heroes & Beasts' },
    { num: 4, label: 'Atmosphere', sub: 'Voxel Palette' },
    { num: 5, label: '3D Realm', sub: 'Volume & Spawn' },
    { num: 6, label: 'Review', sub: 'Deploy World' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 py-6 md:py-8 font-sans">
      {/* â”€â”€â”€ SAINTS OS WINDOW FRAME â”€â”€â”€ */}
      <div className="bg-[#050b14]/95 border border-primary/40 rounded-2xl shadow-[0_0_32px_rgba(203,178,106,0.12),0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden flex flex-col">
        
        {/* WINDOW TITLE BAR */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 via-[#0a1628] to-[#050b14] border-b border-primary/20 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Window Traffic Lights */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <Boxes className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-mono text-xs font-bold tracking-widest uppercase sg-text-gradient truncate">
                Saints Game Studio â€” 3D Voxel World Initializer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-semibold">
              v2.1.721
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
            {STEP_LABELS.map(({ num, label, sub }) => {
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

        {/* â”€â”€â”€ WINDOW BODY CONTENT â”€â”€â”€ */}
        <div className="p-4 sm:p-6 text-foreground">
          {/* STEP 0: MODE SELECTION & MIGRATION EXPORT/IMPORT */}
          {step === 0 && (
            <SetupModeSelection
              onSelectFresh={() => setStep(1)}
              onImportSuccess={handleCompleteSuccess}
            />
          )}

          {/* STEP 1: GAME QUESTIONS & 3D VOXEL SPECS */}
          {step === 1 && (
            <GameDefinitionStep
              data={gameDefinition}
              onChange={(updates) => setGameDefinition((prev) => ({ ...prev, ...updates }))}
              onSerapht={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {/* STEP 2: REQUIREMENTS SUMMARY */}
          {step === 2 && (
            <GameRequirementsStep
              gameDefinition={gameDefinition}
              onSerapht={() => setStep(3)}
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
              onSerapht={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {/* STEP 4: ENVIRONMENT & MATERIAL SETS */}
          {step === 4 && (
            <EnvironmentSetupStep
              environment={environment}
              onChange={(updates) => setEnvironment((prev) => ({ ...prev, ...updates }))}
              onSerapht={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}

          {/* STEP 5: STARTING 3D VOXEL REALM */}
          {step === 5 && (
            <StartingMapStep
              environment={environment}
              startingMap={startingMap}
              onChange={setStartingMap}
              onSerapht={() => setStep(6)}
              onBack={() => setStep(4)}
            />
          )}

          {/* STEP 6: FINAL REVIEW & TRANSACTION-SAFE DEPLOY */}
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
      </div>
    </div>
  );
}
