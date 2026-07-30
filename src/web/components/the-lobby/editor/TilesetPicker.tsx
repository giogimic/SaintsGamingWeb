import React, { useState, useRef } from 'react';

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
  const ts = tilesets[activeTsIdx];
  const imgRef = useRef<HTMLImageElement>(null);

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
    
    const gid = ts.firstgid + (row * ts.columns) + col;
    onBrushSelect(gid);
  };

  return (
    <div className="flex flex-col gap-2 font-mono">
      <div className="flex flex-col gap-1 bg-black/40 p-2 rounded border border-slate-800">
        <div className="flex justify-between items-center mb-1">
           <span className="text-[10px] font-bold text-slate-400">TILE LAYERS</span>
           <button onClick={onAddLayer} className="text-[10px] bg-amber-700 hover:bg-[#806f47] text-white px-1.5 rounded transition-colors">+ Layer</button>
        </div>
        {tileLayers.map((layer, idx) => (
          <button 
            key={idx} 
            onClick={() => onLayerChange(idx)}
            className={`text-left text-xs px-2 py-1 rounded transition-colors ${activeLayerIdx === idx ? 'bg-[#806f47] text-white font-bold' : 'bg-[#0b1320] text-slate-400 hover:bg-slate-800'}`}
          >
            L{idx}: {layer.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-400">ACTIVE TILESET</label>
        <select 
          value={activeTsIdx} 
          onChange={(e) => setActiveTsIdx(parseInt(e.target.value))}
          className="w-full bg-[#050b14] border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
        >
          {tilesets.map((t, i) => (
            <option key={i} value={i}>{t.imageSource}</option>
          ))}
        </select>
      </div>

      {ts && (
        <div className="bg-black/60 rounded border border-slate-700 overflow-auto max-h-[250px] relative mt-1 custom-scrollbar">
           <img 
             ref={imgRef}
             src={`/tuxemon-assets/tilesets/${ts.imageSource}`} 
             alt="Tileset" 
             onClick={handleImageClick}
             className="cursor-crosshair w-full"
             style={{ imageRendering: 'pixelated', minWidth: `${ts.columns * ts.tilewidth}px` }}
           />
        </div>
      )}
      
      <div className="flex justify-between items-center text-[10px] text-[#e2d5b3] bg-[#0b1320] border border-slate-800 p-1.5 rounded">
        <span>Active Brush GID:</span>
        <span className="font-bold text-white bg-[#050b14] px-2 py-0.5 rounded">{activeBrushTileId}</span>
      </div>
    </div>
  );
}
