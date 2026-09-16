'use client';

import React, { useEffect, useState } from 'react';
import { Globe, ArrowRight, ArrowLeft, Loader2, ShieldAlert, Layers } from 'lucide-react';
import { useSetupWorldSession } from '../hooks/useSetupWorldSession';
import { DiagnosticConsole } from '../DiagnosticConsole';
import type { GameDefinitionData } from './GameIdentityStep';
import type { SetupStartingMapData } from './StartingMapStep';
import type { DiagnosticEvent } from '@/server/diagnostics/SetupLogger';

interface WorldGenerationStepProps {
  gameDefinition: GameDefinitionData;
  startingMap: SetupStartingMapData;
  initializationId: string;
  diagnosticEvents: DiagnosticEvent[];
  setDiagnosticEvents: React.Dispatch<React.SetStateAction<DiagnosticEvent[]>>;
  onChange: (map: SetupStartingMapData) => void;
  onNext: () => void;
  onBack: () => void;
}

// Relative weights of the generation stages
const STAGE_WEIGHTS = {
  PREPARING: 5,
  TERRAIN: 25,
  GEOLOGY: 12,
  UNDERGROUND: 15,
  RESOURCES: 10,
  MESHING: 10,
  VALIDATION: 7,
};

// Calculate cumulative weights for normalized progress
const TOTAL_WEIGHT = Object.values(STAGE_WEIGHTS).reduce((sum, w) => sum + w, 0);

export function WorldGenerationStep({
  gameDefinition,
  startingMap,
  initializationId,
  diagnosticEvents,
  setDiagnosticEvents,
  onChange,
  onNext,
  onBack,
}: WorldGenerationStepProps) {

  // Hardcode environment to use Standard Content Baseline
  const environment = {
    enabledMaterialSets: ['saints_standard_materials'],
    foundationMaterial: 'saints_standard_stone',
    atmospherePreset: 'noon' as const,
    soundscapeTrack: 'track_peaceful_meadow',
  };

  const {
    status,
    bootstrapRevisionId,
    generatedChunksCount,
    totalChunksCount,
    errorMsg,
    generateWorld,
  } = useSetupWorldSession(environment, gameDefinition, setDiagnosticEvents);

  // Trigger world bake automatically on mount
  useEffect(() => {
    generateWorld(initializationId, 4, startingMap.mapType); // 4x4 chunks default
  }, [generateWorld, initializationId, startingMap.mapType]);

  // Simulate or map the active stages based on chunk progress


  // Handle successful sync
  useEffect(() => {
    if (status === 'READY' && bootstrapRevisionId) {
      onChange({
        ...startingMap,
        widthChunks: 4,
        depthChunks: 4,
        spawnPoint: { x: 32, y: 32, z: 32 },
        width: 4 * 64, // CHUNK_SIZE_X = 64
        height: 4 * 64, // CHUNK_SIZE_Z = 64
        gates: [
          {
            id: 'spawn',
            name: 'Genesis Gate',
            category: 'SPAWN',
            position: { x: 32, y: 32, z: 32 },
            interactPrompt: 'Respawn',
          }
        ],
        bootstrapRevisionId,
      });
    }
  }, [status, bootstrapRevisionId, onChange, startingMap]);


  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Globe className="w-4 h-4 text-sky-400" />
            3. World Generation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generating 3D voxel terrain and baking the initial draft world artifact.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* GENERATION DIAGNOSTICS */}
      {status !== 'READY' && status !== 'ERROR' && (
        <DiagnosticConsole events={diagnosticEvents} />
      )}

      {/* SUCCESS STATE */}
      {status === 'READY' && (
        <div className="p-8 rounded-xl bg-[#070e1b] border border-emerald-500/30 flex flex-col items-center justify-center space-y-4 text-center">
          <Globe className="w-16 h-16 text-emerald-400 mb-2" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-widest font-mono uppercase mb-2">
              Generation Complete
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              The world terrain artifact has been baked and spawn points validated.
              Ready for final review and publishing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
