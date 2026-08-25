'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Compass,
  Paintbrush,
  MapPin,
  Maximize2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Layers,
  Image as ImageIcon,
  Grid3X3,
  X
} from 'lucide-react';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';
import type { GameAssetItem } from '@/engine/assets/AssetManager';
import { SpriteBrowser } from '@/web/components/the-lobby/editor/SpriteBrowser';
import { AssetUploadView } from '@/web/components/the-lobby/editor/AssetUploadView';

export interface SetupStartingMapData {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: number[][];
  tileLayers: Array<{ name: string; grid: number[][] }>;
  spawnPoint: { x: number; y: number };
  tilesetAsset?: GameAssetItem;
}

interface StartingMapStepProps {
  environment: SetupEnvironmentData;
  startingMap: SetupStartingMapData;
  onChange: (map: SetupStartingMapData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StartingMapStep({
  environment,
  startingMap,
  onChange,
  onNext,
  onBack,
}: StartingMapStepProps) {
  const [toolMode, setToolMode] = useState<'paint' | 'solid' | 'spawn'>('paint');
  const [activeGid, setActiveGid] = useState<number>(1);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  
  // Tileset Picker Modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'catalog' | 'upload'>('catalog');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tilesetImgRef = useRef<HTMLImageElement | null>(null);
  const [tilesetLoaded, setTilesetLoaded] = useState(false);

  const width = startingMap.width || 24;
  const height = startingMap.height || 24;

  // Inherit tileset asset from environment step if not explicitly set
  useEffect(() => {
    if (!startingMap.tilesetAsset && environment.defaultTilesetAsset) {
      const defaultGid = environment.defaultGroundGid || 1;
      setActiveGid(defaultGid);

      // Also ensure ground layer uses the chosen ground GID
      const currentVisual = startingMap.tileLayers?.[0]?.grid;
      const updatedVisual = currentVisual
        ? currentVisual.map(row => row.map(cell => (cell === 17 || cell === 0 ? defaultGid : cell)))
        : Array.from({ length: height }, () => Array.from({ length: width }, () => defaultGid));

      onChange({
        ...startingMap,
        tilesetAsset: environment.defaultTilesetAsset,
        tileLayers: [{ name: 'Ground', grid: updatedVisual }],
      });
    }
  }, [environment.defaultTilesetAsset, environment.defaultGroundGid]);

  const currentTileset = startingMap.tilesetAsset || environment.defaultTilesetAsset;

  useEffect(() => {
    if (!currentTileset?.source) {
      setTilesetLoaded(false);
      return;
    }
    const img = new Image();
    img.src = currentTileset.source;
    img.onload = () => {
      tilesetImgRef.current = img;
      setTilesetLoaded(true);
    };
  }, [currentTileset?.source]);

  const handleResize = (newW: number, newH: number) => {
    const clampedW = Math.max(8, Math.min(64, newW));
    const clampedH = Math.max(8, Math.min(64, newH));

    const defaultGid = environment.defaultGroundGid || 1;

    const newGrid = Array.from({ length: clampedH }, (_, r) =>
      Array.from({ length: clampedW }, (_, c) => {
        if (startingMap.grid && r < startingMap.grid.length && c < startingMap.grid[r].length) {
          return startingMap.grid[r][c];
        }
        return r === 0 || r === clampedH - 1 || c === 0 || c === clampedW - 1 ? 1 : 0;
      })
    );

    const newVisual = Array.from({ length: clampedH }, (_, r) =>
      Array.from({ length: clampedW }, (_, c) => {
        if (
          startingMap.tileLayers?.[0]?.grid &&
          r < startingMap.tileLayers[0].grid.length &&
          c < startingMap.tileLayers[0].grid[r].length
        ) {
          return startingMap.tileLayers[0].grid[r][c];
        }
        return defaultGid;
      })
    );

    const safeSpawnX = Math.min(clampedW - 2, Math.max(1, startingMap.spawnPoint.x));
    const safeSpawnY = Math.min(clampedH - 2, Math.max(1, startingMap.spawnPoint.y));

    onChange({
      ...startingMap,
      width: clampedW,
      height: clampedH,
      grid: newGrid,
      tileLayers: [{ name: 'Ground', grid: newVisual }],
      spawnPoint: { x: safeSpawnX, y: safeSpawnY },
    });
  };

  const paintCell = useCallback(
    (x: number, y: number, e: React.MouseEvent) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;

      if (toolMode === 'spawn') {
        onChange({
          ...startingMap,
          spawnPoint: { x, y },
        });
        return;
      }

      const isErase = e.buttons === 2 || e.button === 2 || e.shiftKey;

      const nextGrid = startingMap.grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          if (rIdx === y && cIdx === x && toolMode === 'solid') {
             return isErase ? 0 : 1;
          }
          return cell;
        })
      );

      const nextVisual = (startingMap.tileLayers?.[0]?.grid || []).map((row, rIdx) =>
        row.map((cell, cIdx) => {
          if (rIdx === y && cIdx === x && toolMode === 'paint') {
             return isErase ? 0 : activeGid;
          }
          return cell;
        })
      );

      onChange({
        ...startingMap,
        grid: nextGrid,
        tileLayers: [{ name: 'Ground', grid: nextVisual }],
      });
    },
    [width, height, toolMode, activeGid, startingMap, onChange]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = Math.floor(Math.min(600 / width, 600 / height, 32));
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const visualLayer = startingMap.tileLayers?.[0]?.grid;
    const img = tilesetLoaded ? tilesetImgRef.current : null;

    let cols = 1;
    if (img && currentTileset?.metadata?.tilewidth) {
       cols = Math.floor(img.width / Number(currentTileset.metadata.tilewidth));
    } else if (img) {
       cols = Math.floor(img.width / 32);
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gid = visualLayer?.[y]?.[x] || 0;
        const isSolid = startingMap.grid?.[y]?.[x] === 1;

        if (gid > 0) {
           if (img && cols > 0) {
              const localGid = gid - 1;
              const tw = Number(currentTileset?.metadata?.tilewidth || 32);
              const th = Number(currentTileset?.metadata?.tileheight || 32);
              const tx = (localGid % cols) * tw;
              const ty = Math.floor(localGid / cols) * th;
              ctx.drawImage(img, tx, ty, tw, th, x * cellSize, y * cellSize, cellSize, cellSize);
           } else {
              let fill = '#16a34a'; 
              if (gid === 32) fill = '#92400e';
              else if (gid === 60) fill = '#64748b';
              else if (gid === 80) fill = '#0284c7';
              else if (gid === 1) fill = '#450a0a';
              ctx.fillStyle = fill;
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
           }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

        if (isSolid) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    const spawn = startingMap.spawnPoint;
    if (spawn && spawn.x >= 0 && spawn.x < width && spawn.y >= 0 && spawn.y < height) {
      const centerX = spawn.x * cellSize + cellSize / 2;
      const centerY = spawn.y * cellSize + cellSize / 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.35, 0, Math.PI* 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [width, height, startingMap, environment, tilesetLoaded]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsMouseDown(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const cellSize = Math.floor(Math.min(600 / width, 600 / height, 32));
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    paintCell(x, y, e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cellSize = Math.floor(Math.min(600 / width, 600 / height, 32));
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    setHoveredCell({ x, y });

    if (isMouseDown) {
      paintCell(x, y, e);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-amber-400" />
              5. Create Your Starting Map
            </h2>
            <p className="text-sm text-slate-400">
              Name your initial zone, select a tile sheet, paint terrain features, and set collision boundaries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-amber-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              Spawn: ({startingMap.spawnPoint.x}, {startingMap.spawnPoint.y})
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Map Name
            </label>
            <input
              type="text"
              value={startingMap.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') || 'STARTING_MEADOW';
                onChange({ ...startingMap, name, id: slug });
              }}
              placeholder="e.g. Starting Meadow, Town Square"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Width ({width} tiles)
            </label>
            <input
              type="range"
              min={16}
              max={64}
              step={2}
              value={width}
              onChange={(e) => handleResize(Number(e.target.value), height)}
              className="w-full accent-amber-400 mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Height ({height} tiles)
            </label>
            <input
              type="range"
              min={16}
              max={64}
              step={2}
              value={height}
              onChange={(e) => handleResize(width, Number(e.target.value))}
              className="w-full accent-amber-400 mt-2"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setToolMode('paint')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                toolMode === 'paint'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              Paint Terrain
            </button>

            <button
              onClick={() => setToolMode('solid')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                toolMode === 'solid'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Collision
            </button>

            <button
              onClick={() => setToolMode('spawn')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                toolMode === 'spawn'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Spawn Point
            </button>
          </div>

          <button onClick={() => setIsPickerOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-slate-800 text-white border border-slate-700 hover:border-slate-500">
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            {currentTileset ? (currentTileset.metadata?.name || currentTileset.id.split('/').pop() || 'Selected') : 'Select Tile Sheet'}
          </button>
        </div>

        <div className="flex gap-4">
           {currentTileset && toolMode === 'paint' && (
              <div className="w-64 bg-slate-950 border border-slate-800 rounded-xl flex flex-col p-2 max-h-[500px]">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
                   <span>Palette</span>
                   <span className="font-mono text-[10px] text-amber-300">GID #{activeGid}</span>
                 </div>
                 <div className="flex-1 overflow-auto border border-slate-800 rounded relative cursor-crosshair">
                    <img 
                       src={currentTileset.source} 
                       alt="Tileset Palette" 
                       className="max-w-none select-none pixelated"
                       style={{ imageRendering: 'pixelated' }}
                       onMouseDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const tw = Number(currentTileset?.metadata?.tilewidth || 32);
                          const th = Number(currentTileset?.metadata?.tileheight || 32);
                          const cols = Math.max(1, Math.floor(e.currentTarget.naturalWidth / tw));
                          const x = Math.floor((e.clientX - rect.left) / tw);
                          const y = Math.floor((e.clientY - rect.top) / th);
                          const newGid = (y * cols + x) + 1;
                          setActiveGid(newGid);
                       }}
                    />
                 </div>
                 <div className="text-[10px] text-slate-500 mt-2 px-2">
                    Click tile to select. Right-click canvas to erase.
                 </div>
              </div>
           )}

           <div className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-[#09090b] border border-slate-800 shadow-inner overflow-auto max-h-[500px]" onContextMenu={e => e.preventDefault()}>
             <canvas
               ref={canvasRef}
               onMouseDown={handleCanvasMouseDown}
               onMouseMove={handleCanvasMouseMove}
               onMouseUp={handleCanvasMouseUp}
               onMouseLeave={() => {
                 setIsMouseDown(false);
                 setHoveredCell(null);
               }}
               className="cursor-crosshair shadow-2xl rounded-sm"
               style={{ imageRendering: 'pixelated' }}
             />
           </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!startingMap.name.trim()}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
        >
          Review & Create Game
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {isPickerOpen && (
         <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm">
           <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col w-full max-w-5xl h-[85vh] overflow-hidden">
             
             <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
               <div>
                 <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                   <ImageIcon className="w-5 h-5 text-indigo-400" />
                   Select Tile Sheet
                 </h2>
               </div>
               <button 
                 onClick={() => setIsPickerOpen(false)}
                 className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="flex px-4 pt-2 border-b border-slate-800 bg-slate-900">
               <button
                 onClick={() => setPickerTab('catalog')}
                 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                   pickerTab === 'catalog' 
                     ? 'border-indigo-500 text-indigo-400' 
                     : 'border-transparent text-slate-400 hover:text-slate-300'
                 }`}
               >
                 Existing Assets
               </button>
               <button
                 onClick={() => setPickerTab('upload')}
                 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                   pickerTab === 'upload' 
                     ? 'border-emerald-500 text-emerald-400' 
                     : 'border-transparent text-slate-400 hover:text-slate-300'
                 }`}
               >
                 Upload New
               </button>
             </div>

             <div className="flex-1 overflow-hidden relative bg-slate-950">
               {pickerTab === 'catalog' && (
                 <div className="absolute inset-0 overflow-y-auto">
                     <SpriteBrowser 
                       filterType="TILESET"
                       onSelect={(assets: GameAssetItem[]) => {
                         if (assets.length > 0) {
                            onChange({ ...startingMap, tilesetAsset: assets[0] });
                            setIsPickerOpen(false);
                         }
                       }} 
                     />
                 </div>
               )}
               {pickerTab === 'upload' && (
                 <div className="absolute inset-0 overflow-y-auto p-4">
                   <AssetUploadView
                     initialAssetType="TILESET"
                     initialImportProfile="tile"
                     onUploadComplete={(asset) => {
                       if (asset?.id) {
                          onChange({ ...startingMap, tilesetAsset: asset as GameAssetItem });
                          setIsPickerOpen(false);
                       }
                     }}
                   />
                 </div>
               )}
             </div>
           </div>
         </div>
      )}
    </div>
  );
}
