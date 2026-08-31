'use client';

import React from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { Crosshair, X, ArrowLeft, Layers, Shield } from 'lucide-react';
import { loadMap } from '../data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { STUDIO_MAP_HOT_RELOAD_EVENT } from '@/shared/game/studioEvents';

export const DestinationPlacementHUD: React.FC = () => {
  const pendingGate = useEditorStore((s) => s.pendingGateConnection);
  const setPendingGate = useEditorStore((s) => s.setPendingGateConnection);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  if (!pendingGate) return null;

  const handleCancelAndReturn = async () => {
    try {
      showToast(`Cancelling connection, returning to ${pendingGate.originMapId}...`);
      const rawOrigin = await loadMap(pendingGate.originMapId);
      const loaded = ensureMapHasStudioTilesets(rawOrigin);
      useGameStore.setState({ currentMapId: pendingGate.originMapId, activeMapData: loaded });
      useEditorStore.getState().openMapInTab(pendingGate.originMapId);
      window.dispatchEvent(new CustomEvent(STUDIO_MAP_HOT_RELOAD_EVENT, { detail: { mapDoc: loaded } }));
      setPendingGate(null);
      showToast(`Returned to ${pendingGate.originMapId}`);
    } catch (e: any) {
      console.error('Failed to return to origin map:', e);
      setPendingGate(null);
    }
  };

  const handleSetSize = (w: number, h: number) => {
    setPendingGate({
      ...pendingGate,
      originSize: { w, h },
    });
  };

  const currentSize = pendingGate.originSize || { w: 1, h: 1 };

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[250] pointer-events-auto max-w-2xl w-full px-4 animate-in slide-in-from-top-4 duration-200">
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1320]/95 via-[#161426]/95 to-[#0b1320]/95 border border-cyan-500/50 shadow-2xl p-3.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 animate-pulse">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                Placing Destination Connection Point
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {pendingGate.originMapId} ➔ {activeMapData?.id || pendingGate.targetMapId}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Click anywhere on this map to place the entrance. You will automatically return to <strong>{pendingGate.originMapId}</strong>.
            </p>
          </div>
        </div>

        {/* Quick Size Controls & Cancel Button */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 bg-black/50 border border-slate-800 rounded-xl p-1">
            <span className="text-[9px] font-bold text-slate-400 px-1.5 uppercase flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> Size:
            </span>
            {[
              { label: '1×1', w: 1, h: 1 },
              { label: '2×1', w: 2, h: 1 },
              { label: '3×1', w: 3, h: 1 },
              { label: '1×2', w: 1, h: 2 },
              { label: '2×2', w: 2, h: 2 },
            ].map((s) => {
              const active = currentSize.w === s.w && currentSize.h === s.h;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleSetSize(s.w, s.h)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    active
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCancelAndReturn}
            className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
