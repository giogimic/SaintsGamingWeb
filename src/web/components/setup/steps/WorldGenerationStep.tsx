'use client';

import React, { useEffect, useState } from 'react';
import { Globe, ArrowRight, ArrowLeft, Loader2, ShieldAlert, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
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
    if (status === 'READY' && bootstrapRevisionId && startingMap.bootstrapRevisionId !== bootstrapRevisionId) {
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

      {/* MAP TYPE SELECTION */}
      <div className="p-3.5 rounded-xl bg-[#070e1b] border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            World Engine
          </h3>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => onChange({ ...startingMap, mapType: 'VOXEL' })}
            disabled={status !== 'READY' && status !== 'ERROR'}
            className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
              startingMap.mapType === 'VOXEL'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-inner'
                : 'bg-[#050b14] border-slate-800 hover:border-slate-700'
            } ${status !== 'READY' && status !== 'ERROR' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold font-mono ${startingMap.mapType === 'VOXEL' ? 'text-amber-300' : 'text-slate-300'}`}>
                Fixed Voxel Plane (Authored)
              </span>
              {startingMap.mapType === 'VOXEL' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Generates a bounded voxel terrain for manual authoring.</p>
          </button>
          
          <button
            onClick={() => onChange({ ...startingMap, mapType: 'FRACTAL' })}
            disabled={status !== 'READY' && status !== 'ERROR'}
            className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
              startingMap.mapType === 'FRACTAL'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-inner'
                : 'bg-[#050b14] border-slate-800 hover:border-slate-700'
            } ${status !== 'READY' && status !== 'ERROR' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold font-mono ${startingMap.mapType === 'FRACTAL' ? 'text-amber-300' : 'text-slate-300'}`}>
                Infinite Fractal Domain (Procedural)
              </span>
              {startingMap.mapType === 'FRACTAL' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Generates limitless deterministic procedural terrain on the fly.</p>
          </button>
        </div>
      </div>

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

      {/* ACTION BAR */}
      {status === 'READY' && (
        <div className="flex items-center justify-between pt-6 border-t border-border/40">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={onNext}
            className="px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            Next: Review & Publish
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
