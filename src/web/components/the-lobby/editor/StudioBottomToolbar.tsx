'use client';

import React, { useState, useEffect } from 'react';
import {
  Brush, Eraser, Pipette, Hand, SquareDashed, Box, DoorOpen,
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Save,
  Hammer, Globe, Settings2, Package, ImageIcon, Users,
  ScrollText, MessageSquare, Sword, PawPrint, Flame,
  Coins, UserCheck, AlertCircle, TerminalSquare, UserRound,
  Play, Shield, Grid3X3, MapPin, CheckCircle2, ChevronUp,
  FlipHorizontal, FlipVertical, RotateCw, Activity, Sparkles
} from 'lucide-react';
import { useEditorStore, PanelId, STUDIO_DOCK_META } from './editor-store';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { canUseStudioDock } from '@/shared/game/studioPermissions';
import { ensureWorldProfiles, setActiveWorldProfile } from '@/app/actions/world-profiles';
import { WORLD_PROFILES } from '@/shared/game/worldProfiles';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { useSession } from 'next-auth/react';
import { Actions, DockLocation, Model } from 'flexlayout-react';

interface StudioBottomToolbarProps {
  layoutRef: React.RefObject<any>;
  model: Model;
  onOpenMapBrowser?: () => void;
  onOpenAssetBrowser?: () => void;
}

export const StudioBottomToolbar: React.FC<StudioBottomToolbarProps> = ({
  layoutRef,
  model,
  onOpenMapBrowser,
  onOpenAssetBrowser,
}) => {
  const { data: session } = useSession();
  const permissionLevel = session?.user?.permissionLevel ?? 0;
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const setActiveGameId = useEditorStore((s) => s.setActiveGameId);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const definitionStack = useEditorStore((s) => s.definitionOpStack);
  const brushRadius = useEditorStore((s) => s.brushRadius);
  const setBrushRadius = useEditorStore((s) => s.setBrushRadius);
  const brushMode = useEditorStore((s) => s.brushMode);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const activeLogicTileId = useEditorStore((s) => s.activeLogicTileId);
  const showEditorCoords = useEditorStore((s) => s.showEditorCoords);
  const setShowEditorCoords = useEditorStore((s) => s.setShowEditorCoords);
  const showWarpOverlays = useEditorStore((s) => s.showWarpOverlays);
  const setShowWarpOverlays = useEditorStore((s) => s.setShowWarpOverlays);
  const showSpawnOverlays = useEditorStore((s) => s.showSpawnOverlays);
  const setShowSpawnOverlays = useEditorStore((s) => s.setShowSpawnOverlays);
  const stampTransform = useEditorStore((s) => s.stampTransform);
  const flipStampH = useEditorStore((s) => s.flipStampH);
  const flipStampV = useEditorStore((s) => s.flipStampV);
  const rotateStampCW = useEditorStore((s) => s.rotateStampCW);
  const activeLocks = useEditorStore((s) => s.activeLocks);

  const activeMapData = useGameStore((s) => s.activeMapData);
  const logicTiles = useGameStore((s) => s.logicTiles);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const latencyMs = useGameStore((s) => s.latencyMs);
  const otherPlayers = useGameStore((s) => s.otherPlayers);
  const showToast = useGameStore((s) => s.showToast);

  const [profiles, setProfiles] = useState(WORLD_PROFILES.map((p) => ({ ...p, isActive: p.id === activeGameId })));
  const [busy, setBusy] = useState(false);

  const peerCount = Object.keys(otherPlayers || {}).length;
  const defsDirtyCount = definitionStack.undo.length;
  const canDev = canUseStudioDock(permissionLevel, 'dev');

  // Hydrate world profiles
  useEffect(() => {
    void (async () => {
      const res = await ensureWorldProfiles();
      if (res.success) {
        setProfiles(res.profiles);
      }
    })();
  }, []);

  const [zoomPercent, setZoomPercent] = useState<number>(100);

  useEffect(() => {
    const handleZoomChanged = (e: Event) => {
      const custom = e as CustomEvent<{ ortho: number; percent: number }>;
      if (custom.detail?.percent) {
        setZoomPercent(custom.detail.percent);
      }
    };
    window.addEventListener('studio_zoom_changed', handleZoomChanged);
    return () => window.removeEventListener('studio_zoom_changed', handleZoomChanged);
  }, []);

  const onSwitchProfile = async (id: string) => {
    soundSynth?.playSelectSound?.();
    setBusy(true);
    setActiveGameId(id);
    await setActiveWorldProfile(id);
    setBusy(false);
  };

  const handleUndo = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = useEditorStore.getState().triggerUndo(activeMapData);
    if (res.ok) showToast('Undo');
    else showToast('Nothing to undo');
  };

  const handleRedo = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = useEditorStore.getState().triggerRedo(activeMapData);
    if (res.ok) showToast('Redo');
    else showToast('Nothing to redo');
  };

  const handleFitMap = () => {
    soundSynth?.playSelectSound?.();
    window.dispatchEvent(new CustomEvent('studio_fit_map'));
  };

  const handleSetPresetZoom = (percent: number) => {
    soundSynth?.playUiClick?.();
    setZoomPercent(percent);
    window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent } }));
  };

  const handleZoomIn = () => {
    soundSynth?.playUiClick?.();
    const next = Math.min(400, Math.round(zoomPercent * 1.25));
    handleSetPresetZoom(next);
  };

  const handleZoomOut = () => {
    soundSynth?.playUiClick?.();
    const next = Math.max(15, Math.round(zoomPercent * 0.8));
    handleSetPresetZoom(next);
  };

  const openDockTab = (id: PanelId) => {
    soundSynth?.playSelectSound?.();
    const meta = STUDIO_DOCK_META[id];
    if (!meta || !layoutRef?.current) return;

    const existingNode = model.getNodeById(id);
    if (existingNode) {
      model.doAction(Actions.selectTab(id));
    } else {
      const isRightDock = id === 'properties' || id === 'problems';
      const targetTabsetId = isRightDock ? 'right-dock' : 'left-dock';
      try {
        model.doAction(Actions.addNode({
          type: 'tab',
          id,
          name: meta.label,
          component: id,
        }, targetTabsetId, DockLocation.CENTER, -1));
      } catch {
        model.doAction(Actions.addNode({
          type: 'tab',
          id,
          name: meta.label,
          component: id,
        }, 'left-dock', DockLocation.CENTER, -1));
      }
    }
  };

  const isLogic = activeLayerIdx === -1;
  const layerName = isLogic
    ? 'Logic (−1)'
    : activeMapData?.tileLayers?.[activeLayerIdx]?.name || `Layer ${activeLayerIdx}`;
  const displayBrushId = isLogic ? activeLogicTileId : activeBrushTileId;
  const logicMeta = isLogic ? logicTiles[displayBrushId] : null;

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-10 z-[120] bg-[#050b14]/95 border-t border-amber-500/30 flex items-center justify-between px-3 text-xs font-mono text-slate-300 select-none shadow-[0_-4px_25px_rgba(0,0,0,0.6)] backdrop-blur-md">
      
      {/* ─── ZONE 1: Paint Tools (Brush, Erase, Sample, Pan, Select, Prefab, Gate) ─── */}
      <div className="flex items-center gap-1.5 shrink-0 border-r border-amber-500/20 pr-3">
        <div className="flex items-center gap-1 bg-black/60 rounded-xl p-0.5 border border-amber-500/30">
          <button
            type="button"
            onClick={() => setBrushMode('paint')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              brushMode === 'paint'
                ? 'bg-amber-400 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Paint Brush (Left Click)"
          >
            <Brush className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('erase')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              brushMode === 'erase'
                ? 'bg-rose-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Eraser (Zero Tile)"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('eyedropper')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              brushMode === 'eyedropper'
                ? 'bg-sky-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Eyedropper / Sample"
          >
            <Pipette className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('pan')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              brushMode === 'pan'
                ? 'bg-emerald-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Pan Viewport"
          >
            <Hand className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('select')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              brushMode === 'select'
                ? 'bg-purple-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Box Select"
          >
            <SquareDashed className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('prefab')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              brushMode === 'prefab'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Prefab Stamp"
          >
            <Box className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setBrushMode('gate');
              setShowWarpOverlays(true);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              brushMode === 'gate'
                ? 'bg-purple-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-purple-300 hover:bg-white/10'
            }`}
            title="Warp Gate Tool"
          >
            <DoorOpen className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-1 bg-black/40 border border-amber-500/20 rounded-xl px-2 py-1 text-[10px]">
          <span className="text-slate-500">Size</span>
          <button
            onClick={() => {
              const SIZES = [1, 3, 5, 7];
              let idx = SIZES.indexOf(brushRadius);
              if (idx === -1) idx = 1;
              idx = (idx - 1 + SIZES.length) % SIZES.length;
              setBrushRadius(SIZES[idx]);
            }}
            className="hover:text-amber-300 font-bold px-0.5 cursor-pointer"
          >
            −
          </button>
          <span className="font-bold text-amber-400">{brushRadius}</span>
          <button
            onClick={() => {
              const SIZES = [1, 3, 5, 7];
              let idx = SIZES.indexOf(brushRadius);
              if (idx === -1) idx = 0;
              idx = (idx + 1) % SIZES.length;
              setBrushRadius(SIZES[idx]);
            }}
            className="hover:text-amber-300 font-bold px-0.5 cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Stamp Transform Controls (X/Y/Z) */}
        <div className="flex items-center gap-0.5 bg-black/40 border border-amber-500/20 rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              flipStampH();
              showToast(`Stamp Flip H: ${!stampTransform.flipH ? 'ON' : 'OFF'} (X)`);
            }}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              stampTransform.flipH
                ? 'bg-amber-400 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Flip Stamp Horizontally (X)"
          >
            <FlipHorizontal className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              flipStampV();
              showToast(`Stamp Flip V: ${!stampTransform.flipV ? 'ON' : 'OFF'} (Y)`);
            }}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              stampTransform.flipV
                ? 'bg-amber-400 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Flip Stamp Vertically (Y)"
          >
            <FlipVertical className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              rotateStampCW();
              const nextRot = (stampTransform.rotation + 90) % 360;
              showToast(`Stamp Rotate: ${nextRot}° (Z)`);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Rotate Stamp 90° CW (Z)"
          >
            <RotateCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ─── ZONE 2: Layer & Brush Display Chips ─── */}
      <div className="flex items-center gap-2 shrink-0 border-r border-amber-500/20 pr-3">
        {/* Layer chip */}
        <div
          onClick={() => {
            // Quick toggle between Logic (-1) and Visual (0)
            setActiveLayerIdx(isLogic ? 0 : -1);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
            isLogic
              ? 'border-rose-400/50 bg-rose-950/60 text-rose-200 hover:bg-rose-900/60'
              : 'border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
          }`}
          title="Click to toggle Logic (−1) / Visual layer"
        >
          {isLogic ? <Shield className="h-3 w-3" /> : <Grid3X3 className="h-3 w-3" />}
          <span>{layerName}</span>
        </div>

        {/* Brush Info chip */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-amber-500/20 bg-black/60 text-[10px] text-slate-200"
          title={logicMeta ? `${logicMeta.name} — #${displayBrushId}` : `Visual GID: ${displayBrushId}`}
        >
          <Brush className="h-3 w-3 text-amber-400" />
          {logicMeta ? (
            <>
              <span className={`h-2 w-2 rounded-sm border border-white/20 ${logicMeta.color || 'bg-slate-500'}`} />
              <span className="max-w-[100px] truncate font-bold text-amber-100">{logicMeta.name}</span>
            </>
          ) : (
            <span className="font-bold text-white">GID {displayBrushId}</span>
          )}
        </div>

        {/* Overlays toggles (XY, Gates, Spawns) */}
        <button
          type="button"
          onClick={() => setShowEditorCoords(!showEditorCoords)}
          className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
            showEditorCoords
              ? 'border-sky-500/40 bg-sky-950/50 text-sky-200'
              : 'border-slate-800 bg-black/40 text-slate-500 hover:text-slate-300'
          }`}
        >
          XY
        </button>
        <button
          type="button"
          onClick={() => setShowWarpOverlays(!showWarpOverlays)}
          className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
            showWarpOverlays
              ? 'border-amber-500/40 bg-amber-950/50 text-amber-200'
              : 'border-slate-800 bg-black/40 text-slate-500 hover:text-slate-300'
          }`}
        >
          Gates
        </button>
        <button
          type="button"
          onClick={() => setShowSpawnOverlays(!showSpawnOverlays)}
          className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-colors cursor-pointer ${
            showSpawnOverlays
              ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
              : 'border-slate-800 bg-black/40 text-slate-500 hover:text-slate-300'
          }`}
        >
          Spawns
        </button>
      </div>

      {/* ─── ZONE 3: Dock Panel Launchers (World, Atlas, Assets, Entities, Systems) ─── */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-full px-1">
        <PanelDockButton id="build" icon={<Hammer className="w-3.5 h-3.5" />} label="World" onClick={() => openDockTab('build')} />
        <PanelDockButton
          id="atlas"
          icon={<Globe className="w-3.5 h-3.5" />}
          label="Atlas"
          onClick={() => {
            if (onOpenMapBrowser) onOpenMapBrowser();
            else openDockTab('atlas');
          }}
          onDoubleClick={() => openDockTab('atlas')}
          title="Atlas Studio (Click for Full Workspace, Double-click for Dock)"
        />
        <PanelDockButton id="properties" icon={<Settings2 className="w-3.5 h-3.5" />} label="Inspector" onClick={() => openDockTab('properties')} />
        <PanelDockButton id="prefab" icon={<Package className="w-3.5 h-3.5" />} label="Prefabs" onClick={() => openDockTab('prefab')} />
        <PanelDockButton
          id="assets"
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          label="Assets"
          onClick={(e) => {
            if (e.shiftKey || !openDockTab) onOpenAssetBrowser?.();
            else openDockTab('assets');
          }}
          onDoubleClick={onOpenAssetBrowser}
          title="Asset Browser (Double-click / Shift-click for Full-Screen)"
        />

        <div className="w-px h-5 bg-amber-500/20 mx-1 shrink-0" />

        <PanelDockButton id="npc" icon={<Users className="w-3.5 h-3.5" />} label="NPCs" onClick={() => openDockTab('npc')} />
        <PanelDockButton id="quest" icon={<ScrollText className="w-3.5 h-3.5" />} label="Quests" onClick={() => openDockTab('quest')} />
        <PanelDockButton id="dialogue" icon={<MessageSquare className="w-3.5 h-3.5" />} label="Dialogue" onClick={() => openDockTab('dialogue')} />
        <PanelDockButton id="characters" icon={<Sword className="w-3.5 h-3.5" />} label="Heroes" onClick={() => openDockTab('characters')} />
        <PanelDockButton id="creature" icon={<PawPrint className="w-3.5 h-3.5" />} label="Creatures" onClick={() => openDockTab('creature')} />
        <PanelDockButton id="spawner" icon={<Flame className="w-3.5 h-3.5" />} label="Spawners" onClick={() => openDockTab('spawner')} />
        <PanelDockButton id="loot" icon={<Coins className="w-3.5 h-3.5" />} label="Loot" onClick={() => openDockTab('loot')} />
        <PanelDockButton id="items" icon={<Package className="w-3.5 h-3.5" />} label="Items" onClick={() => openDockTab('items')} />
        <PanelDockButton id="classes" icon={<UserCheck className="w-3.5 h-3.5" />} label="Classes" onClick={() => openDockTab('classes')} />
        <PanelDockButton id="gameplay" icon={<Activity className="w-3.5 h-3.5" />} label="Gameplay" onClick={() => openDockTab('gameplay')} />
        <PanelDockButton id="problems" icon={<AlertCircle className="w-3.5 h-3.5" />} label="Diagnostics" onClick={() => openDockTab('problems')} />
        {canDev && (
          <PanelDockButton id="dev" icon={<TerminalSquare className="w-3.5 h-3.5" />} label="Dev" onClick={() => openDockTab('dev')} />
        )}
      </div>

      {/* ─── ZONE 4: Global Actions (Undo, Redo, Zoom, Playtest, Save) ─── */}
      <div className="flex items-center gap-2 shrink-0 border-l border-amber-500/20 pl-3">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 bg-black/60 rounded-xl p-0.5 border border-amber-500/20">
          <button
            type="button"
            onClick={handleUndo}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3 w-3" />
          </button>
        </div>

        {/* Zoom Controls & Presets (Phase 2B) */}
        <div className="flex items-center gap-1 bg-black/60 rounded-xl p-1 border border-amber-500/20">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          
          {/* Zoom Percentage Dropdown */}
          <select
            value={zoomPercent}
            onChange={(e) => handleSetPresetZoom(parseInt(e.target.value, 10))}
            className="bg-[#050b14] border border-amber-500/30 rounded-lg px-1.5 py-0.5 text-[10px] text-amber-200 font-mono focus:outline-none focus:border-amber-400 cursor-pointer text-center"
            title="Zoom Presets (Ctrl+0 to Reset)"
          >
            <option value={15}>15%</option>
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={100}>100%</option>
            <option value={200}>200%</option>
            <option value={400}>400%</option>
            {![15, 25, 50, 100, 200, 400].includes(zoomPercent) && (
              <option value={zoomPercent}>{zoomPercent}%</option>
            )}
          </select>

          <button
            type="button"
            onClick={handleFitMap}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fit Map in View (Home)"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>

        {/* Soft Locks */}
        {Object.keys(activeLocks || {}).length > 0 && (
          <div className="flex items-center gap-1 text-rose-400 bg-rose-950/40 px-2 py-1 rounded-xl border border-rose-500/30 text-[10px]" title="Resource locks active">
            <AlertCircle className="w-3 h-3" />
            <span>{Object.keys(activeLocks).length} Lock(s)</span>
          </div>
        )}

        {/* Latency / FPS Status (Isolated Sub-Component for Performance - Phase 8 Track D1) */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-black/40 px-2 py-1 rounded-xl border border-slate-800">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                : 'bg-amber-400 animate-pulse'
            }`}
            title={`Realtime: ${connectionStatus} (${latencyMs}ms)`}
          />
          <FpsBadge />
          {peerCount > 0 && (
            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded border border-cyan-500/30 font-mono">
              {peerCount}P
            </span>
          )}
        </div>

        {/* Playtest Button */}
        <button
          type="button"
          onClick={() => {
            soundSynth?.playActionSound?.();
            useEditorStore.getState().enterPlaytest();
            showToast('Entered Playtest mode');
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[11px] uppercase tracking-wider hover:from-emerald-500 hover:to-teal-500 shadow-md transition-all cursor-pointer"
          title="Playtest Mode (Ctrl+E)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play</span>
        </button>

        {/* Save Map Button */}
        <button
          type="button"
          onClick={() => {
            if (mapDirty || defsDirtyCount > 0) {
              soundSynth?.playActionSound?.();
              window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
            }
          }}
          disabled={!mapDirty && defsDirtyCount === 0}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
            mapDirty || defsDirtyCount > 0
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black font-black hover:from-amber-400 hover:to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer'
              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
          }`}
          title="Save Map & Definitions (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save{mapDirty ? '*' : ''}</span>
        </button>
      </div>
    </div>
  );
};

const PanelDockButton: React.FC<{
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  title?: string;
}> = ({ id, icon, label, onClick, onDoubleClick, title }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={title || `Open ${label}`}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-slate-400 hover:text-white hover:bg-white/10 hover:border hover:border-amber-500/30 transition-all shrink-0 cursor-pointer"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

const FpsBadge: React.FC = React.memo(() => {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId = 0;
    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <span>{fps} FPS</span>;
});
FpsBadge.displayName = 'FpsBadge';

