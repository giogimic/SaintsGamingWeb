import { useState, useCallback, useRef } from 'react';
import type { SetupEnvironmentData } from '../steps/EnvironmentSetupStep';
import type { GameDefinitionData } from '../steps/GameDefinitionStep';

export type WorldSessionStatus = 'IDLE' | 'GENERATING' | 'READY' | 'ERROR';

export function useSetupWorldSession(
  environment: SetupEnvironmentData,
  gameDefinition: GameDefinitionData
) {
  const [status, setStatus] = useState<WorldSessionStatus>('IDLE');
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

      // 2. Poll for Status
      const pollInterval = setInterval(async () => {
        if (reqId !== activeRequestId.current) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const statusRes = await fetch(`/api/setup/generate-draft/status?jobId=${jobId}`);
          if (!statusRes.ok) return;

          const data = await statusRes.json();
          if (reqId !== activeRequestId.current) return;

          if (data.status === 'FAILED' || data.error) {
            clearInterval(pollInterval);
            setErrorMsg(data.error || 'Generation failed on server');
            setStatus('ERROR');
            return;
          }

          if (data.totalRegions) {
            // Estimate chunk count based on region count
            setTotalChunksCount(data.totalRegions * 64);
            setGeneratedChunksCount(data.completedRegions * 64);
          }

          if (data.status === 'COMPLETED') {
            clearInterval(pollInterval);
            
            // Wait an extra moment to mimic finalization
            setTimeout(() => {
              if (reqId === activeRequestId.current) {
                setGenerationTimeMs(performance.now() - t0);
                setStatus('READY');
              }
            }, 500);
          }
        } catch (e) {
          console.error('Polling failed', e);
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
    generationTimeMs,
    generatedChunksCount,
    totalChunksCount,
    errorMsg,
    generateWorld,
  };
}
