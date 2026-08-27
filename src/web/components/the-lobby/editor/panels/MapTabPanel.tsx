'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe,
  Play,
  Layers,
  Users,
  DoorOpen,
  Swords,
  Eye,
  CheckCircle,
  MapPin,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { GAME_MAPS, loadMap, type GameMapData } from '../../data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { soundSynth } from '@/engine/sound-synth';
import { toBaseMapId } from '@/shared/net/mapIds';

interface MapTabPanelProps {
  mapId: string;
}

export const MapTabPanel: React.FC<MapTabPanelProps> = ({ mapId }) => {
  const currentMapId = useGameStore((s) => s.currentMapId);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const [mapDoc, setMapDoc] = useState<GameMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseMapId = toBaseMapId(mapId);
  const isActiveInViewport = toBaseMapId(currentMapId || '') === baseMapId;

  const fetchMapDoc = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isActiveInViewport && activeMapData) {
        setMapDoc(activeMapData);
      } else {
        const loaded = await loadMap(mapId);
        setMapDoc(ensureMapHasStudioTilesets(loaded));
      }
    } catch (err: any) {
      setError(err?.message || `Failed to load map data for ${mapId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMapDoc();
  }, [mapId, isActiveInViewport, activeMapData]);

  const handleActivateInViewport = async () => {
    soundSynth?.playActionSound?.();
    try {
      const docToLoad = mapDoc || ensureMapHasStudioTilesets(await loadMap(mapId));
      useGameStore.getState().setCurrentMapId(mapId);
      useGameStore.getState().setActiveMapData(docToLoad);
      showToast(`Activated ${docToLoad.name || mapId} in primary viewport`);
    } catch (err: any) {
      showToast(`Failed to activate map: ${err?.message || 'Network error'}`);
    }
  };

  const handleWarpHere = () => {
    if (!mapDoc) return;
    const cx = Math.floor((mapDoc.width || 24) / 2);
    const cy = Math.floor((mapDoc.height || 24) / 2);
    useGameStore.getState().setPlayerPosition({ x: cx, y: cy }, 'down', false);
    showToast(`Warped avatar to [${cx}, ${cy}]`);
  };

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#050b14]/90 p-4 font-mono text-xs text-amber-400">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>Loading map details for {mapId}...</span>
      </div>
    );
  }

  if (error || !mapDoc) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#050b14]/90 p-6 text-center font-mono text-xs">
        <ShieldAlert className="h-8 w-8 text-rose-400" />
        <div className="text-rose-300 font-bold">Failed to load map {mapId}</div>
        <p className="max-w-xs text-[11px] text-slate-400">{error}</p>
        <button
          type="button"
          onClick={() => void fetchMapDoc()}
          className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  const w = mapDoc.width || mapDoc.grid?.[0]?.length || 24;
  const h = mapDoc.height || mapDoc.grid?.length || 24;
  const npcCount = mapDoc.npcs?.length || 0;
  const gateCount = Object.keys(mapDoc.gates || {}).length;
  const layerCount = mapDoc.tileLayers?.length || 0;
  const encounterCount = (mapDoc.encounterPool || []).length;

  return (
    <div className="flex h-full w-full flex-col bg-[#050b14]/95 p-4 font-mono text-xs text-slate-200 overflow-y-auto custom-scrollbar select-none">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-300 tracking-wide flex items-center gap-2">
              {mapDoc.name || mapId}
              {isActiveInViewport ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                  <CheckCircle className="h-3 w-3" /> Live Active Viewport
                </span>
              ) : (
                <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[9px] text-slate-400">
                  Background Tab
                </span>
              )}
            </h2>
            <p className="text-[10px] text-slate-500 font-sans">
              Map Key: <span className="text-slate-400 font-mono">{mapId}</span>
            </p>
          </div>
        </div>

        {/* Action button */}
        {!isActiveInViewport ? (
          <button
            type="button"
            onClick={() => void handleActivateInViewport()}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-lg hover:bg-amber-500/30 cursor-pointer transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Switch Viewport to This Map
          </button>
        ) : (
          <button
            type="button"
            onClick={handleWarpHere}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5" />
            Center Avatar
          </button>
        )}
      </div>

      {/* Grid Quick Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex flex-col rounded-lg border border-slate-800 bg-black/40 p-2.5">
          <span className="text-[10px] uppercase text-slate-500">Dimensions</span>
          <span className="mt-0.5 text-sm font-bold text-slate-200">
            {w} × {h}
          </span>
          <span className="text-[9px] text-slate-500">{w * h} total tiles</span>
        </div>

        <div className="flex flex-col rounded-lg border border-slate-800 bg-black/40 p-2.5">
          <span className="text-[10px] uppercase text-slate-500 flex items-center gap-1">
            <Users className="h-3 w-3 text-violet-400" /> NPCs
          </span>
          <span className="mt-0.5 text-sm font-bold text-slate-200">{npcCount}</span>
          <span className="text-[9px] text-slate-500">Placed entities</span>
        </div>

        <div className="flex flex-col rounded-lg border border-slate-800 bg-black/40 p-2.5">
          <span className="text-[10px] uppercase text-slate-500 flex items-center gap-1">
            <DoorOpen className="h-3 w-3 text-emerald-400" /> Warp Gates
          </span>
          <span className="mt-0.5 text-sm font-bold text-slate-200">{gateCount}</span>
          <span className="text-[9px] text-slate-500">Teleport connections</span>
        </div>

        <div className="flex flex-col rounded-lg border border-slate-800 bg-black/40 p-2.5">
          <span className="text-[10px] uppercase text-slate-500 flex items-center gap-1">
            <Swords className="h-3 w-3 text-pink-400" /> Encounters
          </span>
          <span className="mt-0.5 text-sm font-bold text-slate-200">{encounterCount}</span>
          <span className="text-[9px] text-slate-500">Wild beast pool</span>
        </div>
      </div>

      {/* Tile Layers Inspector */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-amber-400" /> Visual & Logic Layers ({layerCount + 1})
        </h3>
        <div className="mt-2 space-y-1.5">
          {/* Logic Layer */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="font-bold text-cyan-300">Logic Layer (−1)</span>
              <span className="text-[10px] text-slate-500">Collisions, Spawns & Triggers</span>
            </div>
            <span className="text-[10px] text-slate-400">Authoritative</span>
          </div>

          {/* Visual Tile Layers */}
          {(mapDoc.tileLayers || []).map((layer: any, idx: number) => (
            <div
              key={layer.id || idx}
              className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-black/20 px-3 py-2 text-[11px]"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-slate-200 font-medium">Layer {idx}: {layer.name || `Visual Layer ${idx}`}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Opacity: {Math.round(((layer.opacity as number | undefined) ?? 1) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Metadata & Atmosphere */}
      <div className="mt-5 rounded-xl border border-slate-800/80 bg-black/30 p-3.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Environment & Atmosphere
        </h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-500">Biome:</span>{' '}
            <span className="text-slate-300">{(mapDoc as any).biome || 'Temperate'}</span>
          </div>
          <div>
            <span className="text-slate-500">Weather:</span>{' '}
            <span className="text-slate-300">{(mapDoc as any).weatherType || 'Clear'}</span>
          </div>
          <div>
            <span className="text-slate-500">Lighting:</span>{' '}
            <span className="text-slate-300">{(mapDoc as any).lightingPreset || 'Day'}</span>
          </div>
          <div>
            <span className="text-slate-500">Recommended Level:</span>{' '}
            <span className="text-slate-300">{(mapDoc as any).recommendedLevel || 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
