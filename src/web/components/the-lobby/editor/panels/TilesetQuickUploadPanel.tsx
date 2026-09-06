'use client';

import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { DraggablePanel } from '../DraggablePanel';
import { AssetUploadView } from '../AssetUploadView';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_TILESETS, StudioTilesetMeta } from '@/shared/game/studioTilesetBootstrap';

export const TilesetQuickUploadPanel: React.FC = () => {
  const panelState = useEditorStore((s) => s.panels['quickUpload']);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);
  
  const [tileWidth, setTileWidth] = useState(32);
  const [tileHeight, setTileHeight] = useState(32);

  if (!panelState?.isOpen) return null;

  const handleUploadComplete = (asset: any) => {
    if (!activeMapData) return;
    
    const map = ensureMapHasStudioTilesets(activeMapData);
    const currentTilesets = map.tilesets?.length ? map.tilesets : DEFAULT_STUDIO_TILESETS;
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

    const tw = tileWidth || asset.metadata?.tileWidth || asset.metadata?.tilewidth || 32;
    const th = tileHeight || asset.metadata?.tileHeight || asset.metadata?.tileheight || 32;
    
    // Attempt to parse actual columns from image size if known
    let columns = asset.metadata?.columns || 8;
    if (asset.metadata?.imagewidth || asset.metadata?.width) {
      const iw = asset.metadata?.imagewidth || asset.metadata?.width;
      columns = Math.floor(iw / tw);
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
    showToast(`Added new tileset: ${asset.source.split('/').pop()}`);
    useEditorStore.getState().closePanel('quickUpload');
  };

  return (
    <DraggablePanel id="quickUpload" icon={<UploadCloud className="w-4 h-4" />}>
      <div className="flex flex-col h-full bg-[#050b14]">
        <div className="p-4 bg-[#0a1628] border-b border-border/30 flex items-center gap-4 shrink-0">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-emerald-400 font-bold uppercase">Tile Width (px)</label>
            <input 
              type="number" 
              value={tileWidth} 
              onChange={e => setTileWidth(Number(e.target.value) || 1)}
              className="bg-[#02050a] border border-border/50 rounded px-2 py-1 text-sm outline-none text-slate-200 w-24 focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-emerald-400 font-bold uppercase">Tile Height (px)</label>
            <input 
              type="number" 
              value={tileHeight} 
              onChange={e => setTileHeight(Number(e.target.value) || 1)}
              className="bg-[#02050a] border border-border/50 rounded px-2 py-1 text-sm outline-none text-slate-200 w-24 focus:border-emerald-500"
            />
          </div>
          <div className="text-xs text-slate-400 max-w-sm border-l-2 border-emerald-500/30 pl-3">
            Set target tile size before uploading. The image will automatically be registered as a TILE asset.
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#02050b]">
          <div className="transform scale-[0.95] origin-top">
            <AssetUploadView 
              initialAssetType="TILE"
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
};
