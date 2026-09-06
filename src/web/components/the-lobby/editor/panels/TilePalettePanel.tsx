'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_TILESETS } from '@/shared/game/studioTilesetBootstrap';

export const TilePalettePanel: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const setBrushTileId = useEditorStore((s) => s.setActiveBrushTileId);
  const activeLogicTileId = useEditorStore((s) => s.activeLogicTileId);
  const setLogicTileId = useEditorStore((s) => s.setActiveLogicTileId);
  const activeBrushPattern = useEditorStore((s) => s.activeBrushPattern);
  const setActiveBrushPattern = useEditorStore((s) => s.setActiveBrushPattern);
  const autoTileEnabled = useEditorStore((s) => s.autoTileEnabled);
  const setAutoTileEnabled = useEditorStore((s) => s.setAutoTileEnabled);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const showToast = useGameStore((s) => s.showToast);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ col: number; row: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ col: number; row: number } | null>(null);

  const tilesets = useMemo(() => {
    if (!activeMapData) return DEFAULT_STUDIO_TILESETS;
    const map = ensureMapHasStudioTilesets(activeMapData);
    return map.tilesets?.length ? map.tilesets : DEFAULT_STUDIO_TILESETS;
  }, [activeMapData]);

  const [selectedTilesetIdx, setSelectedTilesetIdx] = useState(0);
  const activeTileset = tilesets[selectedTilesetIdx] || tilesets[0];

  const fullImageUrl = useMemo(() => {
    if (!activeTileset) return '';
    return activeTileset.imageSource.startsWith('/') || activeTileset.imageSource.startsWith('http')
      ? activeTileset.imageSource
      : `/game-assets/tilesets/${activeTileset.imageSource}`;
  }, [activeTileset]);

  const getColRow = (e: React.MouseEvent<HTMLImageElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!activeTileset) return { col: 0, row: 0, cols: 1 };
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    
    const tw = activeTileset.tilewidth || 16;
    const th = activeTileset.tileheight || 16;
    const cols = activeTileset.columns || Math.floor(rect.width / tw);
    
    return {
      col: Math.max(0, Math.floor(x / tw)),
      row: Math.max(0, Math.floor(y / th)),
      cols
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getColRow(e);
    setIsDragging(true);
    setDragStart({ col: pos.col, row: pos.row });
    setDragEnd({ col: pos.col, row: pos.row });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const pos = getColRow(e);
    setDragEnd({ col: pos.col, row: pos.row });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd || !activeTileset) {
      setIsDragging(false);
      return;
    }
    
    setIsDragging(false);
    
    const minCol = Math.min(dragStart.col, dragEnd.col);
    const maxCol = Math.max(dragStart.col, dragEnd.col);
    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    
    const tw = activeTileset.tilewidth || 16;
    const cols = activeTileset.columns || 1; // It will be recalculated safely below if 1
    
    // We need real width of image to get cols if it's not defined
    const realCols = activeTileset.columns || Math.floor(1024 / tw); // fallback
    
    const w = maxCol - minCol + 1;
    const h = maxRow - minRow + 1;
    const gids: number[][] = [];
    const firstGid = activeTileset.firstgid || 1;
    
    for (let r = 0; r < h; r++) {
      const rowArr: number[] = [];
      for (let c = 0; c < w; c++) {
        const localId = (minRow + r) * realCols + (minCol + c);
        rowArr.push(firstGid + localId);
      }
      gids.push(rowArr);
    }
    
    setActiveBrushPattern({ w, h, gids });
    setBrushTileId(gids[0][0]);
    
    if (activeLayerIdx === -1) {
      setActiveLayerIdx(0);
      showToast('Switched to layer 0 (Visual) for tile paint.');
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) handleMouseUp();
  };

  if (activeLayerIdx === -1) {
    // Render Logic Palette
    const logicTiles = [
      { id: 0, name: 'Walkable / Air', color: '#10b981', icon: '🏃' },
      { id: 1, name: 'Solid Wall', color: '#ef4444', icon: '🧱' },
      { id: 2, name: 'Tall Grass (Encounter)', color: '#84cc16', icon: '🌿' },
      { id: 5, name: 'Tree (Solid)', color: '#166534', icon: '🌲' },
      { id: 6, name: 'Ore (Solid)', color: '#71717a', icon: '⛏️' },
      { id: 7, name: 'Shop (Solid)', color: '#eab308', icon: '🏪' },
      { id: 10, name: 'Water (Solid)', color: '#3b82f6', icon: '💧' },
      { id: 11, name: 'Hazard (Solid)', color: '#f97316', icon: '🔥' },
    ];
    
    return (
      <div className="flex flex-col h-full bg-[#03070f] text-slate-200">
        <div className="p-2 border-b border-border/30 bg-[#081222]/80">
          <span className="text-xs text-cyan-400 font-bold">Logic & Collision Palette</span>
        </div>
        <div className="flex-1 overflow-auto p-2 custom-scrollbar bg-[#02050a] grid grid-cols-2 gap-2 content-start">
          {logicTiles.map(lt => (
            <button
              key={lt.id}
              onClick={() => setLogicTileId(lt.id)}
              className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-colors ${
                activeLogicTileId === lt.id
                  ? 'bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                  : 'bg-[#091322] border-border/40 hover:border-cyan-400/30'
              }`}
            >
              <span className="text-2xl drop-shadow-md">{lt.icon}</span>
              <span className="text-[10px] text-center font-bold" style={{ color: lt.color }}>{lt.name}</span>
            </button>
          ))}
        </div>
        <div className="p-2 text-[10px] text-muted-foreground border-t border-border/30 bg-[#081222]/80 flex justify-between">
          <span>Selected Logic ID: <span className="text-cyan-400 font-bold">{activeLogicTileId}</span></span>
        </div>
      </div>
    );
  }

  if (!activeTileset) return null;

  return (
    <div className="flex flex-col h-full bg-[#03070f] text-slate-200">
      <div className="p-2 border-b border-border/30 bg-[#081222]/80">
        <select
          className="w-full bg-[#0a1628] border border-border/40 rounded p-1 text-xs text-primary outline-none"
          value={selectedTilesetIdx}
          onChange={(e) => setSelectedTilesetIdx(Number(e.target.value))}
        >
          {tilesets.map((ts: any, idx: number) => (
            <option key={idx} value={idx}>
              {ts.imageSource.split('/').pop() || `Tileset #${idx + 1}`} ({ts.tilewidth}x{ts.tileheight})
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto p-2 custom-scrollbar bg-[#02050a]">
        <div 
          className="relative inline-block border border-border/40 bg-[#091322] select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair' }}
        >
          <img
            src={fullImageUrl}
            alt="Tileset Palette"
            className="block max-w-none pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
            onLoad={(e) => {
              // Ensure we know the correct columns if it's 0 in the tileset definition
              if (!activeTileset.columns) {
                const tw = activeTileset.tilewidth || 16;
                activeTileset.columns = Math.floor(e.currentTarget.naturalWidth / tw);
              }
            }}
          />
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, #f59e0b 1px, transparent 1px), linear-gradient(to bottom, #f59e0b 1px, transparent 1px)`,
              backgroundSize: `${activeTileset.tilewidth || 16}px ${activeTileset.tileheight || 16}px`,
            }}
          />
          
          {/* Render Active Selection Box */}
          {(dragStart || activeBrushPattern) && (
            <div 
              className="absolute pointer-events-none border-2 border-yellow-400 bg-yellow-400/20 shadow-[0_0_8px_rgba(250,204,21,0.8)] z-10"
              style={(() => {
                const tw = activeTileset.tilewidth || 16;
                const th = activeTileset.tileheight || 16;
                
                if (isDragging && dragStart && dragEnd) {
                  const minCol = Math.min(dragStart.col, dragEnd.col);
                  const maxCol = Math.max(dragStart.col, dragEnd.col);
                  const minRow = Math.min(dragStart.row, dragEnd.row);
                  const maxRow = Math.max(dragStart.row, dragEnd.row);
                  return {
                    left: minCol * tw,
                    top: minRow * th,
                    width: (maxCol - minCol + 1) * tw,
                    height: (maxRow - minRow + 1) * th,
                  };
                } else if (activeBrushPattern && !isDragging) {
                  // Fallback: If we have an active pattern, figure out its origin tile to show the box.
                  // activeBrushPattern stores gids. We need to find the local x/y of the first gid.
                  const firstGid = activeTileset.firstgid || 1;
                  const localId = activeBrushPattern.gids[0][0] - firstGid;
                  const cols = activeTileset.columns || 1;
                  const minCol = localId % cols;
                  const minRow = Math.floor(localId / cols);
                  return {
                    left: minCol * tw,
                    top: minRow * th,
                    width: activeBrushPattern.w * tw,
                    height: activeBrushPattern.h * th,
                  };
                }
                return { display: 'none' };
              })()}
            />
          )}
        </div>
      </div>
      
      {(activeBrushTileId > 0 || activeBrushPattern) && (
        <div className="p-2 text-[10px] text-muted-foreground border-t border-border/30 bg-[#081222]/80 flex justify-between items-center">
          <div className="flex gap-4">
            <span>Selected GID: <span className="text-primary font-bold">{activeBrushTileId}</span></span>
            {activeBrushPattern && (
              <span>Size: <span className="text-amber-400 font-bold">{activeBrushPattern.w}x{activeBrushPattern.h}</span></span>
            )}
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input 
              type="checkbox" 
              checked={autoTileEnabled} 
              onChange={(e) => setAutoTileEnabled(e.target.checked)} 
              className="accent-primary"
            />
            Auto-Tile
          </label>
        </div>
      )}
    </div>
  );
};
