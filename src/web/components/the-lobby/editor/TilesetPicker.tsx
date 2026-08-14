import React, { useState, useRef, useMemo } from 'react';

interface TilesetPickerProps {
  tilesets: Array<{ firstgid: number; imageSource: string; columns: number; tilewidth: number; tileheight: number }>;
  activeBrushTileId: number;
  onBrushSelect: (gid: number) => void;
  activeLayerIdx: number;
  onLayerChange: (idx: number) => void;
  tileLayers: Array<{ name: string; grid: number[][] }>;
  onAddLayer: () => void;
}

export default function TilesetPicker({
  tilesets,
  activeBrushTileId,
  onBrushSelect,
  activeLayerIdx,
  onLayerChange,
  tileLayers,
  onAddLayer
}: TilesetPickerProps) {
  const [activeTsIdx, setActiveTsIdx] = useState(0);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [hoveredTile, setHoveredTile] = useState<{ leftPct: number; topPct: number; widthPct: number; heightPct: number; gid: number } | null>(null);
  const ts = tilesets[activeTsIdx];
  const imgRef = useRef<HTMLImageElement>(null);

  const selection = useMemo(() => {
    if (!ts || !natural.w || !natural.h) return null;
    const local = activeBrushTileId - ts.firstgid;
    if (local < 0) return null;
    const maxLocal = Math.floor(natural.h / ts.tileheight) * ts.columns;
    if (local >= maxLocal) return null;
    const col = local % ts.columns;
    const row = Math.floor(local / ts.columns);
    return {
      leftPct: (col / ts.columns) * 100,
      topPct: ((row * ts.tileheight) / natural.h) * 100,
      widthPct: (1 / ts.columns) * 100,
      heightPct: (ts.tileheight / natural.h) * 100,
      local,
    };
  }, [ts, activeBrushTileId, natural]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!ts || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);
    
    const col = Math.floor(nativeX / ts.tilewidth);
    const row = Math.floor(nativeY / ts.tileheight);

    if (col < 0 || row < 0 || col >= ts.columns) return;
    if (nativeY >= imgRef.current.naturalHeight) return;
    
    const gid = ts.firstgid + (row * ts.columns) + col;
    onBrushSelect(gid);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!ts || !imgRef.current || !natural.w || !natural.h) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    
    const nativeX = Math.floor(x * scaleX);
    const nativeY = Math.floor(y * scaleY);
    
    const col = Math.floor(nativeX / ts.tilewidth);
    const row = Math.floor(nativeY / ts.tileheight);

    if (col < 0 || row < 0 || col >= ts.columns || nativeY >= imgRef.current.naturalHeight) {
      setHoveredTile(null);
      return;
    }
    
    const gid = ts.firstgid + (row * ts.columns) + col;
    setHoveredTile({
      leftPct: (col / ts.columns) * 100,
      topPct: ((row * ts.tileheight) / natural.h) * 100,
      widthPct: (1 / ts.columns) * 100,
      heightPct: (ts.tileheight / natural.h) * 100,
      gid,
    });
  };

  return (
    <div className="flex flex-col gap-2 font-mono">
      <p className="text-[10px] leading-relaxed text-slate-400">
        Click a tile below to set your brush, then click or drag on the map. Prefer solid grass (GID 17) for ground fills.
      </p>

      <div className="flex flex-col gap-1 bg-black/40 p-2 rounded border border-slate-800">
        <div className="flex justify-between items-center mb-1">
           <span className="text-[10px] font-bold text-slate-400">TILE LAYERS</span>
           <button type="button" onClick={onAddLayer} className="text-[10px] bg-amber-700 hover:bg-[#806f47] text-white px-1.5 rounded transition-colors cursor-pointer">+ Layer</button>
        </div>
        {tileLayers.map((layer, idx) => (
          <button 
            key={idx}
            type="button"
            onClick={() => onLayerChange(idx)}
            className={`text-left text-xs px-2 py-1 rounded transition-colors cursor-pointer ${activeLayerIdx === idx ? 'bg-[#806f47] text-white font-bold' : 'bg-[#0b1320] text-slate-400 hover:bg-slate-800'}`}
          >
            L{idx}: {layer.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400">ACTIVE TILESET</label>
        <select 
          value={activeTsIdx} 
          onChange={(e) => {
            setActiveTsIdx(parseInt(e.target.value));
            setNatural({ w: 0, h: 0 });
            setHoveredTile(null);
          }}
          className="w-full bg-[#050b14] border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-[#cbb26a]"
        >
          {tilesets.map((t, i) => (
            <option key={i} value={i}>{t.imageSource}</option>
          ))}
        </select>
      </div>

      {ts && (
        <div className="bg-black/60 rounded border border-slate-700 overflow-auto max-h-[250px] relative mt-1 custom-scrollbar">
           <div className="relative inline-block min-w-full">
             <img 
               ref={imgRef}
               src={
                 ts.imageSource.startsWith('/') || ts.imageSource.startsWith('http')
                   ? ts.imageSource
                   : `/game-assets/tilesets/${ts.imageSource}`
               }
               alt={ts.imageSource}
               onClick={handleImageClick}
               draggable
               onDragStart={(e) => {
                 const gid = hoveredTile?.gid || activeBrushTileId;
                 e.dataTransfer.setData(
                   'application/json',
                   JSON.stringify({
                     type: 'STUDIO_TILE_DROP',
                     gid,
                     layerIdx: activeLayerIdx,
                   })
                 );
                 e.dataTransfer.effectAllowed = 'copy';
               }}
               onMouseMove={handleMouseMove}
               onMouseLeave={() => setHoveredTile(null)}
               onLoad={(e) => {
                 const el = e.currentTarget;
                 setNatural({ w: el.naturalWidth, h: el.naturalHeight });
               }}
               className="cursor-crosshair w-full"
               style={{ imageRendering: 'pixelated', minWidth: `${ts.columns * ts.tilewidth}px` }}
               onError={(e) => {
                 const el = e.currentTarget;
                 if (!el.dataset.fallback) {
                   el.dataset.fallback = '1';
                   el.src = `/game-assets/tilesets/Terrain_by_George.png`;
                 }
               }}
             />
             {hoveredTile && (
               <div
                 className="pointer-events-none absolute border border-cyan-400/80 bg-cyan-400/20 transition-all duration-75"
                 style={{
                   left: `${hoveredTile.leftPct}%`,
                   top: `${hoveredTile.topPct}%`,
                   width: `${hoveredTile.widthPct}%`,
                   height: `${hoveredTile.heightPct}%`,
                 }}
               />
             )}
             {selection && (
               <div
                 className="pointer-events-none absolute border-2 border-[#cbb26a] bg-[#cbb26a]/20 shadow-[0_0_0_1px_rgba(0,0,0,0.75)] z-10"
                 style={{
                   left: `${selection.leftPct}%`,
                   top: `${selection.topPct}%`,
                   width: `${selection.widthPct}%`,
                   height: `${selection.heightPct}%`,
                 }}
                 title={`Selected local ${selection.local}`}
               />
             )}
           </div>
        </div>
      )}
      
      <div className="flex justify-between items-center text-[10px] text-[#e2d5b3] bg-[#0b1320] border border-slate-800 p-1.5 rounded">
        <span>Active Brush GID:</span>
        <div className="flex items-center gap-2">
          {hoveredTile && (
            <span className="text-[10px] text-cyan-400">Hover: GID {hoveredTile.gid}</span>
          )}
          <span className="font-bold text-white bg-[#050b14] px-2 py-0.5 rounded border border-[#806f47]/40">{activeBrushTileId}</span>
        </div>
      </div>
    </div>
  );
}
