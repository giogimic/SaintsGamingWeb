'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  Crosshair,
  Box,
  Layers2,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';

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
  const [isometricPitchAngle, setIsometricPitchAngle] = useState(45); // degrees tilt

  // Player / In-Game Camera State
  const activeMapData = useGameStore((s) => s.activeMapData);
  const [allowCustomPlayerCamera, setAllowCustomPlayerCamera] = useState<boolean>(
    Boolean((activeMapData as any)?.allowCustomCamera ?? (activeMapData as any)?.allowCustomPlayerCamera ?? false)
  );
  const [playerCameraStyle, setPlayerCameraStyle] = useState<'isometric' | 'follow45' | 'topdown' | 'free'>('isometric');
  const [followSmoothing, setFollowSmoothing] = useState(35); // percent
  const [borderClamping, setBorderClamping] = useState(true);
  const [vignetteEnabled, setVignetteEnabled] = useState(true);
  const [vignetteWeight, setVignetteWeight] = useState(15); // 1.5 default
  const isSyncingFromEngineRef = useRef(false);

  // Load from localStorage on mount and listen to engine camera state updates
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
        if (parsed.isometricPitchAngle) setIsometricPitchAngle(parsed.isometricPitchAngle);
        if (parsed.playerCameraStyle) setPlayerCameraStyle(parsed.playerCameraStyle);
        if (parsed.followSmoothing) setFollowSmoothing(parsed.followSmoothing);
        if (parsed.borderClamping !== undefined) setBorderClamping(parsed.borderClamping);
        if (parsed.vignetteEnabled !== undefined) setVignetteEnabled(parsed.vignetteEnabled);
        if (parsed.vignetteWeight) setVignetteWeight(parsed.vignetteWeight);
      }
    } catch {}

    const handleEngineCameraState = (e: Event) => {
      const custom = e as CustomEvent;
      const settings = custom.detail?.settings;
      if (!settings) return;

      isSyncingFromEngineRef.current = true;
      if (settings.fov !== undefined) {
        setFov(Math.round((settings.fov * 180) / Math.PI));
      }
      if (settings.playerCameraStyle) {
        setPlayerCameraStyle(settings.playerCameraStyle);
      }
      if (settings.borderClamping !== undefined) {
        setBorderClamping(settings.borderClamping);
      }
      if (settings.playerFollowSmoothing !== undefined) {
        setFollowSmoothing(Math.round(settings.playerFollowSmoothing * 100));
      }
      if (settings.isometricPitch !== undefined) {
        setIsometricPitchAngle(Math.round((settings.isometricPitch * 180) / Math.PI));
      }
      if (settings.vignetteEnabled !== undefined) {
        setVignetteEnabled(settings.vignetteEnabled);
      }
      if (settings.vignetteWeight !== undefined) {
        setVignetteWeight(Math.round(settings.vignetteWeight * 10));
      }
      setTimeout(() => {
        isSyncingFromEngineRef.current = false;
      }, 50);
    };

    window.addEventListener('studio_camera_state_changed', handleEngineCameraState);
    return () => {
      window.removeEventListener('studio_camera_state_changed', handleEngineCameraState);
    };
  }, []);

  // Sync to BabylonEngine whenever parameters change
  const syncSettingsToEngine = () => {
    if (isSyncingFromEngineRef.current) return;
    const fovRad = (fov * Math.PI) / 180;
    const pitchRad = (isometricPitchAngle * Math.PI) / 180;
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
            isometricPitch: pitchRad,
            playerCameraStyle,
            playerFollowSmoothing: followSmoothing / 100,
            borderClamping,
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
          isometricPitchAngle,
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
    isometricPitchAngle,
    playerCameraStyle,
    followSmoothing,
    borderClamping,
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
    setIsometricPitchAngle(45);
    setFollowSmoothing(35);
    setVignetteEnabled(true);
    setVignetteWeight(15);
    window.dispatchEvent(new CustomEvent('studio_reset_camera'));
    showToast('Camera settings restored to default');
  };

  const tabs = [
    { id: 'studio', label: 'Studio Camera', icon: Camera },
    { id: 'player', label: 'Player View', icon: Eye },
    { id: 'transforms', label: 'Object Rotation', icon: Compass },
  ];

  return (
    <div className="h-full w-full flex flex-col font-mono text-xs bg-[#050b14]/50 -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuTabGroup
          tabs={tabs}
          activeTab={activeTab}
          onChange={(t) => {
            soundSynth?.playUiClick?.();
            setActiveTab(t as CameraTab);
          }}
        />
        <WindowMenuDivider />
        <WindowMenuDropdown
          label="Presets"
          icon={Sliders}
          items={[
            {
              label: 'Classic 2.5D Isometric (45°)',
              onClick: () => handleSetViewAngle('isometric'),
            },
            {
              label: 'Top-Down Tactical (90°)',
              onClick: () => handleSetViewAngle('topdown'),
            },
            {
              label: 'Front Facing (South)',
              onClick: () => handleSetViewAngle('front'),
            },
            {
              label: 'Side Ortho (East)',
              onClick: () => handleSetViewAngle('east'),
            },
            { divider: true, label: '' },
            {
              label: 'Wide-Angle Cinematic (70° FOV)',
              onClick: () => setFov(70),
            },
            {
              label: 'Telephoto Ortho (30° FOV)',
              onClick: () => setFov(30),
            },
          ]}
        />
        <WindowMenuDropdown
          label="View"
          items={[
            {
              label: 'Fit Map In View',
              icon: Maximize2,
              shortcut: 'Home',
              onClick: () => window.dispatchEvent(new CustomEvent('studio_fit_map')),
            },
            {
              label: 'Align to South (Numpad 1)',
              onClick: () => handleSetViewAngle('front'),
            },
            {
              label: 'Align to East (Numpad 3)',
              onClick: () => handleSetViewAngle('east'),
            },
            {
              label: 'Align Top-Down (Numpad 7)',
              onClick: () => handleSetViewAngle('topdown'),
            },
          ]}
        />
        <div className="flex-1" />
        <WindowMenuButton
          label="Reset"
          icon={RefreshCw}
          onClick={handleResetCamera}
          title="Restore default camera angles and damping"
        />
      </WindowMenuBar>

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

              {/* Isometric Tilt Angle */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">2.5D Tilt Pitch</span>
                <input
                  type="range"
                  min={20}
                  max={75}
                  step={1}
                  value={isometricPitchAngle}
                  onChange={(e) => setIsometricPitchAngle(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{isometricPitchAngle}°</span>
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

              {/* Damping / Smoothing */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-24 shrink-0">Momentum Damping</span>
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

              {/* Inversions & Anchors */}
              <div className="pt-2 border-t border-border/20 grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-[10px] text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invertOrbitX}
                    onChange={(e) => setInvertOrbitX(e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span>Invert Orbit X</span>
                </label>
                <label className="flex items-center gap-2 text-[10px] text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invertOrbitY}
                    onChange={(e) => setInvertOrbitY(e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span>Invert Orbit Y</span>
                </label>
                <label className="col-span-2 flex items-center gap-2 text-[10px] text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cursorAnchoredZoom}
                    onChange={(e) => setCursorAnchoredZoom(e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span>Cursor-Anchored Zoom (Editor)</span>
                </label>
              </div>
            </div>

            {/* Shortcut Cheatsheet Card */}
            <div className="p-2.5 rounded-lg bg-[#060e1c] border border-border/30 space-y-1.5 text-[9px]">
              <div className="text-[10px] font-bold text-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> Camera & Brush Controls
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                <div><span className="text-foreground font-bold font-mono">Right / Middle Click Drag:</span> Orbit 3D Cam</div>
                <div><span className="text-foreground font-bold font-mono">Space + Left Drag:</span> Pan Viewport</div>
                <div><span className="text-foreground font-bold font-mono">Mouse Wheel:</span> Cursor Zoom In/Out</div>
                <div><span className="text-foreground font-bold font-mono">Shift + Wheel:</span> Rotate Brush ±15°</div>
                <div><span className="text-foreground font-bold font-mono">R / Shift+R:</span> Rotate Object ±90°</div>
                <div><span className="text-foreground font-bold font-mono">[ / ]:</span> Rotate Object ±15°</div>
                <div><span className="text-foreground font-bold font-mono">Q / E:</span> Orbit Left / Right</div>
                <div><span className="text-foreground font-bold font-mono">Numpad 1, 3, 7:</span> Front / Side / Top</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLAYER / IN-GAME CAMERA DEFAULTS */}
        {activeTab === 'player' && (
          <div className="space-y-4">
            {/* Player Permission: Allow Custom Perspective */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowCustomPlayerCamera}
                  onChange={(e) => {
                    soundSynth?.playUiClick?.();
                    const val = e.target.checked;
                    setAllowCustomPlayerCamera(val);
                      if (activeMapData) {
                        (activeMapData as any).allowCustomCamera = val;
                        (activeMapData as any).allowCustomPlayerCamera = val;
                        useEditorStore.getState().markMapDirty();
                      }
                  }}
                  className="accent-primary rounded mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-foreground flex items-center gap-1.5">
                    <span>Allow Players to Choose Perspective</span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded uppercase font-mono font-bold ${
                      allowCustomPlayerCamera
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {allowCustomPlayerCamera ? 'Unlocked' : 'Locked by Author'}
                    </span>
                  </div>
                  <div className="text-[8px] text-muted-foreground mt-0.5">
                    {allowCustomPlayerCamera
                      ? 'Players in-game can switch between 2.5D Isometric, Follow 45°, Top-Down, or Free Orbit via their ESC menu.'
                      : 'All players will be strictly locked to the Author Default View Mode chosen below.'}
                  </div>
                </div>
              </label>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Author Default Player View Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'isometric', label: 'Classic 2.5D Isometric', desc: 'Fixed 45° angled down with depth' },
                  { id: 'follow45', label: 'Smooth Dynamic Follow', desc: 'Easing spring interpolation' },
                  { id: 'topdown', label: 'Top-Down 90°', desc: 'Overhead planar view' },
                  { id: 'free', label: 'Free Orbit (Allowed)', desc: 'Allow players to rotate camera' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setPlayerCameraStyle(mode.id as any);
                      if (activeMapData) {
                        (activeMapData as any).cameraStyle = mode.id;
                        useEditorStore.getState().markMapDirty();
                      }
                    }}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      playerCameraStyle === mode.id
                        ? 'border-primary bg-primary/15 text-foreground'
                        : 'border-border/30 bg-[#060e1c] text-muted-foreground hover:border-border'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-foreground flex items-center justify-between">
                      <span>{mode.label}</span>
                      {playerCameraStyle === mode.id && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    <div className="text-[8px] text-muted-foreground mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Follow Dynamics & Boundaries */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Follow Dynamics & Boundaries
              </div>

              {/* Follow Smoothing */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-28 shrink-0">Spring Smoothness</span>
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

              {/* Border Clamping */}
              <label className="flex items-center gap-2 text-[10px] text-foreground cursor-pointer pt-1 border-t border-border/20">
                <input
                  type="checkbox"
                  checked={borderClamping}
                  onChange={(e) => setBorderClamping(e.target.checked)}
                  className="accent-primary rounded"
                />
                <span>Map Boundary Clamping (Prevent void showing at world edges)</span>
              </label>

              {/* Vignette Post-Process */}
              <label className="flex items-center gap-2 text-[10px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={vignetteEnabled}
                  onChange={(e) => setVignetteEnabled(e.target.checked)}
                  className="accent-primary rounded"
                />
                <span>Atmospheric Vignette (Dark cinematic edge falloff)</span>
              </label>

              {vignetteEnabled && (
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-[9px] text-muted-foreground w-24 shrink-0">Vignette Weight</span>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={vignetteWeight}
                    onChange={(e) => setVignetteWeight(parseInt(e.target.value))}
                    className="flex-1 accent-primary h-1 cursor-pointer"
                  />
                  <span className="text-[9px] text-foreground font-bold w-10 text-right">{(vignetteWeight / 10).toFixed(1)}</span>
                </div>
              )}

              {/* Preview In-Game Camera Perspective */}
              <div className="pt-2 border-t border-border/20 flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">Preview Perspective</span>
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    syncSettingsToEngine();
                    window.dispatchEvent(new CustomEvent('studio_preview_player_camera'));
                  }}
                  className="px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview In-Game View</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OBJECT & BRUSH TRANSFORMS */}
        {activeTab === 'transforms' && (
          <div className="space-y-4">
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Active Brush & Splat Angle</span>
                <span className="text-primary font-bold">{brushRotation}°</span>
              </div>

              {/* Angle Slider */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={5}
                  value={brushRotation}
                  onChange={(e) => setBrushRotation(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{brushRotation}°</span>
              </div>

              {/* Quick Step Buttons */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '0°', val: 0 },
                  { label: '90°', val: 90 },
                  { label: '180°', val: 180 },
                  { label: '270°', val: 270 },
                  { label: '+15°', step: 15 },
                  { label: '-15°', step: -15 },
                  { label: '+45°', step: 45 },
                  { label: '-45°', step: -45 },
                ].map((btn, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      if (btn.val !== undefined) {
                        setBrushRotation(btn.val);
                      } else if (btn.step !== undefined) {
                        setBrushRotation((brushRotation + btn.step + 360) % 360);
                      }
                    }}
                    className="p-1 rounded bg-[#060e1c] border border-border/30 hover:border-primary/40 text-[9px] font-bold text-foreground text-center transition-colors cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stamp Scale */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-muted-foreground uppercase tracking-wider">Stamp & Prop Scale</span>
                <span className="text-primary font-bold">{Math.round(stampScale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  value={stampScale}
                  onChange={(e) => setStampScale(parseFloat(e.target.value))}
                  className="flex-1 accent-primary h-1 cursor-pointer"
                />
                <span className="text-[9px] text-foreground font-bold w-10 text-right">{stampScale.toFixed(1)}x</span>
              </div>
            </div>

            {/* Randomize Rotation on Paint */}
            <div className="p-2.5 rounded-lg bg-[#0a1628]/50 border border-border/30">
              <label className="flex items-center gap-2 text-[10px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={splatRotationRandomize}
                  onChange={(e) => setSplatRotationRandomize(e.target.checked)}
                  className="accent-primary rounded"
                />
                <div>
                  <div className="font-bold">Randomize Splat Angle on Paint</div>
                  <div className="text-[8px] text-muted-foreground">Each stamp click receives a random 0°–360° angle</div>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
