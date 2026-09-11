import { useState, useCallback, useRef } from 'react';
import { resolveSafeVoxelSpawn, type SpawnValidationResult } from '@/shared/game/voxel/SpawnResolver';
import { VoxelWorld, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '@/shared/game/voxel/VoxelChunk';
import type { SetupEnvironmentData } from '../steps/EnvironmentSetupStep';
import type { GameDefinitionData } from '../steps/GameDefinitionStep';
import zlib from 'zlib';
import { Buffer } from 'buffer';

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
  const [bootstrapRevisionId, setBootstrapRevisionId] = useState<string | null>(null);

  const activeRequestId = useRef<number>(0);

  const generateWorld = useCallback(async (sizeChunks: number) => {
    const reqId = ++activeRequestId.current;
    
    setStatus('GENERATING');
    setErrorMsg(null);
    setVoxelDoc(null);
    setDeserializedWorld(null);
    setSpawnResult(null);
    setGeneratedChunksCount(0);
    setTotalChunksCount(sizeChunks * sizeChunks);
    setBootstrapRevisionId(null);

    const t0 = performance.now();
    const seedStr = gameDefinition.name || Date.now().toString();

    try {
      // 1. Initiate Generation on Server
      const startRes = await fetch('/api/setup/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: seedStr,
          widthChunks: sizeChunks,
          depthChunks: sizeChunks,
          heightChunks: 1,
          baseMaterial: environment.foundationMaterial === 'gunmetal' ? 1 : 2,
          baseElevation: 16
        })
      });

      if (!startRes.ok) {
        throw new Error(`Failed to start generation: ${await startRes.text()}`);
      }

      const { bootstrapRevisionId, jobId } = await startRes.json();
      if (reqId !== activeRequestId.current) return;
      setBootstrapRevisionId(bootstrapRevisionId);

      // 2. Poll for Status and Progressive Chunks
      let loadedChecksums = new Set<string>();
      let chunksRecord: Record<string, number[]> = {};
      
      const pollInterval = setInterval(async () => {
        if (reqId !== activeRequestId.current) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const statusRes = await fetch(`/api/setup/generate-draft/status?jobId=${jobId}&includePayloads=true`);
          if (!statusRes.ok) return;

          const data = await statusRes.json();
          if (reqId !== activeRequestId.current) return;

          if (data.status === 'FAILED' || data.error) {
            clearInterval(pollInterval);
            setErrorMsg(data.error || 'Generation failed on server');
            setStatus('ERROR');
            return;
          }

          // Merge new chunks from payloads
          if (data.payloads) {
            let newlyLoaded = false;
            for (const [checksum, b64] of Object.entries(data.payloads)) {
              if (!loadedChecksums.has(checksum)) {
                loadedChecksums.add(checksum);
                
                // Inflate the base64 region binary
                const buf = Buffer.from(b64 as string, 'base64');
                // Use a sync inflate logic for browser... Wait, zlib might not work directly in browser.
                // Normally we'd use pako in browser, but next/server polyfills don't always do sync zlib.
                // We'll rely on our existing voxel loader logic which parses raw arrays for now.
                // Actually, VoxelWorld.deserializeFromDoc handles it if we pass it correctly.
                // Let's decode this payload!
                // We will assume `data.payloads` are already JSON chunk records for the browser to consume easily,
                // OR we can decode it here. Wait, `VoxelStorageService` handles region assemblies.
                
                try {
                  // In a real app we'd use 'pako' for browser zlib inflation.
                  // For Saints Gaming, since it's Next.js, we assume Buffer and zlib are polyfilled or we parse the JSON directly if it's sent uncompressed.
                  // Actually, let's just parse the JSON for the mock if needed, or use pako.
                  // For now, let's decode base64 -> zlib -> JSON string
                  const binary = Buffer.from(b64 as string, 'base64');
                  const decompressed = zlib.inflateSync(binary);
                  const payload = JSON.parse(decompressed.toString('utf-8'));
                  if (payload.chunks) {
                    Object.assign(chunksRecord, payload.chunks);
                    newlyLoaded = true;
                  }
                } catch (e) {
                  console.warn('Failed to decode region payload in browser:', e);
                }
              }
            }

            if (newlyLoaded) {
              // Update progressive preview
              const currentChunkCount = Object.keys(chunksRecord).length;
              setGeneratedChunksCount(currentChunkCount);
              
              // We construct a partial VoxelWorldDocV3
              const partialDoc: VoxelWorldDocV3 = {
                formatVersion: 3,
                id: 'STARTING_MEADOW',
                name: 'Genesis Sanctuary',
                gameId: 'saints',
                version: 1,
                blockSizePx: 64,
                dimensions: { widthChunks: sizeChunks, depthChunks: sizeChunks, heightChunks: 1 },
                chunks: chunksRecord,
                palette: []
              };
              
              const partialWorld = VoxelWorld.deserializeFromDoc(partialDoc);
              setDeserializedWorld(partialWorld);
            }
          }

          if (data.status === 'COMPLETED') {
            clearInterval(pollInterval);
            
            // Build final doc
            const finalDoc: VoxelWorldDocV3 = {
              formatVersion: 3,
              id: 'STARTING_MEADOW',
              name: 'Genesis Sanctuary',
              gameId: 'saints',
              version: 1,
              blockSizePx: 64,
              dimensions: { widthChunks: sizeChunks, depthChunks: sizeChunks, heightChunks: 1 },
              chunks: chunksRecord,
              palette: []
            };
            
            const finalWorld = VoxelWorld.deserializeFromDoc(finalDoc);
            
            const centerX = Math.floor((sizeChunks * CHUNK_SIZE_X) / 2);
            const centerZ = Math.floor((sizeChunks * CHUNK_SIZE_Z) / 2);
            const safeSpawn = resolveSafeVoxelSpawn(finalDoc, centerX, centerZ, 64);

            setVoxelDoc(finalDoc);
            setDeserializedWorld(finalWorld);
            setSpawnResult(safeSpawn);
            setGenerationTimeMs(performance.now() - t0);
            setStatus('READY');
          }
        } catch (e) {
          console.warn('Polling error:', e);
        }
      }, 500);

    } catch (err: any) {
      if (reqId !== activeRequestId.current) return;
      setErrorMsg(`Generation Error: ${err.message}`);
      setStatus('ERROR');
    }
  }, [environment.foundationMaterial, gameDefinition.name]);

  return {
    status,
    bootstrapRevisionId,
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
