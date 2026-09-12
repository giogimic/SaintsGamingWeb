'use client';

import React, { useEffect, useState } from 'react';
import { Globe, ArrowRight, ArrowLeft, Loader2, ShieldAlert, Layers } from 'lucide-react';
import { useSetupWorldSession } from '../hooks/useSetupWorldSession';
import type { GameDefinitionData } from './GameIdentityStep';
import type { SetupStartingMapData } from './StartingMapStep';

interface WorldGenerationStepProps {
  gameDefinition: GameDefinitionData;
  startingMap: SetupStartingMapData;
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
  onChange,
  onNext,
  onBack,
}: WorldGenerationStepProps) {
  const [activeStage, setActiveStage] = useState<keyof typeof STAGE_WEIGHTS>('PREPARING');
  const [internalProgress, setInternalProgress] = useState(0); // 0-100 within the current stage

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
  } = useSetupWorldSession(environment, gameDefinition);

  // Trigger world bake automatically on mount
  useEffect(() => {
    generateWorld(4); // 4x4 chunks default
  }, [generateWorld]);

  // Simulate or map the active stages based on chunk progress
  useEffect(() => {
    if (status === 'READY') {
      setActiveStage('VALIDATION');
      setInternalProgress(100);
      return;
    }
    
    if (totalChunksCount > 0) {
      const chunkPct = (generatedChunksCount / totalChunksCount) * 100;
      // We map the chunk generation progress to the 'TERRAIN' and 'GEOLOGY' stages as an approximation
      if (chunkPct < 50) {
        setActiveStage('TERRAIN');
        setInternalProgress(chunkPct * 2); 
      } else if (chunkPct < 100) {
        setActiveStage('GEOLOGY');
        setInternalProgress((chunkPct - 50) * 2);
      }
    }
  }, [generatedChunksCount, totalChunksCount, status]);

  // Calculate normalized total percentage (0-100)
  const calculateTotalPercentage = () => {
    let accumulatedWeight = 0;
    
    const stageKeys = Object.keys(STAGE_WEIGHTS) as Array<keyof typeof STAGE_WEIGHTS>;
    for (const key of stageKeys) {
      if (key === activeStage) {
        const currentStageWeight = STAGE_WEIGHTS[key];
        const currentStageContribution = currentStageWeight * (internalProgress / 100);
        return Math.min(100, Math.round(((accumulatedWeight + currentStageContribution) / TOTAL_WEIGHT) * 100));
      }
      accumulatedWeight += STAGE_WEIGHTS[key];
    }
    
    return 100;
  };

  const currentTotalPercentage = status === 'READY' ? 100 : calculateTotalPercentage();

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

      {/* GENERATION PROGRESS UI */}
      {status !== 'READY' && status !== 'ERROR' && (
        <div className="p-8 rounded-xl bg-[#070e1b] border border-slate-800/80 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-sky-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white font-mono">{currentTotalPercentage}%</span>
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase mb-1">
              Baking World Artifact
            </h3>
            <p className="text-xs text-sky-400 font-mono uppercase tracking-widest animate-pulse">
              Stage: {activeStage}
            </p>
          </div>

          <div className="w-full max-w-md h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all duration-300 ease-out"
              style={{ width: `${currentTotalPercentage}%` }}
            />
          </div>

          <div className="w-full max-w-md grid grid-cols-7 gap-1 mt-4">
            {Object.keys(STAGE_WEIGHTS).map((stage) => {
              const stageKeys = Object.keys(STAGE_WEIGHTS);
              const currentIndex = stageKeys.indexOf(activeStage);
              const thisIndex = stageKeys.indexOf(stage);
              
              let bgColor = 'bg-slate-800';
              if (thisIndex < currentIndex) bgColor = 'bg-sky-500/60';
              else if (thisIndex === currentIndex) bgColor = 'bg-sky-400 animate-pulse';

              return (
                <div key={stage} className="flex flex-col items-center gap-1">
                  <div className={`w-full h-1 rounded-full ${bgColor}`} />
                  <span className="text-[8px] uppercase tracking-widest text-slate-500 font-mono truncate max-w-full">
                    {stage.substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
