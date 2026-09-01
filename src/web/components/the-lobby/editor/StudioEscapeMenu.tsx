'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { useEditorStore } from './editor-store';
import {
  X,
  Settings,
  Save,
  Play,
  RotateCcw,
  Camera,
  Layers,
  Grid,
  Volume2,
  Keyboard,
  LogOut,
  Sparkles,
  Download,
  FolderOpen,
  Eye,
  Sliders,
  Check,
  Shield,
  HelpCircle,
  FileCode,
  Compass,
  Monitor,
  Maximize2,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { WindowMenuBar, WindowMenuTabGroup, WindowMenuDivider } from './WindowMenuBar';

interface StudioEscapeMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMap?: () => void;
  onExitStudio?: () => void;
}

type StudioTabType = 'PROJECT' | 'CAMERA' | 'GUIDES' | 'AUDIO' | 'SHORTCUTS';

export const StudioEscapeMenu: React.FC<StudioEscapeMenuProps> = ({
  isOpen,
  onClose,
  onSaveMap,
  onExitStudio,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTabType>('PROJECT');
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const mapDirty = useEditorStore((s) => s.mapDirty);
  const toggleCreationMode = useEditorStore((s) => s.toggleCreationMode);
  const resetLayout = useEditorStore((s) => s.resetLayout);

  // Studio Audio
  const [studioSfxMuted, setStudioSfxMuted] = useState(false);
  const [studioSfxVolume, setStudioSfxVolume] = useState(80);

  // Editor Guides state
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(30);
  const [showSkirt, setShowSkirt] = useState(true);
  const [showSpawns, setShowSpawns] = useState(true);

  // Viewport / Camera settings
  const [fov, setFov] = useState(45);
  const [panSens, setPanSens] = useState(100);
  const [orbitSens, setOrbitSens] = useState(100);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('saints_camera_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fov) setFov(parsed.fov);
        if (parsed.panSensitivity) setPanSens(parsed.panSensitivity);
        if (parsed.orbitSensitivity) setOrbitSens(parsed.orbitSensitivity);
      }
    } catch {}
  }, []);

  const handleExportMapJson = () => {
    soundSynth?.playActionSound?.();
    if (!activeMapData) {
      showToast('No active map loaded.');
      return;
    }
    const jsonStr = JSON.stringify(activeMapData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMapData.id || 'map'}_blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${activeMapData.id || 'map'} blueprint!`);
  };

  const handleSetViewAngle = (angle: 'isometric' | 'topdown' | 'front' | 'east' | 'west' | 'free') => {
    soundSynth?.playUiClick?.();
    const eng = (window as any).__babylonEngine;
    if (eng?.setViewAngle) {
      eng.setViewAngle(angle);
      showToast(`Camera view set to ${angle}`);
    }
  };

  const handleResetCamera = () => {
    soundSynth?.playUiClick?.();
    window.dispatchEvent(new CustomEvent('studio_reset_camera'));
    showToast('Camera reset to center.');
  };

  if (!isOpen) return null;

  const mapWidth = activeMapData?.width || activeMapData?.grid?.[0]?.length || 24;
  const mapHeight = activeMapData?.height || activeMapData?.grid?.length || 24;
  const visualLayersCount = activeMapData?.tileLayers?.length || 0;
  const freeformLayersCount = activeMapData?.freeformLayers?.length || 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md pointer-events-auto p-4 animate-in fade-in duration-150">
      <div className="flex h-[min(640px,94dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary/40 bg-[#050b14]/95 shadow-[0_0_50px_rgba(245,158,11,0.08)] backdrop-blur-xl">
        
        {/* OS Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a1628]/90 border-b border-border/40 select-none">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-wider text-foreground">
              SAINTS STUDIO OS
            </span>
            <span className="text-muted-foreground font-mono text-xs">•</span>
            <span className="text-xs text-primary font-mono font-bold">
              {activeMapData?.id || 'Untitled Map'}
            </span>
            {mapDirty && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold">
                UNSAVED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
              ESC to Resume
            </span>
            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                onClose();
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors cursor-pointer"
              title="Close System Menu (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Window Sub-Menu Ribbon */}
        <WindowMenuBar className="bg-[#030712]/90 px-3 py-1.5 border-b border-border/30">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                onClose();
              }}
              className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[10px] flex items-center gap-1.5 border border-primary/30 transition-all cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>Resume (Esc)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundSynth?.playActionSound?.();
                if (onSaveMap) onSaveMap();
                else window.dispatchEvent(new CustomEvent('studio_save_map'));
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mapDirty
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-card/40 text-muted-foreground hover:text-foreground border border-border/30'
              }`}
            >
              <Save className="w-3 h-3" />
              <span>Save Map (Ctrl+S)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                toggleCreationMode();
                onClose();
              }}
              className="px-2.5 py-1 rounded bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground text-[10px] font-bold flex items-center gap-1.5 border border-border/30 transition-all cursor-pointer"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Playtest (Ctrl+E)</span>
            </button>

            <WindowMenuDivider />

            <button
              type="button"
              onClick={handleExportMapJson}
              className="px-2.5 py-1 rounded bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground text-[10px] font-bold flex items-center gap-1.5 border border-border/30 transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export Blueprint</span>
            </button>
          </div>
        </WindowMenuBar>

        {/* Main Body with Sidebar Tabs */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Tabs Sidebar */}
          <div className="w-52 shrink-0 bg-[#03060c]/80 border-r border-border/30 p-2 space-y-1 overflow-y-auto custom-scrollbar">
            {[
              { id: 'PROJECT', label: 'Project & Map', icon: Layers },
              { id: 'CAMERA', label: 'Viewport Camera', icon: Camera },
              { id: 'GUIDES', label: 'Editor Guides', icon: Grid },
              { id: 'AUDIO', label: 'Studio Audio', icon: Volume2 },
              { id: 'SHORTCUTS', label: 'Shortcuts Reference', icon: Keyboard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setActiveTab(tab.id as StudioTabType);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Bottom Actions */}
            <div className="pt-4 mt-4 border-t border-border/20 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  if (onExitStudio) onExitStudio();
                  else {
                    toggleCreationMode();
                    useGameStore.getState().setGameMode('EXPLORING');
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Studio</span>
              </button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#050b14]/50">
            
            {/* TAB 1: PROJECT & MAP */}
            {activeTab === 'PROJECT' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Project & Map Document</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Metadata, layer structure, and lifecycle operations for the active world document.
                  </p>
                </div>

                {/* Map Quick Stats Card */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Document ID</span>
                    <span className="font-bold text-primary">{activeMapData?.id || 'DEMO_SANDBOX'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span className="font-bold text-foreground">{mapWidth} × {mapHeight} tiles</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Visual Layers</span>
                    <span className="font-bold text-foreground">{visualLayersCount} tile layers</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Freeform / Splats</span>
                    <span className="font-bold text-foreground">{freeformLayersCount} layers</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Default Spawn</span>
                    <span className="font-bold text-foreground">
                      ({activeMapData?.spawnX ?? 12}, {activeMapData?.spawnY ?? 12})
                    </span>
                  </div>
                </div>

                {/* Document Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playActionSound?.();
                      if (onSaveMap) onSaveMap();
                      else window.dispatchEvent(new CustomEvent('studio_save_map'));
                      showToast('Map saved successfully.');
                    }}
                    className="p-3 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <div className="text-left">
                      <div>Save Map</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Commit changes to database</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportMapJson}
                    className="p-3 rounded-lg bg-[#0a1628]/60 hover:bg-[#0a1628] border border-border/40 text-foreground font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    <div className="text-left">
                      <div>Export JSON</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Download blueprint package</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      toggleCreationMode();
                      onClose();
                    }}
                    className="p-3 rounded-lg bg-[#0a1628]/60 hover:bg-[#0a1628] border border-border/40 text-foreground font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <div>Enter Playtest</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Test gameplay & collisions</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      resetLayout();
                      showToast('Studio docks restored to default positions.');
                    }}
                    className="p-3 rounded-lg bg-[#0a1628]/60 hover:bg-[#0a1628] border border-border/40 text-foreground font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <div className="text-left">
                      <div>Reset Docks Layout</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Restore factory panel layout</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: VIEWPORT CAMERA */}
            {activeTab === 'CAMERA' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Viewport Camera Controls</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure angles, sensitivity, and perspective while authoring 2.5D/3D maps.
                  </p>
                </div>

                {/* Preset Angle Buttons */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-2.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Perspective Angle Presets
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'isometric', label: 'Isometric 45°' },
                      { id: 'topdown', label: 'Top-Down 90°' },
                      { id: 'front', label: 'Front Ortho' },
                      { id: 'east', label: 'East 45°' },
                      { id: 'west', label: 'West 45°' },
                      { id: 'free', label: 'Free Orbit' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSetViewAngle(p.id as any)}
                        className="px-2.5 py-1.5 rounded bg-[#060e1c] hover:bg-card border border-border/40 text-xs font-bold text-foreground transition-all cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sensitivity Sliders */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pan Sensitivity</span>
                      <span className="font-bold text-primary">{panSens}%</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={200}
                      step={5}
                      value={panSens}
                      onChange={(e) => setPanSens(parseInt(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Orbit Sensitivity</span>
                      <span className="font-bold text-primary">{orbitSens}%</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={200}
                      step={5}
                      value={orbitSens}
                      onChange={(e) => setOrbitSens(parseInt(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-border/20 flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetCamera}
                      className="px-3 py-1.5 rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Camera to Origin</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: GUIDES & OVERLAYS */}
            {activeTab === 'GUIDES' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Editor Visual Guides</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Control visibility of viewport gridlines, author overlays, and boundary indicators.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                    <span>Ground Grid Overlay (G)</span>
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  {showGrid && (
                    <div className="space-y-1 pl-3 border-l-2 border-primary/40">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Grid Line Opacity</span>
                        <span className="font-bold text-primary">{gridOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={gridOpacity}
                        onChange={(e) => setGridOpacity(parseInt(e.target.value))}
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                    </div>
                  )}

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Map Boundary Edge Skirt</span>
                    <input
                      type="checkbox"
                      checked={showSkirt}
                      onChange={(e) => setShowSkirt(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Author Spawn & Portal Markers</span>
                    <input
                      type="checkbox"
                      checked={showSpawns}
                      onChange={(e) => setShowSpawns(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: STUDIO AUDIO */}
            {activeTab === 'AUDIO' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Studio Audio Preferences</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Audio synthesizer sound feedback for tools, clicks, and dock interactions.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                    <span>Mute UI Sound Effects</span>
                    <input
                      type="checkbox"
                      checked={studioSfxMuted}
                      onChange={(e) => setStudioSfxMuted(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  {!studioSfxMuted && (
                    <div className="space-y-1.5 pt-2 border-t border-border/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Studio SFX Volume</span>
                        <span className="font-bold text-primary">{studioSfxVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={studioSfxVolume}
                        onChange={(e) => {
                          setStudioSfxVolume(parseInt(e.target.value));
                          soundSynth?.playUiClick?.();
                        }}
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: SHORTCUTS REFERENCE */}
            {activeTab === 'SHORTCUTS' && (
              <div className="space-y-4 max-w-2xl font-mono text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Studio Keyboard Shortcuts</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Essential key combinations for rapid 2.5D/3D level editing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      category: 'Tools',
                      items: [
                        { key: 'B', desc: 'Brush / Paint Tool' },
                        { key: 'E', desc: 'Eraser Tool' },
                        { key: 'I', desc: 'Eyedropper / Sample' },
                        { key: 'G', desc: 'Bucket Fill' },
                        { key: 'S / M', desc: 'Selection Box' },
                        { key: 'Space', desc: 'Pan Camera (Hold)' },
                      ],
                    },
                    {
                      category: 'Clipboard & Stamp',
                      items: [
                        { key: 'Ctrl + C', desc: 'Copy Selection' },
                        { key: 'Ctrl + X', desc: 'Cut Selection' },
                        { key: 'Ctrl + V', desc: 'Paste Stamp' },
                        { key: 'Ctrl + D / Esc', desc: 'Deselect / Cancel' },
                        { key: 'R / Shift+R', desc: 'Rotate Stamp 90°' },
                        { key: '[ / ]', desc: 'Rotate Stamp 15°' },
                      ],
                    },
                    {
                      category: 'Project & Modes',
                      items: [
                        { key: 'Ctrl + S', desc: 'Save Map' },
                        { key: 'Ctrl + E', desc: 'Toggle Playtest' },
                        { key: 'Ctrl + K', desc: 'Omnisearch Palette' },
                        { key: 'Ctrl + Shift + A', desc: 'Asset Studio' },
                        { key: 'Home', desc: 'Reset Camera' },
                        { key: 'Escape', desc: 'Studio System Menu' },
                      ],
                    },
                    {
                      category: 'Camera View Angles',
                      items: [
                        { key: 'Numpad 7', desc: 'Top-Down 90°' },
                        { key: 'Numpad 1', desc: 'Front View' },
                        { key: 'Numpad 3', desc: 'East View' },
                        { key: 'Page Up / Down', desc: 'Pitch Tilt' },
                      ],
                    },
                  ].map((grp) => (
                    <div key={grp.category} className="p-3 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-2">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {grp.category}
                      </div>
                      <div className="space-y-1.5">
                        {grp.items.map((it) => (
                          <div key={it.key} className="flex items-center justify-between text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-[#03060c] border border-border/40 font-bold text-slate-200">
                              {it.key}
                            </span>
                            <span className="text-muted-foreground">{it.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* OS Window Footer Bar */}
        <div className="px-4 py-2 bg-[#0a1628]/90 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground select-none">
          <div className="flex items-center gap-3">
            <span>Saints Gaming World Studio</span>
            <span>•</span>
            <span>Engine: Babylon.js 2.5D/3D</span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              onClose();
            }}
            className="px-3 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary font-bold border border-primary/40 transition-all cursor-pointer"
          >
            Resume Editing
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudioEscapeMenu;
