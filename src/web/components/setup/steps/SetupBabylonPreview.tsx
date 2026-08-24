'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Engine, Scene, Vector3, FreeCamera, HemisphericLight, MeshBuilder, StandardMaterial, Texture, VertexBuffer, Color4, Color3 } from '@babylonjs/core';
import type { GameAssetItem } from '@/engine/assets/AssetManager';
import { resolveSpriteDefinition, spriteDefinitionToBabylonConfig } from '@/shared/game/spriteDefinitions';
import { Play, Square, RefreshCcw } from 'lucide-react';

interface SetupBabylonPreviewProps {
  asset: GameAssetItem | null;
  role?: string;
}

export function SetupBabylonPreview({ asset, role }: SetupBabylonPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState<'down' | 'left' | 'right' | 'up'>('down');
  const [isReady, setIsReady] = useState(false);

  // Playback state ref for render loop access without stale closures
  const playState = useRef<{ isPlaying: boolean; direction: 'down' | 'left' | 'right' | 'up' }>({ isPlaying: true, direction: 'down' });
  
  useEffect(() => {
    playState.current = { isPlaying, direction };
  }, [isPlaying, direction]);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // 1. Init Engine & Scene
    const newEngine = new Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(newEngine);
    scene.clearColor = new Color4(0.05, 0.05, 0.08, 1); // Dark bg

    // 2. Camera & Light
    const camera = new FreeCamera('preview-cam', new Vector3(0, 1.5, -4), scene);
    camera.setTarget(new Vector3(0, 0.5, 0));
    
    const light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene);
    light.intensity = 1.0;

    // 3. Setup Sprite Plane
    const plane = MeshBuilder.CreatePlane('sprite-plane', { size: 2, updatable: true }, scene);
    plane.position.y = 0.5;
    const mat = new StandardMaterial('sprite-mat', scene);
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    plane.material = mat;
    
    // Add simple floor
    const floor = MeshBuilder.CreateGround('floor', { width: 4, height: 4 }, scene);
    const floorMat = new StandardMaterial('floor-mat', scene);
    floorMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
    floorMat.wireframe = true;
    floor.material = floorMat;
    floor.position.y = -0.5;

    let animTime = 0;
    
    // Render loop
    newEngine.runRenderLoop(() => {
      if (playState.current.isPlaying) {
        animTime += newEngine.getDeltaTime() / 1000;
      } else {
        animTime = 0; // force idle frame
      }

      // If we have metadata (injected during texture load)
      if (plane.metadata?.config) {
        const config = plane.metadata.config;
        const state = playState.current;
        
        let targetCol = config.idleFrame;
        let targetRow = config.directions[state.direction] ?? config.directions.down;
        
        // Very basic animation logic similar to BabylonEngine
        if (state.isPlaying && config.columns > 1) {
          const fps = config.walkSpeed || 6;
          const frameIndex = Math.floor(animTime * fps) % config.walkCycle.length;
          targetCol = config.walkCycle[frameIndex];
        }

        if (plane.metadata.lastCol !== targetCol || plane.metadata.lastRow !== targetRow) {
          setSpriteCellUVs(plane, targetCol, targetRow, config.columns, config.rows);
          plane.metadata.lastCol = targetCol;
          plane.metadata.lastRow = targetRow;
        }
      }

      scene.render();
    });

    setEngine(newEngine);
    setIsReady(true);

    const resize = () => newEngine.resize();
    window.addEventListener('resize', resize);
    
    return () => {
      window.removeEventListener('resize', resize);
      newEngine.dispose();
    };
  }, []);

  // Update texture when asset changes
  useEffect(() => {
    if (!engine || !isReady || !asset?.source) return;
    
    const scene = engine.scenes[0];
    const plane = scene.getMeshByName('sprite-plane');
    if (!plane) return;

    const mat = plane.material as StandardMaterial;
    if (mat.diffuseTexture) mat.diffuseTexture.dispose();
    
    // Use canonical source, assuming it's an absolute url or path from AssetPathResolver
    // Setup wizard usually gives us the raw path. For now, try to load it.
    let texUrl = asset.source;
    if (!texUrl.startsWith('http') && !texUrl.startsWith('/')) {
        // Very simplistic fallback if needed
        texUrl = `/game-assets/${texUrl}`;
    }

    const tex = new Texture(texUrl, scene, false, true, Texture.NEAREST_SAMPLINGMODE, () => {
      // Once loaded, resolve definition
      const size = tex.getSize();
      
      const def = resolveSpriteDefinition({
        animationProfile: asset.metadata?.animationProfile || 'custom',
        spriteUrl: texUrl,
        width: size.width,
        height: size.height,
        spriteConfig: undefined, // Let resolver use default for profile
      });
      
      const config = spriteDefinitionToBabylonConfig(def);
      
      // Stop texture bleeding
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      
      plane.metadata = { config, lastCol: -1, lastRow: -1 };
    });
    
    tex.hasAlpha = true;
    mat.diffuseTexture = tex;

  }, [asset, engine, isReady]);

  function setSpriteCellUVs(mesh: any, col: number, row: number, columns: number, rows: number) {
    if (columns <= 1 && rows <= 1) {
      mesh.setVerticesData(VertexBuffer.UVKind, [0, 0, 1, 0, 1, 1, 0, 1], true);
      return;
    }
    const u0 = col / columns;
    const u1 = (col + 1) / columns;
    const v1 = 1 - row / rows;
    const v0 = 1 - (row + 1) / rows;
    mesh.setVerticesData(VertexBuffer.UVKind, [u0, v0, u1, v0, u1, v1, u0, v1], true);
  }

  if (!asset) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50">
        <span className="text-sm font-semibold text-slate-500">No canonical asset selected</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full min-h-[300px] outline-none" />
      </div>
      
      {/* Controls */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4">
        
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
          {(['up', 'down', 'left', 'right'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-md transition-colors ${
                direction === dir ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-xs font-bold"
          >
            {isPlaying ? <Square className="w-4 h-4 text-rose-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
