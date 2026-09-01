'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import {
  Camera,
  Compass,
  Eye,
  Maximize2,
  Sliders,
  RotateCw,
  RotateCcw,
  Sparkles,
  Grid3X3,
  Move,
  Shuffle,
  Shield,
  Layers,
  ZoomIn,
  Check,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

type CameraTab = 'studio' | 'player' | 'transforms';

export const CameraSettingsPanel: React.FC = () => {
  const isStudioFreeCam = useEditorStore((state) => state.isStudioFreeCam);
  const setStudioFreeCam = useEditorStore((state) => state.setStudioFreeCam);
  const brushRotation = useEditorStore((state) => state.brushRotation || 0);
  const setBrushRotation = useEditorStore((state) => state.setBrushRotation);
  const stampScale = useEditorStore((state) => state.stampScale || 1);
  const setStampScale = useEditorStore((state) => state.setStampScale);
  const splatRotationRandomize = useEditorStore((state) => state.splatRotationRandomize);
  const setSplatRotationRandomize = useEditorStore((state) => state.setSplatRotationRandomize);
  const showToast = useGameStore((state) => state.showToast);

  const [activeTab, setActiveTab] = useState<CameraTab>('studio');

  // Studio Camera Local State (persisted & synced with BabylonEngine)
  const [fov, setFov] = useState(45); // degrees
  const [orbitSensitivity, setOrbitSensitivity] = useState(100); // percent
  const [panSensitivity, setPanSensitivity] = useState(100); // percent
  const [damping, setDamping] = useState(90); // percent
  const [invertOrbitX, setInvertOrbitX] = useState(false);
  const [invertOrbitY, setInvertOrbitY] = useState(false);
  const [cursorAnchoredZoom, setCursorAnchoredZoom] = useState(true);

  // Player / In-Game Camera State
  const [playerCameraStyle, setPlayerCameraStyle] = useState<'isometric' | 'follow45' | 'topdown' | 'free'>('isometric');
  const [followSmoothing, setFollowSmoothing] = useState(35); // percent
  const [borderClamping, setBorderClamping] = useState(true);
  const [vignetteEnabled, setVignetteEnabled] = useState(true);
  const [vignetteWeight, setVignetteWeight] = useState(15); // 1.5 default

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saints_camera_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fov) setFov(parsed.fov);
        if (parsed.orbitSensitivity) setOrbitSensitivity(parsed.orbitSensitivity);
        if (parsed.panSensitivity) setPanSensitivity(parsed.panSensitivity);
        if (parsed.damping) setDamping(parsed.damping);
        if (parsed.invertOrbitX !== undefined) setInvertOrbitX(parsed.invertOrbitX);
        if (parsed.invertOrbitY !== undefined) setInvertOrbitY(parsed.invertOrbitY);
        if (parsed.cursorAnchoredZoom !== undefined) setCursorAnchoredZoom(parsed.cursorAnchoredZoom);
        if (parsed.playerCameraStyle) setPlayerCameraStyle(parsed.playerCameraStyle);
        if (parsed.followSmoothing) setFollowSmoothing(parsed.followSmoothing);
        if (parsed.borderClamping !== undefined) setBorderClamping(parsed.borderClamping);
        if (parsed.vignetteEnabled !== undefined) setVignetteEnabled(parsed.vignetteEnabled);
        if (parsed.vignetteWeight) setVignetteWeight(parsed.vignetteWeight);
      }
    } catch {}
  }, []);

  // Sync to BabylonEngine whenever parameters change
  const syncSettingsToEngine = () => {
    const fovRad = (fov * Math.PI) / 180;
    window.dispatchEvent(
      new CustomEvent('studio_update_camera_settings', {
        detail: {
          settings: {
            fov: fovRad,
            orbitSensitivity: orbitSensitivity / 100,
            panSensitivity: panSensitivity / 100,
            damping: damping / 100,
            invertOrbitX,
            invertOrbitY,
            cursorAnchoredZoom,
            playerFollowSmoothing: followSmoothing / 100,
            vignetteEnabled,
            vignetteWeight: vignetteWeight / 10,
          },
        },
      })
    );

    try {
      localStorage.setItem(
        'saints_camera_settings',
        JSON.stringify({
          fov,
          orbitSensitivity,
          panSensitivity,
          damping,
          invertOrbitX,
          invertOrbitY,
          cursorAnchoredZoom,
          playerCameraStyle,
          followSmoothing,
          borderClamping,
          vignetteEnabled,
          vignetteWeight,
        })
      );
    } catch {}
  };

  useEffect(() => {
    syncSettingsToEngine();
  }, [
    fov,
    orbitSensitivity,
    panSensitivity,
    damping,
    invertOrbitX,
    invertOrbitY,
    cursorAnchoredZoom,
    followSmoothing,
    vignetteEnabled,
    vignetteWeight,
  ]);

  const handleSetViewAngle = (angle: 'isometric' | 'topdown' | 'front' | 'back' | 'east' | 'west' | 'free') => {
    soundSynth?.playUiClick?.();
    if (!isStudioFreeCam && angle !== 'isometric') {
      setStudioFreeCam(true);
    }
    window.dispatchEvent(new CustomEvent('studio_set_view_angle', { detail: { angle } }));
    showToast(`Camera aligned to: ${angle.toUpperCase()}`);
  };

  const handleResetCamera = () => {
    soundSynth?.playActionSound?.();
    setFov(45);
    setOrbitSensitivity(100);
    setPanSensitivity(100);
    setDamping(90);
    setInvertOrbitX(false);
    setInvertOrbitY(false);
    setCursorAnchoredZoom(true);
    setFollowSmoothing(35);
    setVignetteEnabled(true);
    setVignetteWeight(15);
    window.dispatchEvent(new CustomEvent('studio_reset_camera'));
    showToast('Camera settings restored to default');
  };

  const tabs: Array<{ id: CameraTab; label: string; icon: React.ReactNode }> = [
    { id: 'studio', label: 'Studio Camera', icon: <Camera className="w-3 h-3 text-primary" /> },
    { id: 'player', label: 'Player (In-Game)', icon: <Eye className="w-3 h-3 text-amber-400" /> },
    { id: 'transforms', label: 'Object Rotation', icon: <Compass className="w-3 h-3 text-cyan-400" /> },
  ];

  return (
    <div className="h-full w-full flex flex-col font-mono text-xs bg-[#050b14]/50">
      {/* ── Sub-Menu Bar Tabs ── */}
      <div className="flex items-center gap-1 p-1.5 border-b border-border/30 bg-[#0a1628]/40 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                setActiveTab(tab.id);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* TAB 1: STUDIO CAMERA */}
        {activeTab === 'studio' && (
          <div className="space-y-4">
            {/* View Mode & FreeCam Toggle */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-foreground">Projection Mode</div>
                  <div className="text-[9px] text-muted-foreground">
                    {isStudioFreeCam ? '3D Perspective Free-Cam (Full 360° Orbit)' : '2.5D Orthographic Isometric (Fixed Angle)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setStudioFreeCam(!isStudioFreeCam);
                    showToast(isStudioFreeCam ? 'Switched to 2.5D Isometric' : 'Switched to 3D Free-Cam');
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                    isStudioFreeCam
                      ? 'bg-primary text-black font-bold border-primary'
                      : 'bg-[#0b1626] text-muted-foreground border-border/40 hover:border-primary/40'
                  }`}
                >
                  {isStudioFreeCam ? '3D Free-Cam ON' : '2.5D Isometric'}
                </button>
              </div>
            </div>

            {/* Quick View Angle Presets */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                View Angle Presets
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'isometric', label: 'Isometric 45°', desc: 'Standard 2.5D' },
                  { id: 'topdown', label: 'Top-Down 90°', desc: 'Numpad 7' },
                  { id: 'front', label: 'Front South', desc: 'Numpad 1' },
                  { id: 'east', label: 'Side East', desc: 'Numpad 3' },
                  { id: 'west', label: 'Side West', desc: 'Left view' },
                  { id: 'back', label: 'Back North', desc: 'Rear angle' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSetViewAngle(preset.id as any)}
                    className="p-1.5 rounded bg-[#060e1c] border border-border/30 hover:border-primary/40 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-bold text-foreground">{preset.label}</div>
                    <div className="text-[8px] text-muted-foreground">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Parameters */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Controls & Sensitivities
              </div>

              {/* FOV */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">Field of View (FOV)</span>
                <input
                  type="range"
                  min={25}
                  max={85}
                  step={1}
                  value={fov}
                  onChange={(e) => setFov(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{fov}°</span>
              </div>

              {/* Orbit Sensitivity */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">Orbit Speed</span>
                <input
                  type="range"
                  min={20}
                  max={250}
                  step={5}
                  value={orbitSensitivity}
                  onChange={(e) => setOrbitSensitivity(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{orbitSensitivity}%</span>
              </div>

              {/* Pan Sensitivity */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">Pan Speed</span>
                <input
                  type="range"
                  min={20}
                  max={250}
                  step={5}
                  value={panSensitivity}
                  onChange={(e) => setPanSensitivity(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{panSensitivity}%</span>
              </div>

              {/* Smoothing / Inertia */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">Inertia Damping</span>
                <input
                  type="range"
                  min={50}
                  max={98}
                  step={1}
                  value={damping}
                  onChange={(e) => setDamping(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{damping}%</span>
              </div>

              {/* Toggle Row */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20">
                <label className="flex items-center gap-2 cursor-pointer text-[9px] text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={invertOrbitX}
                    onChange={(e) => setInvertOrbitX(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <span>Invert Orbit X</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[9px] text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={invertOrbitY}
                    onChange={(e) => setInvertOrbitY(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <span>Invert Orbit Y</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[9px] text-muted-foreground hover:text-foreground col-span-2">
                  <input
                    type="checkbox"
                    checked={cursorAnchoredZoom}
                    onChange={(e) => setCursorAnchoredZoom(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <span>Cursor-Anchored Zoom (Zoom toward pointer)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IN-GAME PLAYER CAMERA */}
        {activeTab === 'player' && (
          <div className="space-y-4">
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Player Camera Style
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'isometric', label: 'Classic 2.5D Isometric', desc: 'Angled top-down look' },
                  { id: 'follow45', label: 'Follow Perspective', desc: 'Over-the-shoulder angle' },
                  { id: 'topdown', label: 'Classic Top-Down', desc: 'Direct 90° overhead' },
                  { id: 'free', label: 'Free Orbit 3D', desc: 'Player-controlled rotation' },
                ].map((style) => {
                  const isSelected = playerCameraStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        setPlayerCameraStyle(style.id as any);
                        showToast(`Player camera style set to: ${style.label}`);
                      }}
                      className={`p-2 rounded text-left border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-foreground'
                          : 'bg-[#060e1c] border-border/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="text-[10px] font-bold">{style.label}</div>
                      <div className="text-[8px] text-muted-foreground">{style.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Follow Spring Smoothness */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Follow Dynamics & Visuals
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">Follow Smoothness</span>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={followSmoothing}
                  onChange={(e) => setFollowSmoothing(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{followSmoothing}%</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">Vignette Darkness</span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={vignetteWeight}
                  onChange={(e) => setVignetteWeight(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{(vignetteWeight / 10).toFixed(1)}</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-[9px] text-muted-foreground hover:text-foreground pt-1 border-t border-border/20">
                <input
                  type="checkbox"
                  checked={borderClamping}
                  onChange={(e) => setBorderClamping(e.target.checked)}
                  className="rounded accent-primary"
                />
                <span>Map Boundary Clamping (Keep player centered unless at edge)</span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: OBJECT & BRUSH TRANSFORMS */}
        {activeTab === 'transforms' && (
          <div className="space-y-4">
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Active Brush / Splat Rotation
                </div>
                <button
                  type="button"
                  onClick={() => setSplatRotationRandomize(!splatRotationRandomize)}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                    splatRotationRandomize
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-[#060e1c] border-border/40 text-muted-foreground'
                  }`}
                >
                  {splatRotationRandomize ? 'Randomized' : 'Fixed Angle'}
                </button>
              </div>

              {!splatRotationRandomize && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground w-16 shrink-0 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-primary" /> Angle
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={brushRotation}
                      onChange={(e) => setBrushRotation(parseInt(e.target.value))}
                      className="flex-1 accent-primary h-1 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-primary w-10 text-right">{brushRotation}°</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBrushRotation(((brushRotation - 90) % 360 + 360) % 360)}
                      className="flex-1 py-1 rounded bg-[#060e1c] border border-border/30 hover:border-primary/40 text-[9px] font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> -90° (Shift+R)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrushRotation(((brushRotation + 90) % 360 + 360) % 360)}
                      className="flex-1 py-1 rounded bg-[#060e1c] border border-border/30 hover:border-primary/40 text-[9px] font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-2.5 h-2.5" /> +90° (R)
                    </button>
                    {[0, 45, 180, 270].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBrushRotation(d)}
                        className={`px-2 py-1 rounded border text-[9px] font-bold transition-colors cursor-pointer ${
                          brushRotation === d ? 'bg-primary/20 border-primary text-primary' : 'bg-[#060e1c] border-border/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {d}°
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stamp Scale */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                <span className="text-[9px] text-muted-foreground w-16 shrink-0">Scale</span>
                <input
                  type="range"
                  min={50}
                  max={250}
                  step={10}
                  value={Math.round(stampScale * 100)}
                  onChange={(e) => setStampScale(parseInt(e.target.value) / 100)}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{Math.round(stampScale * 100)}%</span>
              </div>
            </div>

            {/* Shortcut Reference Guide */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Keyboard & Mouse Controls
              </div>
              <div className="space-y-1 text-[9px] text-muted-foreground">
                <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                  <span>Rotate Object / Stamp (+90°):</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-border/40 font-mono text-primary font-bold">R</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                  <span>Rotate Object / Stamp (-90°):</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-border/40 font-mono text-primary font-bold">Shift + R</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                  <span>Fine Rotate (15° steps):</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-border/40 font-mono text-primary font-bold">[ / ]</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                  <span>Wheel Rotate Object (No Camera Move):</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-border/40 font-mono text-primary font-bold">Shift + Wheel</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-border/10">
                  <span>Camera Orbit (No Object Drop):</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-border/40 font-mono text-primary font-bold">Right-Click Drag</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span>Camera Pan:</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-border/40 font-mono text-primary font-bold">Middle-Click Drag</kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Reset ── */}
      <div className="p-2 border-t border-border/30 bg-[#0a1628]/40 flex items-center justify-between shrink-0">
        <span className="text-[9px] text-muted-foreground">Settings auto-save to browser profile</span>
        <button
          type="button"
          onClick={handleResetCamera}
          className="px-2.5 py-1 rounded bg-[#0b1626] border border-border/30 hover:border-primary/40 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Reset Defaults
        </button>
      </div>
    </div>
  );
};
