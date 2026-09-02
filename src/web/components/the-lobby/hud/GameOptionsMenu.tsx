'use client';

import { useState, useEffect, useRef } from 'react';
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
  Lock,
} from 'lucide-react';
import { BUILTIN_HUD_PRESETS } from './default-presets';
import { HUD_THEME_LIST } from './hud-themes';
import { soundSynth } from '@/engine/sound-synth';
import { canCastUnstuck, UNSTUCK_COOLDOWN_MS, UNSTUCK_CAST_DURATION_MS } from '@/shared/game/worldSpawns';
import { startMapTransition } from '@/shared/game/lobbyWorldJoin';
import { WindowMenuBar, WindowMenuDivider } from '../editor/WindowMenuBar';

interface GameOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isAdminUser: boolean;
  isCreationMode: boolean;
  onToggleDevEditor: () => void;
}

type TabType = 'GAME' | 'CAMERA' | 'GRAPHICS' | 'AUDIO' | 'CONTROLS' | 'INTERFACE' | 'GAMEPLAY';

export default function GameOptionsMenu({
  isOpen,
  onClose,
  isFullscreen,
  onToggleFullscreen,
  isAdminUser,
  isCreationMode,
  onToggleDevEditor,
}: GameOptionsMenuProps) {
  const [activeTab, setActiveTab] = useState<TabType>('GAME');
  const isEditingInterface = useGameStore((state) => state.isEditingInterface);
  const setIsEditingInterface = useGameStore((state) => state.setIsEditingInterface);
  const mobileControlMode = useGameStore((state) => state.mobileControlMode);
  const setMobileControlMode = useGameStore((state) => state.setMobileControlMode);
  const activeHudPreset = useGameStore((state) => state.activeHudPreset);
  const customHudPresets = useGameStore((state) => state.customHudPresets);
  const setActiveHudPreset = useGameStore((state) => state.setActiveHudPreset);
  const resetHudPresetToDefault = useGameStore((state) => state.resetHudPresetToDefault);
  const hudThemeId = useGameStore((state) => state.hudThemeId);
  const hudConfig = useGameStore((state) => state.hudConfig);
  const setHudTheme = useGameStore((state) => state.setHudTheme);
  const setHudScale = useGameStore((state) => state.setHudScale);
  const updateHudConfig = useGameStore((state) => state.updateHudConfig);
  const resetHudConfig = useGameStore((state) => state.resetHudConfig);
  const showToast = useGameStore((state) => state.showToast);
  const player = useGameStore((state) => state.player);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const latencyMs = useGameStore((state) => state.latencyMs);

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

        let targetMapId = 'LOBBY';
        try {
          const mapListRes = await fetch('/api/maps');
          if (mapListRes.ok) {
            const data = await mapListRes.json();
            const maps = data.maps || [];
            if (maps.length > 0) {
              const lobbyMap = maps.find((m: any) => m.id === 'LOBBY' || m.id.toLowerCase().includes('lobby')) || maps[0];
              targetMapId = lobbyMap.id;
            }
          }
        } catch {}

        const store = useGameStore.getState();
        store.setPlayerPosition({ x: 32, y: 32 }, 'down', false);
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
            currentInstanceId: store.instanceId,
            worldJoinSeq: store.worldJoinSeq,
            onSetWorldSessionState: store.setWorldSessionState,
            onIncrementWorldJoinSeq: store.incrementWorldJoinSeq,
            setIsMapTransitioning: store.setIsMapTransitioning,
            onClearPeers: () => store.setOtherPlayers({}),
            force: true,
          });
        }
        showToast(`Unstuck successful! Transported to ${targetMapId} spawn.`);
        onClose();
      }
    }, 1000);
  };

  // Audio Settings
  const [masterVolume, setMasterVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(90);
  const [musicVolume, setMusicVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);

  // Graphics Settings
  const [graphicsQuality, setGraphicsQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');
  const [targetFps, setTargetFps] = useState<'60' | '120' | 'uncapped'>('60');
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);
  const [showFloatingLoot, setShowFloatingLoot] = useState(true);
  const [footstepDust, setFootstepDust] = useState(true);

  // Social & Gameplay Settings
  const [showPeerNameplates, setShowPeerNameplates] = useState(true);
  const [autoAcceptFriendParty, setAutoAcceptFriendParty] = useState(false);
  const [combatAutoTarget, setCombatAutoTarget] = useState(true);

  // Camera Settings
  const [inGameCameraStyle, setInGameCameraStyle] = useState<'isometric' | 'follow45' | 'topdown' | 'free'>('isometric');
  const [inGameFollowSmoothing, setInGameFollowSmoothing] = useState(35);
  const [inGameBorderClamping, setInGameBorderClamping] = useState(true);
  const [inGameVignette, setInGameVignette] = useState(true);

  const activeMapData = useGameStore((s) => s.activeMapData);
  const allowCustomCamera = Boolean(
    (activeMapData as any)?.allowCustomCamera ??
    (activeMapData as any)?.allowCustomPlayerCamera ??
    false
  );
  const authorLockedCameraStyle = ((activeMapData as any)?.cameraStyle || (activeMapData as any)?.defaultCameraStyle || 'isometric') as 'isometric' | 'follow45' | 'topdown' | 'free';

  useEffect(() => {
    try {
      const saved = localStorage.getItem('saints_camera_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.playerCameraStyle && allowCustomCamera) setInGameCameraStyle(parsed.playerCameraStyle);
        else if (!allowCustomCamera) setInGameCameraStyle(authorLockedCameraStyle);
        if (parsed.followSmoothing) setInGameFollowSmoothing(parsed.followSmoothing);
        if (parsed.borderClamping !== undefined) setInGameBorderClamping(parsed.borderClamping);
        if (parsed.vignetteEnabled !== undefined) setInGameVignette(parsed.vignetteEnabled);
      } else if (!allowCustomCamera) {
        setInGameCameraStyle(authorLockedCameraStyle);
      }
    } catch {}
  }, [allowCustomCamera, authorLockedCameraStyle]);

  const saveInGameCamera = (style: any, smooth: number, clamp: boolean, vig: boolean) => {
    try {
      const saved = localStorage.getItem('saints_camera_settings') || '{}';
      const parsed = JSON.parse(saved);
      parsed.playerCameraStyle = style;
      parsed.followSmoothing = smooth;
      parsed.borderClamping = clamp;
      parsed.vignetteEnabled = vig;
      localStorage.setItem('saints_camera_settings', JSON.stringify(parsed));
      window.dispatchEvent(
        new CustomEvent('studio_update_camera_settings', {
          detail: {
            settings: {
              playerCameraStyle: style,
              playerFollowSmoothing: smooth / 100,
              borderClamping: clamp,
              vignetteEnabled: vig,
            },
          },
        })
      );
    } catch {}
  };

  const enterViewfinderEdit = () => {
    setIsEditingInterface(true);
    onClose();
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'GAME', label: 'Game & Session', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'CAMERA', label: 'Camera & View', icon: <Camera className="w-4 h-4" /> },
    { id: 'GRAPHICS', label: 'Graphics & Video', icon: <Monitor className="w-4 h-4" /> },
    { id: 'AUDIO', label: 'Audio & Sound', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'CONTROLS', label: 'Controls & Binds', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'INTERFACE', label: 'Interface & HUD', icon: <Layout className="w-4 h-4" /> },
    { id: 'GAMEPLAY', label: 'Social & Rules', icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-md pointer-events-auto p-4 animate-in fade-in duration-150">
      <div className="flex h-[min(640px,94dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary/40 bg-[#050b14]/95 shadow-[0_0_50px_rgba(245,158,11,0.08)] backdrop-blur-xl">
        
        {/* OS Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a1628]/90 border-b border-border/40 select-none">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-wider text-foreground">
              SAINTS GAMING
            </span>
            <span className="text-muted-foreground font-mono text-xs">•</span>
            <span className="text-xs text-primary font-mono font-bold">
              System Menu
            </span>
            {latencyMs > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                {latencyMs}ms
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
              <span>Resume Game (Esc)</span>
            </button>

            <button
              type="button"
              onClick={handleStartUnstuck}
              disabled={isCastingUnstuck}
              className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isCastingUnstuck
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-card/40 text-muted-foreground hover:text-foreground border-border/30'
              }`}
            >
              <LifeBuoy className="w-3 h-3 text-amber-400" />
              <span>{isCastingUnstuck ? `Unstuck (${unstuckTimer}s)...` : 'Emergency Unstuck'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                onToggleFullscreen();
              }}
              className="px-2.5 py-1 rounded bg-card/40 hover:bg-card text-muted-foreground hover:text-foreground text-[10px] font-bold flex items-center gap-1.5 border border-border/30 transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F11)'}</span>
            </button>

            {isAdminUser && (
              <>
                <WindowMenuDivider />
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    onToggleDevEditor();
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1.5 border border-amber-500/30 transition-all cursor-pointer"
                >
                  <Hammer className="w-3 h-3" />
                  <span>World Studio (Ctrl+E)</span>
                </button>
              </>
            )}
          </div>
        </WindowMenuBar>

        {/* Main Body with Sidebar Tabs */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Tabs Sidebar */}
          <div className="w-52 shrink-0 bg-[#03060c]/80 border-r border-border/30 p-2 space-y-1 overflow-y-auto custom-scrollbar">
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>{tab.icon}</span>
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
                  useGameStore.getState().setGameMode('TITLE_SCREEN');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit to Title</span>
              </button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#050b14]/50">
            
            {/* TAB 1: GAME & SESSION */}
            {activeTab === 'GAME' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Game Session & Overview</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live session status, character details, and navigation actions.
                  </p>
                </div>

                {/* Player Session Card */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active Operative</span>
                    <span className="font-bold text-primary">{player.name || 'Saint Explorer'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Current Region</span>
                    <span className="font-bold text-foreground">{currentMapId || 'The Lobby'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Identity Profile</span>
                    <span className="font-bold text-foreground">{player.assetProfileId || 'adventurer'}</span>
                  </div>
                </div>

                {/* Emergency Unstuck Card */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Emergency Unstuck</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Transports character to safe map spawn after a 5-second stationary channel.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartUnstuck}
                      disabled={isCastingUnstuck}
                      className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      {isCastingUnstuck ? `Channeling (${unstuckTimer}s)...` : 'Cast Unstuck'}
                    </button>
                  </div>

                  {isCastingUnstuck && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-[#03060c] rounded-full overflow-hidden border border-border/30">
                        <div
                          className="h-full bg-amber-400 transition-all duration-1000"
                          style={{ width: `${((5 - unstuckTimer) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-amber-300/80">Stay stationary while channeling</span>
                    </div>
                  )}
                </div>

                {/* Session Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      useGameStore.getState().setGameMode('CHARACTER_SELECT');
                      onClose();
                    }}
                    className="p-3 rounded-lg bg-[#0a1628]/60 hover:bg-[#0a1628] border border-border/40 text-foreground font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <User className="w-4 h-4 text-primary" />
                    <div className="text-left">
                      <div>Character Select</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Switch active character</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playActionSound?.();
                      useGameStore.getState().setGameMode('TITLE_SCREEN');
                      onClose();
                    }}
                    className="p-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <div className="text-left">
                      <div>Exit to Title</div>
                      <div className="text-[10px] text-rose-400/70 font-normal">Return to main menu</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: CAMERA & VIEW */}
            {activeTab === 'CAMERA' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">In-Game Camera & Perspective</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure your character follow angle, spring smoothing, and cinematic lens post-processing.
                  </p>
                </div>

                {/* Camera Style Selection */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Camera Perspective Style
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold flex items-center gap-1 ${
                      allowCustomCamera
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {!allowCustomCamera && <Lock className="w-3 h-3 text-amber-400" />}
                      {allowCustomCamera ? 'Custom Permitted' : 'Locked by Studio'}
                    </span>
                  </div>

                  {!allowCustomCamera && (
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/80">
                      This realm map enforces the <span className="font-bold text-amber-300 uppercase">{authorLockedCameraStyle}</span> perspective to preserve author gameplay immersion. Perspective switching is disabled for this region.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'isometric', label: 'Isometric (Classic 45°)', desc: 'Diagonal depth' },
                      { id: 'follow45', label: 'Follow 45°', desc: 'Slight overhead tilt' },
                      { id: 'topdown', label: 'Top-Down (90°)', desc: 'Direct bird-eye view' },
                      { id: 'free', label: 'Free Cam', desc: 'Orbital inspection' },
                    ].map((mode) => {
                      const isSelected = (allowCustomCamera ? inGameCameraStyle : authorLockedCameraStyle) === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          disabled={!allowCustomCamera}
                          onClick={() => {
                            if (!allowCustomCamera) return;
                            soundSynth?.playUiClick?.();
                            setInGameCameraStyle(mode.id as any);
                            saveInGameCamera(mode.id, inGameFollowSmoothing, inGameBorderClamping, inGameVignette);
                            showToast(`Camera style set to ${mode.label}`);
                          }}
                          className={`p-2.5 rounded-lg text-left transition-all border ${
                            !allowCustomCamera
                              ? isSelected
                                ? 'bg-primary/10 border-primary/40 text-primary/80 cursor-not-allowed opacity-90'
                                : 'bg-[#060e1c]/50 border-border/20 text-muted-foreground/40 cursor-not-allowed opacity-50'
                              : isSelected
                              ? 'bg-primary/20 border-primary/50 text-primary cursor-pointer'
                              : 'bg-[#060e1c] border-border/40 text-muted-foreground hover:text-foreground hover:border-border cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{mode.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">{mode.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Follow & Clamping Sliders */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Follow Spring Smoothness</span>
                      <span className="font-bold text-primary">{inGameFollowSmoothing}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={5}
                      value={inGameFollowSmoothing}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setInGameFollowSmoothing(v);
                        saveInGameCamera(inGameCameraStyle, v, inGameBorderClamping, inGameVignette);
                      }}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Map Boundary Edge Clamping</span>
                    <input
                      type="checkbox"
                      checked={inGameBorderClamping}
                      onChange={(e) => {
                        const c = e.target.checked;
                        setInGameBorderClamping(c);
                        saveInGameCamera(inGameCameraStyle, inGameFollowSmoothing, c, inGameVignette);
                      }}
                      className="accent-primary rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Atmospheric Lens Vignette</span>
                    <input
                      type="checkbox"
                      checked={inGameVignette}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setInGameVignette(v);
                        saveInGameCamera(inGameCameraStyle, inGameFollowSmoothing, inGameBorderClamping, v);
                      }}
                      className="accent-primary rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: GRAPHICS & DISPLAY */}
            {activeTab === 'GRAPHICS' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Graphics & Performance</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Resolution scaling, framerate targets, and 2.5D visual effects.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quality Preset</span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            setGraphicsQuality(q);
                            showToast(`Graphics set to ${q.toUpperCase()}`);
                          }}
                          className={`py-1.5 rounded text-xs font-bold uppercase transition-all border cursor-pointer ${
                            graphicsQuality === q
                              ? 'bg-primary/20 border-primary/50 text-primary'
                              : 'bg-[#060e1c] border-border/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/20">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Framerate</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['60', '120', 'uncapped'] as const).map((fps) => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            setTargetFps(fps);
                          }}
                          className={`py-1.5 rounded text-xs font-bold transition-all border cursor-pointer ${
                            targetFps === fps
                              ? 'bg-primary/20 border-primary/50 text-primary'
                              : 'bg-[#060e1c] border-border/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {fps === 'uncapped' ? 'Uncapped' : `${fps} FPS`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Floating Combat Damage Numbers</span>
                    <input
                      type="checkbox"
                      checked={showDamageNumbers}
                      onChange={(e) => setShowDamageNumbers(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>3D Floating Ground Items</span>
                    <input
                      type="checkbox"
                      checked={showFloatingLoot}
                      onChange={(e) => setShowFloatingLoot(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Avatar Footstep Dust Puffs</span>
                    <input
                      type="checkbox"
                      checked={footstepDust}
                      onChange={(e) => setFootstepDust(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: AUDIO & SOUND */}
            {activeTab === 'AUDIO' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Sound & Music Levels</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Volume controls for UI feedback, combat abilities, and ambient world music.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3.5">
                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                    <span>Mute All Audio</span>
                    <input
                      type="checkbox"
                      checked={isMuted}
                      onChange={(e) => setIsMuted(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  {!isMuted && (
                    <>
                      <div className="space-y-1 pt-2 border-t border-border/20">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Master Volume</span>
                          <span className="font-bold text-primary">{masterVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={masterVolume}
                          onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                          className="w-full accent-primary h-1.5 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Sound Effects (SFX)</span>
                          <span className="font-bold text-primary">{sfxVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={sfxVolume}
                          onChange={(e) => {
                            setSfxVolume(parseInt(e.target.value));
                            soundSynth?.playUiClick?.();
                          }}
                          className="w-full accent-primary h-1.5 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Music & Jukebox</span>
                          <span className="font-bold text-primary">{musicVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={musicVolume}
                          onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                          className="w-full accent-primary h-1.5 cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: CONTROLS & BINDS */}
            {activeTab === 'CONTROLS' && (
              <div className="space-y-4 max-w-2xl font-mono text-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Controls & Keybindings</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Keyboard and mouse mapping for movement, hotbar, and menus.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-2.5">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Core Gameplay Binds
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: 'W, A, S, D', action: 'Move Operative' },
                      { key: 'Space / E', action: 'Interact / Talk' },
                      { key: '1 – 8', action: 'Trigger Hotbar Action' },
                      { key: 'Tab', action: 'Target Nearest Enemy' },
                      { key: 'Q', action: 'Companion Pie Menu' },
                      { key: 'I', action: 'Inventory Dock' },
                      { key: 'C', action: 'Character Vitals' },
                      { key: 'M', action: 'World Map Radar' },
                      { key: 'Enter', action: 'Open Chat Window' },
                      { key: 'Escape', action: 'System Menu' },
                    ].map((b) => (
                      <div key={b.key} className="flex items-center justify-between p-2 rounded bg-[#03060c] border border-border/30">
                        <span className="px-1.5 py-0.5 rounded bg-card border border-border/40 font-bold text-primary text-[10px]">
                          {b.key}
                        </span>
                        <span className="text-muted-foreground text-[11px]">{b.action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Virtual Joystick Toggle */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground">Mobile On-Screen Controls</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Control layout for touch screens & mobile devices</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      const next = mobileControlMode === 'floating' ? 'dpad' : 'floating';
                      setMobileControlMode(next);
                      showToast(`Mobile controls: ${next === 'floating' ? 'Floating Joystick' : 'Fixed D-Pad'}`);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                      mobileControlMode === 'floating'
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-[#060e1c] border-border/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mobileControlMode === 'floating' ? 'Floating Joystick' : 'Fixed D-Pad'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: INTERFACE & HUD */}
            {activeTab === 'INTERFACE' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Interface & HUD Customization</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Color themes, dock layout presets, scale factors, and visual edit mode.
                  </p>
                </div>

                {/* Viewfinder Edit Mode Button */}
                <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-primary">Viewfinder Layout Editor</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Drag, resize, and position all HUD elements on-screen in real time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={enterViewfinderEdit}
                    className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Edit HUD Layout</span>
                  </button>
                </div>

                {/* HUD Theme Selector */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-2.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Theme Palette</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HUD_THEME_LIST.map((theme) => {
                      const isSelected = hudThemeId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            setHudTheme(theme.id);
                            showToast(`HUD theme set to ${theme.name}`);
                          }}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/20 border-primary/50 text-primary'
                              : 'bg-[#060e1c] border-border/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{theme.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HUD Preset Selector */}
                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-2.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Layout Preset</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BUILTIN_HUD_PRESETS.map((preset) => {
                      const isSelected = activeHudPreset?.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            soundSynth?.playUiClick?.();
                            setActiveHudPreset(preset.id);
                            showToast(`Preset: ${preset.name}`);
                          }}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/20 border-primary/50 text-primary'
                              : 'bg-[#060e1c] border-border/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="text-xs font-bold block">{preset.name}</span>
                          <span className="text-[9px] text-muted-foreground mt-0.5 block">{preset.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reset HUD */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      resetHudConfig();
                      showToast('HUD restored to factory default layout.');
                    }}
                    className="px-3 py-1.5 rounded bg-[#0a1628] hover:bg-card border border-border/40 text-muted-foreground hover:text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Layout to Default</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 7: GAMEPLAY & SOCIAL */}
            {activeTab === 'GAMEPLAY' && (
              <div className="space-y-4 max-w-2xl font-mono">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Social & Combat Settings</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Player nameplates, party invitations, and combat targeting preferences.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#0a1628]/60 border border-border/40 space-y-3">
                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer">
                    <span>Show Other Players' Nameplates & Health</span>
                    <input
                      type="checkbox"
                      checked={showPeerNameplates}
                      onChange={(e) => setShowPeerNameplates(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Combat Smart Auto-Targeting</span>
                    <input
                      type="checkbox"
                      checked={combatAutoTarget}
                      onChange={(e) => setCombatAutoTarget(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/20">
                    <span>Auto-Accept Party Invites from Friends</span>
                    <input
                      type="checkbox"
                      checked={autoAcceptFriendParty}
                      onChange={(e) => setAutoAcceptFriendParty(e.target.checked)}
                      className="accent-primary rounded"
                    />
                  </label>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* OS Window Footer Bar */}
        <div className="px-4 py-2 bg-[#0a1628]/90 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground select-none">
          <div className="flex items-center gap-3">
            <span>Saints Gaming v2.1.664</span>
            <span>•</span>
            <span>Time To Play</span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              onClose();
            }}
            className="px-3 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary font-bold border border-primary/40 transition-all cursor-pointer"
          >
            Resume Game
          </button>
        </div>

      </div>
    </div>
  );
}
