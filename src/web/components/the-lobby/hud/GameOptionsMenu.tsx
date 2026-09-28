'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import {
  X,
  Monitor,
  Volume2,
  Gamepad2,
  Settings2,
  Layout,
  Sliders,
  LogOut,
  Check,
  RotateCcw,
  Sparkles,
  LifeBuoy,
  Hammer,
  Palette,
  Camera,
  Play,
  Maximize2,
  Minimize2,
  Shield,
  Activity,
  User,
  Radio,
  Eye,
  SlidersHorizontal,
  VolumeX,
} from 'lucide-react';
import { SGMicro3DLogo } from '@/web/components/landing/sg-logo-3d-micro';
import { getActiveWorldRelease } from '@/app/actions/studio/world-release';
import { BUILTIN_HUD_PRESETS } from './default-presets';
import { HUD_THEME_LIST, getHudTheme, DEFAULT_HUD_THEME_ID } from './hud-themes';
import { soundSynth } from '@/engine/sound-synth';
import { canCastUnstuck } from '@/shared/game/worldSpawns';
import { startMapTransition } from '@/shared/game/lobbyWorldJoin';
import { DEFAULT_CLIENT_SETTINGS } from '../settings/clientSettingsSchema';

interface GameOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isAdminUser: boolean;
  isCreationMode: boolean;
  onToggleDevEditor: () => void;
}

type TabType = 'SESSION' | 'GRAPHICS' | 'AUDIO' | 'CAMERA' | 'CONTROLS' | 'INTERFACE' | 'GAMEPLAY';

export default function GameOptionsMenu({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  isAdminUser,
  isCreationMode,
  onToggleDevEditor,
}: GameOptionsMenuProps) {
  const [activeTab, setActiveTab] = useState<TabType>('SESSION');
  
  // Game & HUD Store
  const isEditingInterface = useGameStore((state) => state.isEditingInterface);
  const setIsEditingInterface = useGameStore((state) => state.setIsEditingInterface);
  const mobileControlMode = useGameStore((state) => state.mobileControlMode);
  const setMobileControlMode = useGameStore((state) => state.setMobileControlMode);
  const activeHudPreset = useGameStore((state) => state.activeHudPreset);
  const setActiveHudPreset = useGameStore((state) => state.setActiveHudPreset);
  const hudThemeId = useGameStore((state) => state.hudThemeId);
  const hudConfig = useGameStore((state) => state.hudConfig);
  const setHudTheme = useGameStore((state) => state.setHudTheme);
  const setHudScale = useGameStore((state) => state.setHudScale);
  const updateHudConfig = useGameStore((state) => state.updateHudConfig);
  const resetHudConfig = useGameStore((state) => state.resetHudConfig);
  const showToast = useGameStore((state) => state.showToast);
  const player = useGameStore((state) => state.player);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const instanceId = useGameStore((state) => state.instanceId);
  const latencyMs = useGameStore((state) => state.latencyMs);

  // Client Settings Store
  const clientSettings = useGameStore((state) => state.clientSettings);
  const patchClientSettings = useGameStore((state) => state.patchClientSettings);

  const theme = getHudTheme(hudThemeId || hudConfig?.themeId);
  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-3xl'
      : theme.borderRadiusClass || 'rounded-2xl';

  // Unstuck System
  const [isCastingUnstuck, setIsCastingUnstuck] = useState(false);
  const [unstuckTimer, setUnstuckTimer] = useState(5);
  const [unstuckRemainingCooldown, setUnstuckRemainingCooldown] = useState(0);
  const unstuckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkCooldown = () => {
      try {
        const last = Number(localStorage.getItem('saints.lastUnstuckTimestamp') || '0');
        const check = canCastUnstuck(last || null);
        setUnstuckRemainingCooldown(check.remainingCooldownMs);
      } catch {
        setUnstuckRemainingCooldown(0);
      }
    };
    checkCooldown();
    const timer = setInterval(checkCooldown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartUnstuck = () => {
    const check = canCastUnstuck(Number(localStorage.getItem('saints.lastUnstuckTimestamp') || '0') || null);
    if (!check.canCast) {
      showToast(`Unstuck on cooldown: ${Math.ceil(check.remainingCooldownMs / 1000)}s remaining.`);
      return;
    }

    setIsCastingUnstuck(true);
    setUnstuckTimer(5);
    soundSynth?.playActionSound?.();
    showToast('Unstuck initiated... Channeling for 5 seconds.');

    let count = 5;
    if (unstuckIntervalRef.current) clearInterval(unstuckIntervalRef.current);

    unstuckIntervalRef.current = setInterval(async () => {
      count -= 1;
      setUnstuckTimer(count);
      if (count <= 0) {
        if (unstuckIntervalRef.current) clearInterval(unstuckIntervalRef.current);
        setIsCastingUnstuck(false);
        try {
          localStorage.setItem('saints.lastUnstuckTimestamp', String(Date.now()));
        } catch {}

        let targetMapId = '';
        try {
          const activeRelease = await getActiveWorldRelease('saints');
          if (activeRelease) {
            const manifest = JSON.parse(activeRelease.manifestData || '{}');
            targetMapId = manifest.world?.spawnMap || '';
          }
        } catch {}

        if (!targetMapId) {
          showToast('Failed to find safe spawn map in active release.');
          return;
        }

        const store = useGameStore.getState();
        store.setPlayerPosition({ x: 15, y: 15 }, 'down', false);
        store.setCurrentMapId(targetMapId);
        if (store.emitSocketEvent && store.player.accountId) {
          startMapTransition({
            socket: { connected: true, emit: store.emitSocketEvent },
            accountId: store.player.accountId,
            contract: {
              mapId: targetMapId,
              lobby: true,
              isPrivate: false,
              pie: false,
            },
            position: { x: 32, y: 32 },
            name: store.player.name || 'Player',
            assetProfileId: store.player.assetProfileId || 'adventurer',
            visualData: store.player.visualData,
            currentInstanceId: store.instanceId,
            worldJoinSeq: store.worldJoinSeq,
            onSetWorldSessionState: store.setWorldSessionState,
            onIncrementWorldJoinSeq: store.incrementWorldJoinSeq,
            setIsMapTransitioning: store.setIsMapTransitioning,
            onClearPeers: () => store.setOtherPlayers({}),
            force: true,
          });
        }
        showToast(`Unstuck successful! Transported to safe spawn.`);
        onClose();
      }
    }, 1000);
  };

  // Sound & Audio values
  const masterVolume = Math.round((clientSettings?.audio?.masterVolume ?? 1.0) * 100);
  const sfxVolume = Math.round((clientSettings?.audio?.sfxVolume ?? 1.0) * 100);
  const musicVolume = Math.round((clientSettings?.audio?.musicVolume ?? 0.8) * 100);
  const ambienceVolume = Math.round((clientSettings?.audio?.ambienceVolume ?? 0.6) * 100);
  const uiVolume = Math.round((clientSettings?.audio?.uiVolume ?? 1.0) * 100);
  const isMuted = masterVolume === 0;
  const muteWhenUnfocused = clientSettings?.audio?.muteWhenUnfocused ?? true;

  // Graphics values
  const graphicsQuality = clientSettings?.graphics?.quality || 'high';
  const targetFps = clientSettings?.graphics?.maxFps === 0 ? 'uncapped' : String(clientSettings?.graphics?.maxFps || 60);
  const resolutionScale = Math.round((clientSettings?.graphics?.resolutionScale ?? 1.0) * 100);
  const shadowsEnabled = clientSettings?.graphics?.shadows ?? true;
  const postProcessingEnabled = clientSettings?.graphics?.postProcessing ?? true;
  const showDamageNumbers = clientSettings?.gameplay?.damageNumbers ?? true;
  const showFloatingLoot = clientSettings?.gameplay?.showFloatingLoot ?? true;
  const footstepDust = clientSettings?.gameplay?.footstepDust ?? true;

  // Camera values
  const cameraProfile = clientSettings?.camera?.profile || 'dynamic';
  const selectedCameraProfile = cameraProfile === 'isometric' ? 'dynamic' : cameraProfile;
  const cameraFov = clientSettings?.camera?.fov ?? 90;
  const cameraSmoothing = Math.round((clientSettings?.camera?.smoothing ?? 0.35) * 100);
  const cameraShake = clientSettings?.camera?.cameraShake ?? true;
  const borderClamping = clientSettings?.camera?.borderClamping ?? true;
  const vignetteEnabled = clientSettings?.camera?.vignetteEnabled ?? true;

  // Controls values
  const mouseSensitivity = clientSettings?.controls?.mouseSensitivity ?? 1.0;
  const invertY = clientSettings?.controls?.invertY ?? false;

  // Gameplay & Social values
  const showNames = clientSettings?.gameplay?.showNames ?? true;
  const combatAutoTarget = clientSettings?.gameplay?.combatAutoTarget ?? true;
  const autoAcceptFriendParty = clientSettings?.gameplay?.autoAcceptFriendParty ?? false;
  const autoRun = clientSettings?.gameplay?.autoRun ?? false;
  const chatTimestamps = clientSettings?.interface?.chatTimestamps ?? false;

  // Quick reset category to default values
  const handleResetCurrentCategory = () => {
    soundSynth?.playActionSound?.();
    if (activeTab === 'GRAPHICS') {
      patchClientSettings('graphics', DEFAULT_CLIENT_SETTINGS.graphics);
      patchClientSettings('gameplay', {
        damageNumbers: DEFAULT_CLIENT_SETTINGS.gameplay.damageNumbers,
        showFloatingLoot: DEFAULT_CLIENT_SETTINGS.gameplay.showFloatingLoot,
        footstepDust: DEFAULT_CLIENT_SETTINGS.gameplay.footstepDust,
      });
      showToast('Display & graphics settings restored to default.');
    } else if (activeTab === 'AUDIO') {
      patchClientSettings('audio', DEFAULT_CLIENT_SETTINGS.audio);
      showToast('Audio volume levels restored to default.');
    } else if (activeTab === 'CAMERA') {
      patchClientSettings('camera', DEFAULT_CLIENT_SETTINGS.camera);
      showToast('Camera settings restored to default.');
    } else if (activeTab === 'CONTROLS') {
      patchClientSettings('controls', DEFAULT_CLIENT_SETTINGS.controls);
      setMobileControlMode('floating');
      showToast('Control settings restored to default.');
    } else if (activeTab === 'INTERFACE') {
      resetHudConfig();
      setHudTheme(DEFAULT_HUD_THEME_ID);
      showToast('Interface & HUD style restored to default.');
    } else if (activeTab === 'GAMEPLAY') {
      patchClientSettings('gameplay', DEFAULT_CLIENT_SETTINGS.gameplay);
      patchClientSettings('interface', { chatTimestamps: false });
      showToast('Gameplay preferences restored to default.');
    }
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'SESSION', label: 'Session & Character', icon: <User className="w-4 h-4" /> },
    { id: 'GRAPHICS', label: 'Display & Graphics', icon: <Monitor className="w-4 h-4" /> },
    { id: 'AUDIO', label: 'Audio & Sound', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'CAMERA', label: 'Camera & View', icon: <Camera className="w-4 h-4" /> },
    { id: 'CONTROLS', label: 'Controls & Binds', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'INTERFACE', label: 'Interface & HUD', icon: <Layout className="w-4 h-4" /> },
    { id: 'GAMEPLAY', label: 'Gameplay & Social', icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto p-4 animate-in fade-in duration-150 font-mono">
      {/* Outer Window Box conforming to Saints Gaming Window Style */}
      <div
        className={`flex h-[min(680px,94vh)] w-full max-w-4xl flex-col overflow-hidden ${radiusClass} border ${theme.palette.border} ${theme.palette.glassBg} shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-slate-200`}
      >
        {/* Unified Sleek Header Bar */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${theme.palette.border} ${theme.palette.glassHeaderBg} select-none`}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-100">
                  Game Options
                </h2>
                <span className="text-[10px] text-amber-400/80 font-bold">&bull;</span>
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                  Time To Play
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {latencyMs > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{latencyMs}ms</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                onToggleFullscreen();
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F11)'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                onClose();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer text-[10px] font-bold"
              title="Close Options (ESC)"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ESC</span>
            </button>
          </div>
        </div>

        {/* Main Body: Left Sidebar + Right Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Category Sidebar */}
          <div className="w-56 shrink-0 bg-[#03060c]/80 border-r border-white/10 p-2.5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 py-1 block">
                Categories
              </span>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      setActiveTab(tab.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Session Actions at bottom of sidebar */}
            <div className="pt-3 border-t border-white/10 space-y-1.5 mt-4">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  useGameStore.getState().setGameMode('CHARACTER_SELECT');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">Switch Character</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundSynth?.playActionSound?.();
                  useGameStore.getState().setGameMode('TITLE_SCREEN');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="truncate">Exit to Title</span>
              </button>
            </div>
          </div>

          {/* Right Scrollable Content Pane */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#050b14]/50">
            {/* ── TAB 1: SESSION & CHARACTER ── */}
            {activeTab === 'SESSION' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Session & Character Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live character status, current region, network latency, and safety navigation.
                  </p>
                </div>

                {/* Character Card */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Saint</span>
                    <span className="font-bold text-amber-300 text-sm">{player.name || 'Saint Explorer'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Combat Style</span>
                    <span className="font-bold text-slate-200">{player.combatStyle || 'WARRIOR'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Region / Map</span>
                    <span className="font-bold text-slate-200">{currentMapId || 'The Lobby'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Server Instance</span>
                    <span className="font-bold text-slate-300">{instanceId || 'Default World Instance'}</span>
                  </div>
                </div>

                {/* Emergency Unstuck Card */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">Emergency Safe Spawn Unstuck</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Transports character to safe map spawn after a 5-second stationary channel if stuck in geometry.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartUnstuck}
                      disabled={isCastingUnstuck}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isCastingUnstuck ? `Channeling (${unstuckTimer}s)...` : 'Cast Unstuck'}
                    </button>
                  </div>

                  {isCastingUnstuck && (
                    <div className="space-y-1 pt-1">
                      <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-amber-400 transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                          style={{ width: `${((5 - unstuckTimer) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-amber-300/80">Stay stationary while channeling...</span>
                    </div>
                  )}
                </div>

                {/* Studio Jump if admin */}
                {isAdminUser && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">Creator World Studio</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Launch map painter, quest authoring, and asset assembler.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundSynth?.playActionSound?.();
                        onToggleDevEditor();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Hammer className="w-3.5 h-3.5" />
                      <span>Open Studio</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: DISPLAY & GRAPHICS ── */}
            {activeTab === 'GRAPHICS' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Display & Graphics Performance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure resolution scaling, framerate target, visual fidelity, and combat particle effects.
                  </p>
                </div>

                {/* Display Mode & Scaling */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Display Mode</span>
                      <span className="text-[10px] text-slate-400">Toggle between windowed and borderless fullscreen</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        onToggleFullscreen();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isFullscreen ? 'Borderless Fullscreen' : 'Standard Windowed'}
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Resolution Scale (Hardware Scaler)</span>
                      <span className="font-bold text-amber-300">{resolutionScale}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[75, 100, 125, 150].map((scale) => (
                        <button
                          key={scale}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            patchClientSettings('graphics', { resolutionScale: scale / 100 });
                            showToast(`Resolution scale: ${scale}%`);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            resolutionScale === scale
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : 'bg-black/60 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          {scale}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quality & Framerate */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3.5">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-300 block">Graphics Quality Preset</span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            patchClientSettings('graphics', { quality: q });
                            showToast(`Quality preset: ${q.toUpperCase()}`);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all border cursor-pointer ${
                            graphicsQuality === q
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : 'bg-black/60 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <span className="text-xs font-bold text-slate-300 block">Target Framerate Cap</span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['30', '60', '120', 'uncapped'] as const).map((fps) => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            patchClientSettings('graphics', { maxFps: fps === 'uncapped' ? 0 : parseInt(fps) });
                            showToast(`Target framerate: ${fps === 'uncapped' ? 'Uncapped' : `${fps} FPS`}`);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            targetFps === fps
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : 'bg-black/60 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          {fps === 'uncapped' ? 'Uncapped' : `${fps} FPS`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visual Toggles */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-2.5">
                  <span className="text-xs font-bold text-slate-300 block mb-1">Visual Effects & Lighting</span>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5">
                    <div>
                      <div className="font-bold">Dynamic 3D Shadows</div>
                      <div className="text-[10px] text-slate-400">Directional sun and ambient entity shadows</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={shadowsEnabled}
                      onChange={(e) => patchClientSettings('graphics', { shadows: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">Post-Processing Pipeline</div>
                      <div className="text-[10px] text-slate-400">Atmospheric lens color grading and bloom</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={postProcessingEnabled}
                      onChange={(e) => patchClientSettings('graphics', { postProcessing: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">Floating Combat Damage Numbers</div>
                      <div className="text-[10px] text-slate-400">Pop-up numbers on hits and spell casts</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showDamageNumbers}
                      onChange={(e) => patchClientSettings('gameplay', { damageNumbers: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">3D Floating Ground Items</div>
                      <div className="text-[10px] text-slate-400">Animated floating icons for dropped world loot</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showFloatingLoot}
                      onChange={(e) => patchClientSettings('gameplay', { showFloatingLoot: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">Character Footstep Dust FX</div>
                      <div className="text-[10px] text-slate-400">Particle puffs when walking across walkable terrain</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={footstepDust}
                      onChange={(e) => patchClientSettings('gameplay', { footstepDust: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* ── TAB 3: AUDIO & SOUND ── */}
            {activeTab === 'AUDIO' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Audio & Sound Mixing
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust master, music, combat abilities, and ambient world sound effects.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-4">
                  {/* Master Mute Toggle */}
                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <VolumeX className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="font-bold">Mute All Audio</div>
                        <div className="text-[10px] text-slate-400">Quickly silence master output</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isMuted}
                      onChange={(e) => patchClientSettings('audio', { masterVolume: e.target.checked ? 0 : 1.0 })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {!isMuted && (
                    <>
                      {/* Master Volume */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">Master Volume</span>
                          <span className="font-bold text-amber-300">{masterVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={masterVolume}
                          onChange={(e) => patchClientSettings('audio', { masterVolume: parseInt(e.target.value) / 100 })}
                          className="w-full accent-amber-400 h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* Music Volume */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">Music & Jukebox (BGM)</span>
                          <span className="font-bold text-amber-300">{musicVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={musicVolume}
                          onChange={(e) => patchClientSettings('audio', { musicVolume: parseInt(e.target.value) / 100 })}
                          className="w-full accent-amber-400 h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* SFX Volume */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">Sound Effects (SFX)</span>
                          <span className="font-bold text-amber-300">{sfxVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={sfxVolume}
                          onChange={(e) => {
                            patchClientSettings('audio', { sfxVolume: parseInt(e.target.value) / 100 });
                            soundSynth?.playUiClick?.();
                          }}
                          className="w-full accent-amber-400 h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* Ambience Volume */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">World Ambience & Nature</span>
                          <span className="font-bold text-amber-300">{ambienceVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={ambienceVolume}
                          onChange={(e) => patchClientSettings('audio', { ambienceVolume: parseInt(e.target.value) / 100 })}
                          className="w-full accent-amber-400 h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* UI Sounds */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-200">User Interface Feedback</span>
                          <span className="font-bold text-amber-300">{uiVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={uiVolume}
                          onChange={(e) => patchClientSettings('audio', { uiVolume: parseInt(e.target.value) / 100 })}
                          className="w-full accent-amber-400 h-1.5 cursor-pointer"
                        />
                      </div>

                      {/* Mute When Unfocused */}
                      <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer pt-2 border-t border-white/10">
                        <div>
                          <div className="font-bold">Mute When In Background</div>
                          <div className="text-[10px] text-slate-400">Silence game audio when browser tab is inactive</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={muteWhenUnfocused}
                          onChange={(e) => patchClientSettings('audio', { muteWhenUnfocused: e.target.checked })}
                          className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 4: CAMERA & VIEW ── */}
            {activeTab === 'CAMERA' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Camera & Perspective
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize character follow angles, field of view, spring smoothing, and map boundary clamps.
                  </p>
                </div>

                {/* Camera Perspective Mode */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">Perspective Mode</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'firstperson', label: 'First Person', desc: 'Mouse-locked view at eye level' },
                      { id: 'follow45', label: 'Third Person', desc: 'Mouse-locked follow camera' },
                      { id: 'dynamic', label: '2.5D Mode', desc: 'Click to move; scroll in for 3rd and 1st person' },
                    ].map((mode) => {
                      const isSelected = selectedCameraProfile === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            patchClientSettings('camera', { profile: mode.id });
                            showToast(`Camera perspective set to ${mode.label}`);
                          }}
                          className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-black/60 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{mode.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{mode.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FOV & Smoothing Sliders */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Field of View (FOV)</span>
                      <span className="font-bold text-amber-300">{cameraFov}°</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={110}
                      step={5}
                      value={cameraFov}
                      onChange={(e) => patchClientSettings('camera', { fov: parseInt(e.target.value) })}
                      className="w-full accent-amber-400 h-1.5 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Follow Spring Smoothness</span>
                      <span className="font-bold text-amber-300">{cameraSmoothing}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={5}
                      value={cameraSmoothing}
                      onChange={(e) => patchClientSettings('camera', { smoothing: parseInt(e.target.value) / 100 })}
                      className="w-full accent-amber-400 h-1.5 cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer pt-2 border-t border-white/10">
                    <div>
                      <div className="font-bold">Screen Shake on Impacts</div>
                      <div className="text-[10px] text-slate-400">Subtle camera impulse when taking damage or casting</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={cameraShake}
                      onChange={(e) => patchClientSettings('camera', { cameraShake: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer pt-2 border-t border-white/10">
                    <div>
                      <div className="font-bold">Map Boundary Edge Clamping</div>
                      <div className="text-[10px] text-slate-400">Keep viewport inside active map limits</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={borderClamping}
                      onChange={(e) => patchClientSettings('camera', { borderClamping: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer pt-2 border-t border-white/10">
                    <div>
                      <div className="font-bold">Atmospheric Lens Vignette</div>
                      <div className="text-[10px] text-slate-400">Soft dark edge darkening around perimeter</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={vignetteEnabled}
                      onChange={(e) => patchClientSettings('camera', { vignetteEnabled: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* ── TAB 5: CONTROLS & BINDS ── */}
            {activeTab === 'CONTROLS' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Controls & Keybindings
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reference gameplay keyboard mappings, mouse sensitivity, and touch/mobile controllers.
                  </p>
                </div>

                {/* Input Sensitivity */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Mouse Look Sensitivity</span>
                      <span className="font-bold text-amber-300">{mouseSensitivity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.1}
                      value={mouseSensitivity}
                      onChange={(e) => patchClientSettings('controls', { mouseSensitivity: parseFloat(e.target.value) })}
                      className="w-full accent-amber-400 h-1.5 cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer pt-2 border-t border-white/10">
                    <div>
                      <div className="font-bold">Invert Look Y-Axis</div>
                      <div className="text-[10px] text-slate-400">Invert vertical camera direction</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={invertY}
                      onChange={(e) => patchClientSettings('controls', { invertY: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Mobile / Touch Controller Switch */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-100">Touch & Mobile Controller Style</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">On-screen control scheme for mobile and touch screens</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      const next = mobileControlMode === 'floating' ? 'dpad' : 'floating';
                      setMobileControlMode(next);
                      patchClientSettings('controls', { mobileControlMode: next });
                      showToast(`Mobile controls: ${next === 'floating' ? 'Floating Joystick' : 'Fixed D-Pad'}`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      mobileControlMode === 'floating'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mobileControlMode === 'floating' ? 'Floating Joystick' : 'Fixed D-Pad'}
                  </button>
                </div>

                {/* Keybindings Reference Table */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Core Gameplay Binds
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: 'W, A, S, D', action: 'Move Character' },
                      { key: 'Space / E', action: 'Interact / Talk with NPCs' },
                      { key: '1 â€“ 5', action: 'Cast Abilities & Use Potions' },
                      { key: 'Tab', action: 'Target Nearest Enemy' },
                      { key: 'I', action: 'Inventory Backpack' },
                      { key: 'K', action: 'Skills & Progression' },
                      { key: 'C', action: 'Equipment & Gear' },
                      { key: 'L', action: 'Quest Log Journal' },
                      { key: 'X', action: 'Saints Dex (Creatures)' },
                      { key: 'G', action: 'Marketplace (GTC)' },
                      { key: 'P', action: 'Party Roster Overlay' },
                      { key: 'Enter', action: 'Chat Window' },
                      { key: 'Esc', action: 'Game Options Menu' },
                    ].map((bind) => (
                      <div
                        key={bind.key}
                        className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-white/10"
                      >
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-mono font-bold text-amber-300 text-[10px]">
                          {bind.key}
                        </span>
                        <span className="text-slate-300 text-[11px] font-medium">{bind.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 6: INTERFACE & HUD ── */}
            {activeTab === 'INTERFACE' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Interface & HUD Customization
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select engine themes, scale size, opacity, shape styles, and launch the live HUD layout editor.
                  </p>
                </div>

                {/* Viewfinder Edit Mode Quick Launcher */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">Live HUD Viewfinder Layout Editor</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Drag, rearrange, resize, and hide individual HUD dock zones in real time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playActionSound?.();
                      setIsEditingInterface(true);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer shrink-0"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Edit HUD Layout</span>
                  </button>
                </div>

                {/* HUD Theme Palette */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">HUD Engine Theme</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HUD_THEME_LIST.map((th) => {
                      const isSelected = (hudThemeId || hudConfig?.themeId) === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            setHudTheme(th.id);
                            showToast(`HUD theme set to ${th.name}`);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-black/60 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold truncate">{th.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.palette.primary }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.palette.hpFill }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.palette.mpFill }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HUD Scale & Opacity */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">HUD Viewport Scale</span>
                      <span className="font-bold text-amber-300">{Math.round((hudConfig?.scale ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={75}
                      max={125}
                      step={5}
                      value={Math.round((hudConfig?.scale ?? 1) * 100)}
                      onChange={(e) => setHudScale(Number(e.target.value) / 100)}
                      className="w-full accent-amber-400 h-1.5 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">Glass Backdrop Opacity</span>
                      <span className="font-bold text-amber-300">{Math.round((hudConfig?.opacity ?? 0.95) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      step={5}
                      value={Math.round((hudConfig?.opacity ?? 0.95) * 100)}
                      onChange={(e) => updateHudConfig({ opacity: Number(e.target.value) / 100 })}
                      className="w-full accent-amber-400 h-1.5 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Shape & Formatting Selectors */}
                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">Shape & Component Styling</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Frame Corner Style
                      </label>
                      <select
                        value={hudConfig?.borderRadius || 'rounded'}
                        onChange={(e) => updateHudConfig({ borderRadius: e.target.value as any })}
                        className="w-full text-xs p-2 rounded-lg bg-black/80 border border-white/15 text-slate-200 cursor-pointer"
                      >
                        <option value="rounded">Rounded (Default - 16px)</option>
                        <option value="compact">Compact (12px)</option>
                        <option value="capsule">Capsule (Rounded 24px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Radar Minimap Shape
                      </label>
                      <select
                        value={hudConfig?.minimapShape || 'rounded'}
                        onChange={(e) => updateHudConfig({ minimapShape: e.target.value as any })}
                        className="w-full text-xs p-2 rounded-lg bg-black/80 border border-white/15 text-slate-200 cursor-pointer"
                      >
                        <option value="rounded">Rounded Box (12px)</option>
                        <option value="circle">Circular Radar</option>
                        <option value="square">Sharp Square (6px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Vitality Gauge Format
                      </label>
                      <select
                        value={hudConfig?.vitalsFormat || 'dual-bar'}
                        onChange={(e) => updateHudConfig({ vitalsFormat: e.target.value as any })}
                        className="w-full text-xs p-2 rounded-lg bg-black/80 border border-white/15 text-slate-200 cursor-pointer"
                      >
                        <option value="dual-bar">Dual Full Bars (HP + MP + XP)</option>
                        <option value="compact-stacked">Compact Stacked</option>
                        <option value="heart-containers">Heart Containers (Adventure)</option>
                        <option value="classic-gauge">Classic Battle Gauge (Tri-Color)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Dock Layout Preset
                      </label>
                      <select
                        value={activeHudPreset?.id || 'preset-modern'}
                        onChange={(e) => setActiveHudPreset(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-black/80 border border-white/15 text-slate-200 cursor-pointer"
                      >
                        {BUILTIN_HUD_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Visual Element Checkboxes */}
                  <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={hudConfig?.borderGlow !== false}
                        onChange={(e) => updateHudConfig({ borderGlow: e.target.checked })}
                        className="rounded accent-amber-400 cursor-pointer"
                      />
                      <span>Border Glow Accents</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={hudConfig?.showCoords !== false}
                        onChange={(e) => updateHudConfig({ showCoords: e.target.checked })}
                        className="rounded accent-amber-400 cursor-pointer"
                      />
                      <span>Minimap Coords</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={hudConfig?.showHotbarKeybinds !== false}
                        onChange={(e) => updateHudConfig({ showHotbarKeybinds: e.target.checked })}
                        className="rounded accent-amber-400 cursor-pointer"
                      />
                      <span>Keybind Badges</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 7: GAMEPLAY & SOCIAL ── */}
            {activeTab === 'GAMEPLAY' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    Gameplay & Community Social Preferences
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Player nameplates, auto-run, auto-targeting, and party invitation controls.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0a1628]/60 border border-white/10 space-y-3">
                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5">
                    <div>
                      <div className="font-bold">Show Other Players' Nameplates</div>
                      <div className="text-[10px] text-slate-400">Display character names and health over players in the world</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showNames}
                      onChange={(e) => patchClientSettings('gameplay', { showNames: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">Combat Smart Auto-Targeting</div>
                      <div className="text-[10px] text-slate-400">Auto-lock nearest hostile monster when casting offensive spells</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={combatAutoTarget}
                      onChange={(e) => patchClientSettings('gameplay', { combatAutoTarget: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">Auto-Accept Party Invites From Friends</div>
                      <div className="text-[10px] text-slate-400">Instantly join groups when invited by friends</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoAcceptFriendParty}
                      onChange={(e) => patchClientSettings('gameplay', { autoAcceptFriendParty: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">Always Auto-Run by Default</div>
                      <div className="text-[10px] text-slate-400">Move at maximum speed without holding modifier keys</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoRun}
                      onChange={(e) => patchClientSettings('gameplay', { autoRun: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer p-1 rounded hover:bg-white/5 border-t border-white/10">
                    <div>
                      <div className="font-bold">Chat Message Timestamps</div>
                      <div className="text-[10px] text-slate-400">Display timestamp [HH:MM] in chat messages</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={chatTimestamps}
                      onChange={(e) => patchClientSettings('interface', { chatTimestamps: e.target.checked })}
                      className="accent-amber-400 rounded w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Unified Bottom Footer Bar */}
        <div className={`px-4 py-3 border-t ${theme.palette.border} ${theme.palette.glassHeaderBg} flex items-center justify-between select-none`}>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="font-bold text-slate-200">Saints Gaming</span>
            <span>&bull;</span>
            <span className="text-amber-400/80 font-bold">Time To Play</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-500">v2.2.037</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetCurrentCategory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Category</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:brightness-110 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
