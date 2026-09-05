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
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

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
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-card/90 p-4 font-mono text-xs text-primary">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span>Loading map details for {mapId}...</span>
      </div>
    );
  }

  if (error || !mapDoc) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card/90 p-6 text-center font-mono text-xs">
        <ShieldAlert className="h-8 w-8 text-rose-400" />
        <div className="text-rose-300 font-bold">Failed to load map {mapId}</div>
        <p className="max-w-xs text-[11px] text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => void fetchMapDoc()}
          className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20 cursor-pointer"
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
    <div className="flex h-full w-full flex-col bg-card/90 backdrop-blur-md font-mono text-xs text-foreground -m-3 mb-0 overflow-hidden select-none">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Map"
          items={[
            {
              label: 'Activate in Viewport',
              icon: Play,
              onClick: () => void handleActivateInViewport(),
            },
            {
              label: 'Center Avatar in Map',
              icon: MapPin,
              onClick: handleWarpHere,
            },
            { divider: true, label: '' },
            {
              label: 'Reload Map Document',
              icon: RefreshCw,
              onClick: () => void fetchMapDoc(),
            },
          ]}
        />
        <WindowMenuDivider />
        {!isActiveInViewport ? (
          <WindowMenuButton
            label="Load Viewport"
            icon={Play}
            onClick={() => void handleActivateInViewport()}
            title="Load map into primary 3D viewport"
          />
        ) : (
          <WindowMenuButton
            label="Center Avatar"
            icon={MapPin}
            onClick={handleWarpHere}
            title="Center player at map coordinates"
          />
        )}
        <div className="flex-1" />
        {isActiveInViewport ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
            <CheckCircle className="h-2.5 w-2.5" /> Live
          </span>
        ) : (
          <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[9px] text-muted-foreground">
            Doc
          </span>
        )}
      </WindowMenuBar>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/15 text-primary shadow-inner">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-wide flex items-center gap-2">
              {mapDoc.name || mapId}
            </h2>
            <p className="text-[10px] text-muted-foreground font-sans">
              Map Key: <span className="text-foreground font-mono">{mapId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid Quick Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex flex-col rounded-lg border border-border/60 bg-background/50 p-2.5">
          <span className="text-[10px] uppercase text-muted-foreground">Dimensions</span>
          <span className="mt-0.5 text-sm font-bold text-foreground">
            {w} × {h}
          </span>
          <span className="text-[9px] text-muted-foreground">{w * h} total tiles</span>
        </div>

        <div className="flex flex-col rounded-lg border border-border/60 bg-background/50 p-2.5">
          <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3 text-violet-400" /> NPCs
          </span>
          <span className="mt-0.5 text-sm font-bold text-foreground">{npcCount}</span>
          <span className="text-[9px] text-muted-foreground">Placed entities</span>
        </div>

        <div className="flex flex-col rounded-lg border border-border/60 bg-background/50 p-2.5">
          <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <DoorOpen className="h-3 w-3 text-emerald-400" /> Warp Gates
          </span>
          <span className="mt-0.5 text-sm font-bold text-foreground">{gateCount}</span>
          <span className="text-[9px] text-muted-foreground">Teleport connections</span>
        </div>

        <div className="flex flex-col rounded-lg border border-border/60 bg-background/50 p-2.5">
          <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <Swords className="h-3 w-3 text-pink-400" /> Encounters
          </span>
          <span className="mt-0.5 text-sm font-bold text-foreground">{encounterCount}</span>
          <span className="text-[9px] text-muted-foreground">Wild beast pool</span>
        </div>
      </div>

      {/* Tile Layers Inspector */}
      {mapDoc.mapType !== 'VOXEL' && (
      <div className="mt-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" /> Visual & Logic Layers ({layerCount + 1})
        </h3>
        <div className="mt-2 space-y-1.5">
          {/* Logic Layer */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="font-bold text-cyan-300">Logic Layer (−1)</span>
              <span className="text-[10px] text-muted-foreground">Collisions, Spawns & Triggers</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Authoritative</span>
          </div>

          {/* Visual Tile Layers */}
          {(mapDoc.tileLayers || []).map((layer: any, idx: number) => (
            <div
              key={layer.id || idx}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-[11px]"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-foreground font-medium">
                  Layer {idx}: {layer.name || `Visual Layer ${idx}`}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Opacity: {Math.round(((layer.opacity as number | undefined) ?? 1) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Map Metadata & Atmosphere */}
      <div className="mt-5 rounded-xl border border-border/60 bg-background/40 p-3.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Environment & Atmosphere
        </h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground">Biome:</span>{' '}
            <span className="text-foreground">{(mapDoc as any).biome || 'Temperate'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Weather:</span>{' '}
            <span className="text-foreground">{(mapDoc as any).weatherType || 'Clear'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Lighting:</span>{' '}
            <span className="text-foreground">{(mapDoc as any).lightingPreset || 'Day'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Recommended Level:</span>{' '}
            <span className="text-foreground">{(mapDoc as any).recommendedLevel || 1}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
