'use client';

import React from 'react';
import { Brush, Grid3X3, Shield, MousePointerClick } from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';

/**
 * Always-visible paint status while Development tools are open.
 * Helps authors see active layer, brush, and last cell without hunting docks.
 */
export function StudioPaintHud() {
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const layerIdx = useEditorStore((s) => s.activeLayerIdx);
  const brushId = useEditorStore((s) => s.activeBrushTileId);
  const lastPainted = useEditorStore((s) => s.lastPaintedTile);
  const clicked = useEditorStore((s) => s.clickedTile);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const logicTiles = useGameStore((s) => s.logicTiles);
  const activeMapData = useGameStore((s) => s.activeMapData);

  if (!isCreationMode) return null;

  const isLogic = layerIdx === -1;
  const layerName = isLogic
    ? 'Logic (−1)'
    : activeMapData?.tileLayers?.[layerIdx]?.name || `Layer ${layerIdx}`;
  const logicMeta = isLogic ? logicTiles[brushId] : null;
  const cell = lastPainted || clicked;

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-[110] -translate-x-1/2">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#806f47]/45 bg-[#050b14]/92 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
            isLogic
              ? 'border-rose-400/50 bg-rose-950/50 text-rose-100'
              : 'border-[#cbb26a]/40 bg-[#806f47]/20 text-[#e2d5b3]'
          }`}
          title={isLogic ? 'Collision & gameplay tags (authority grid)' : 'Visual tileset layer'}
        >
          {isLogic ? <Shield className="h-3.5 w-3.5" /> : <Grid3X3 className="h-3.5 w-3.5" />}
          {layerName}
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[10px] text-slate-200"
          title={logicMeta ? `${logicMeta.name} — paint then Play to test` : 'Active brush GID / logic id'}
        >
          <Brush className="h-3.5 w-3.5 text-[#cbb26a]" />
          {logicMeta ? (
            <>
              <span className={`h-2.5 w-2.5 rounded-sm border border-white/20 ${logicMeta.color || 'bg-slate-500'}`} />
              <span className="max-w-[140px] truncate font-bold">{logicMeta.name}</span>
              <span className="text-slate-500">#{brushId}</span>
            </>
          ) : (
            <>
              <span className="font-bold text-white">GID {brushId}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 font-mono text-[10px] text-slate-400">
          <MousePointerClick className="h-3.5 w-3.5" />
          <span>Paint · MMB / Space+drag pan · Ctrl+Z</span>
          {cell && (
            <span className="text-[#e2d5b3]">
              · ({cell.c}, {cell.r})
            </span>
          )}
        </div>

        {mapDirty && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
            Unsaved · Save Map
          </span>
        )}
      </div>
    </div>
  );
}
