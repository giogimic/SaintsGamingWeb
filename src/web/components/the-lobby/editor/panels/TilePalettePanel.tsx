'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { DownloadCloud, UploadCloud, X, Loader2 } from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_TILESETS, StudioTilesetMeta } from '@/shared/game/studioTilesetBootstrap';
import { AssetUploadView } from '../AssetUploadView';

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
  const [zoom, setZoom] = useState(1);

  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);


  const addTilesetToMap = (asset: any, customTileWidth?: number, customTileHeight?: number) => {
    if (!activeMapData) return;
    const currentTilesets = tilesets;
    const lastTileset = currentTilesets[currentTilesets.length - 1];
    
    // Calculate new firstgid safely
    let tileCount = 256;
    if (lastTileset.imagewidth && lastTileset.imageheight && lastTileset.tilewidth && lastTileset.tileheight) {
      const c = Math.floor(lastTileset.imagewidth / lastTileset.tilewidth);
      const r = Math.floor(lastTileset.imageheight / lastTileset.tileheight);
      tileCount = Math.max(1, c * r);
    } else {
      // Fallback rough estimate based on columns
      tileCount = (lastTileset.columns || 8) * 32;
    }

    const tw = customTileWidth || asset.metadata?.tileWidth || asset.metadata?.tilewidth || 32;
    const th = customTileHeight || asset.metadata?.tileHeight || asset.metadata?.tileheight || 32;
    
    // Attempt to parse actual columns from image size if known
    let columns = asset.metadata?.columns || 8;
    if (asset.metadata?.imagewidth || asset.metadata?.width) {
      const iw = asset.metadata?.imagewidth || asset.metadata?.width;
      columns = Math.max(1, Math.floor(iw / tw));
    }

    const newTileset: StudioTilesetMeta = {
      firstgid: lastTileset.firstgid + tileCount,
      imageSource: asset.source,
      columns,
      tilewidth: tw,
      tileheight: th,
      imagewidth: asset.metadata?.imagewidth || asset.metadata?.width,
      imageheight: asset.metadata?.imageheight || asset.metadata?.height
    };

    const updatedMapData = {
      ...activeMapData,
      tilesets: [...currentTilesets, newTileset]
    };

    useGameStore.setState({ activeMapData: updatedMapData });
    useEditorStore.getState().markMapDirty();
    
    // Select the new tileset
    setSelectedTilesetIdx(currentTilesets.length);
    showToast(`Added new tileset: ${asset.source.split('/').pop()}`);
  };

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
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    
    const tw = activeTileset.tilewidth || 32;
    const th = activeTileset.tileheight || 32;
    const cols = activeTileset.columns || Math.max(1, Math.floor((activeTileset.imagewidth || rect.width || 1024) / tw));
    
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
    
    const tw = activeTileset.tilewidth || 32;
    
    // We need real width of image to get cols if it's not defined
    const realCols = activeTileset.columns || Math.max(1, Math.floor((activeTileset.imagewidth || 1024) / tw));
    
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
    setBrushTileId(gids[0][0], true);
    
    if (activeLayerIdx === -1) {
      setActiveLayerIdx(0);
      showToast('Switched to layer 0 (Visual) for tile paint.');
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) handleMouseUp();
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom if pressing ctrl/meta, or just allow regular wheel to zoom if you prefer
    // The user said "add ways to zoom in and out". Standard is often ctrl+wheel.
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((prev) => Math.max(0.25, Math.min(4, prev - e.deltaY * 0.002)));
    }
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
      <div className="p-2 border-b border-border/30 bg-[#081222]/80 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <select
            className="flex-1 bg-[#0a1628] border border-border/40 rounded p-1 text-xs text-primary outline-none"
            value={selectedTilesetIdx}
            onChange={(e) => setSelectedTilesetIdx(Number(e.target.value))}
          >
            {tilesets.map((ts: any, idx: number) => (
              <option key={idx} value={idx}>
                {ts.imageSource.split('/').pop() || `Tileset #${idx + 1}`} ({ts.tilewidth}x{ts.tileheight})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 bg-[#0a1628] rounded border border-border/40 px-1 py-1" title="Zoom">
            <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="hover:text-primary px-1">-</button>
            <span className="text-[10px] w-8 text-center font-mono">{(zoom * 100).toFixed(0)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="hover:text-primary px-1">+</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAssetLibraryOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors"
          >
            <DownloadCloud className="w-3 h-3" />
            Import Existing
          </button>
          <button 
            onClick={() => useEditorStore.getState().openPanel('quickUpload')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors"
          >
            <UploadCloud className="w-3 h-3" />
            Quick Upload
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 custom-scrollbar bg-[#02050a]" onWheel={handleWheel}>
        <div 
          className="relative inline-block border border-border/40 bg-[#091322] select-none origin-top-left"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair', transform: `scale(${zoom})` }}
        >
          <img
            src={fullImageUrl}
            alt="Tileset Palette"
            className="block max-w-none pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
            onLoad={(e) => {
              // Ensure we know the correct columns if it's 0 in the tileset definition
              if (!activeTileset.columns && activeMapData) {
                const tw = activeTileset.tilewidth || 32;
                const naturalCols = Math.floor(e.currentTarget.naturalWidth / tw);
                const updatedTilesets = activeMapData.tilesets?.map((ts: any) => {
                  if (ts.firstgid === activeTileset.firstgid) {
                    return { ...ts, columns: naturalCols, imagewidth: e.currentTarget.naturalWidth, imageheight: e.currentTarget.naturalHeight };
                  }
                  return ts;
                });
                useGameStore.setState({ activeMapData: { ...activeMapData, tilesets: updatedTilesets } });
              }
            }}
          />
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, #f59e0b 1px, transparent 1px), linear-gradient(to bottom, #f59e0b 1px, transparent 1px)`,
              backgroundSize: `${activeTileset.tilewidth || 32}px ${activeTileset.tileheight || 32}px`,
            }}
          />
          
          {/* Render Active Selection Box */}
          {(dragStart || activeBrushPattern) && (
            <div 
              className="absolute pointer-events-none border-2 border-yellow-400 bg-yellow-400/20 shadow-[0_0_8px_rgba(250,204,21,0.8)] z-10"
              style={(() => {
                const tw = activeTileset.tilewidth || 32;
                const th = activeTileset.tileheight || 32;
                
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
                  const cols = activeTileset.columns || Math.max(1, Math.floor((activeTileset.imagewidth || 1024) / tw));
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

      {/* Tileset Library Modal */}
      {isAssetLibraryOpen && (
        <TilesetLibraryModal 
          onClose={() => setIsAssetLibraryOpen(false)} 
          onSelect={(asset) => {
            addTilesetToMap(asset);
            setIsAssetLibraryOpen(false);
          }} 
        />
      )}

    </div>
  );
};

const TilesetLibraryModal: React.FC<{ onClose: () => void, onSelect: (asset: any) => void }> = ({ onClose, onSelect }) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/assets?type=TILE&limit=50')
      .then(r => r.json())
      .then(data => {
        setAssets(data.assets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#050b14] border border-amber-500/30 rounded-xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-3 border-b border-border/30 bg-[#081222]/80">
          <h2 className="text-amber-400 font-bold flex items-center gap-2">
            <DownloadCloud className="w-4 h-4" /> Import Tileset
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center py-8 text-amber-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : assets.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm">No uploaded tilesets found. Use Quick Upload first.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {assets.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => onSelect(a)}
                  className="flex flex-col bg-[#0a1628] border border-border/40 rounded overflow-hidden hover:border-amber-400/50 hover:shadow-[0_0_8px_rgba(251,191,36,0.3)] transition-all group"
                >
                  <div className="h-24 w-full bg-[#02050a] flex items-center justify-center p-2 relative overflow-hidden">
                    <img 
                      src={a.source.startsWith('/') || a.source.startsWith('http') ? a.source : `/game-assets/tilesets/${a.source}`} 
                      alt={a.name}
                      className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-110 transition-transform"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="p-2 bg-[#081222] text-xs font-bold truncate text-left w-full border-t border-border/30 text-slate-300">
                    {a.name || a.source.split('/').pop()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


