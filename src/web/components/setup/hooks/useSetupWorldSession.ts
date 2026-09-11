import { useState, useCallback, useRef } from 'react';
import { generateVoxelWorldDocProgressive } from '@/shared/game/voxel/VoxelWorldGenerator';
import { resolveSafeVoxelSpawn, type SpawnValidationResult } from '@/shared/game/voxel/SpawnResolver';
import { VoxelWorld, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '@/shared/game/voxel/VoxelChunk';
import type { SetupEnvironmentData } from '../steps/EnvironmentSetupStep';
import type { GameDefinitionData } from '../steps/GameDefinitionStep';

export type WorldSessionStatus = 'IDLE' | 'GENERATING' | 'SERIALIZING' | 'DESERIALIZING' | 'READY' | 'ERROR';

export function useSetupWorldSession(
  environment: SetupEnvironmentData,
  gameDefinition: GameDefinitionData
) {
  const [status, setStatus] = useState<WorldSessionStatus>('IDLE');
  const [voxelDoc, setVoxelDoc] = useState<VoxelWorldDocV3 | null>(null);
  const [deserializedWorld, setDeserializedWorld] = useState<VoxelWorld | null>(null);
  const [spawnResult, setSpawnResult] = useState<SpawnValidationResult | null>(null);
  const [generationTimeMs, setGenerationTimeMs] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedChunksCount, setGeneratedChunksCount] = useState<number>(0);
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0);

  const activeRequestId = useRef<number>(0);

  const generateWorld = useCallback((sizeChunks: number) => {
    const reqId = ++activeRequestId.current;
    
    setStatus('GENERATING');
    setErrorMsg(null);
    setVoxelDoc(null);
    setDeserializedWorld(null);
    setSpawnResult(null);
    setGeneratedChunksCount(0);
    setTotalChunksCount(sizeChunks * sizeChunks); // rough estimate

    // Give UI a tick to render GENERATING state
    setTimeout(() => {
      if (reqId !== activeRequestId.current) return;
      
      const t0 = performance.now();
      const seedStr = gameDefinition.name || Date.now().toString();

      const generator = generateVoxelWorldDocProgressive({
        id: 'STARTING_MEADOW',
        name: 'Genesis Sanctuary',
        widthChunks: sizeChunks,
        depthChunks: sizeChunks,
        heightChunks: 1, // 32 blocks
        mode: 'procedural',
        seed: seedStr,
        baseMaterial: environment.foundationMaterial === 'gunmetal' ? 1 : 2,
        baseElevation: 16,
      });

      function pump() {
        if (reqId !== activeRequestId.current) return;

        try {
          // Process a small batch of chunks per frame so the UI stays 60FPS
          const CHUNKS_PER_FRAME = 4;
          let isDone = false;
          let finalDoc: VoxelWorldDocV3 | undefined = undefined;

          for (let i = 0; i < CHUNKS_PER_FRAME; i++) {
            const res = generator.next();
            if (res.done) {
              isDone = true;
              finalDoc = res.value as VoxelWorldDocV3;
              break;
            } else {
              setGeneratedChunksCount(res.value.generatedChunks);
              setTotalChunksCount(res.value.totalChunks);
              // Set the WIP world so the viewport can render it progressively!
              setDeserializedWorld(res.value.world);
            }
          }

          if (isDone && finalDoc) {
            // Finished generating chunks!
            setStatus('SERIALIZING');
            
            setTimeout(() => {
              if (reqId !== activeRequestId.current) return;
              try {
                const serialized = JSON.stringify(finalDoc);
                
                setStatus('DESERIALIZING');
                setTimeout(() => {
                  if (reqId !== activeRequestId.current) return;
                  try {
                    const parsedDoc = JSON.parse(serialized) as VoxelWorldDocV3;
                    const finalWorld = VoxelWorld.deserializeFromDoc(parsedDoc);
                    
                    const centerX = Math.floor((sizeChunks * CHUNK_SIZE_X) / 2);
                    const centerZ = Math.floor((sizeChunks * CHUNK_SIZE_Z) / 2);
                    const safeSpawn = resolveSafeVoxelSpawn(parsedDoc, centerX, centerZ, 64);

                    if (reqId !== activeRequestId.current) return;
                    
                    setVoxelDoc(parsedDoc);
                    setDeserializedWorld(finalWorld);
                    setSpawnResult(safeSpawn);
                    setGenerationTimeMs(performance.now() - t0);
                    setStatus('READY');
                  } catch (err: any) {
                    if (reqId !== activeRequestId.current) return;
                    setErrorMsg(`Deserialization Error: ${err.message}`);
                    setStatus('ERROR');
                  }
                }, 10);
              } catch (err: any) {
                if (reqId !== activeRequestId.current) return;
                setErrorMsg(`Serialization Error: ${err.message}`);
                setStatus('ERROR');
              }
            }, 10);
          } else {
            // Schedule next batch on the next frame
            requestAnimationFrame(pump);
          }
        } catch (err: any) {
          if (reqId !== activeRequestId.current) return;
          setErrorMsg(`Generation Error: ${err.message}`);
          setStatus('ERROR');
        }
      }

      // Start the pump
      requestAnimationFrame(pump);

    }, 50);
  }, [environment.foundationMaterial, gameDefinition.name]);

  return {
    status,
    voxelDoc,
    deserializedWorld,
    spawnResult,
    generationTimeMs,
    generatedChunksCount,
    totalChunksCount,
    errorMsg,
    generateWorld,
  };
}
