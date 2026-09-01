'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { X, Monitor, Volume2, Gamepad2, Settings2, Layout, Sliders, LogOut, Check, RotateCcw, Sparkles, LifeBuoy, Hammer, Palette } from 'lucide-react';
import { BUILTIN_HUD_PRESETS } from './default-presets';
import { HUD_THEME_LIST, getHudTheme } from './hud-themes';
import { soundSynth } from '@/engine/sound-synth';
import { canCastUnstuck, UNSTUCK_COOLDOWN_MS, UNSTUCK_CAST_DURATION_MS } from '@/shared/game/worldSpawns';
import { startMapTransition } from '@/shared/game/lobbyWorldJoin';


interface GameOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isAdminUser: boolean;
  isCreationMode: boolean;
  onToggleDevEditor: () => void;
}

type TabType = 'GAME' | 'GRAPHICS' | 'AUDIO' | 'CONTROLS' | 'INTERFACE' | 'GAMEPLAY';

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

        // Query available maps and send to safe world spawn
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

  const [masterVolume, setMasterVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(90);
  const [musicVolume, setMusicVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);

  const [graphicsQuality, setGraphicsQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [targetFps, setTargetFps] = useState<'60' | '120' | 'uncapped'>('60');
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);

  const [showPeerNameplates, setShowPeerNameplates] = useState(true);
  const [autoAcceptFriendParty, setAutoAcceptFriendParty] = useState(false);
  const [combatAutoTarget, setCombatAutoTarget] = useState(true);

  const enterViewfinderEdit = () => {
    setIsEditingInterface(true);
    onClose(); // Auto-close options so the HUD is immediately editable
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'GAME', label: 'Game', icon: <Settings2 className="w-5 h-5" /> },
    { id: 'GRAPHICS', label: 'Graphics', icon: <Monitor className="w-5 h-5" /> },
    { id: 'AUDIO', label: 'Audio', icon: <Volume2 className="w-5 h-5" /> },
    { id: 'CONTROLS', label: 'Controls', icon: <Gamepad2 className="w-5 h-5" /> },
    { id: 'INTERFACE', label: 'Interface', icon: <Layout className="w-5 h-5" /> },
    { id: 'GAMEPLAY', label: 'Gameplay', icon: <Sliders className="w-5 h-5" /> },
  ];

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-2 sm:p-4">
      <div className="flex h-[min(600px,92dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-[#22d3ee]/50 bg-[#050b14]/90 shadow-[0_0_30px_rgba(34,211,238,0.15)] animate-in fade-in zoom-in-95 duration-200 sm:rounded-[2rem] md:h-[600px] md:flex-row backdrop-blur-md">
        
        {/* Sidebar — horizontal scroll tabs on phones */}
        <div className="flex shrink-0 flex-col border-b border-[#22d3ee]/20 bg-black/40 md:w-64 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-4 py-3 md:block md:border-b md:border-[#22d3ee]/20 md:p-6">
            <h2 className="text-xl font-extrabold tracking-tight text-cyan-50 md:text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-cyan-200/50 hover:bg-white/5 hover:text-cyan-100 rounded-full transition-all md:hidden"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:space-y-2 md:overflow-y-auto md:p-4 md:pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setActiveTab(tab.id);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all md:w-full md:gap-3 md:rounded-xl md:px-4 md:py-3 md:text-sm cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[inset_0_0_12px_rgba(34,211,238,0.2)] border border-cyan-400/50'
                    : 'text-slate-400 hover:text-cyan-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* Bottom Actions */}
          <div className="hidden border-t border-[#22d3ee]/20 p-4 md:block">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl font-extrabold transition-all active:scale-95 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
            >
              <LogOut className="w-5 h-5" />
              Leave Game
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex min-h-0 flex-1 flex-col bg-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 hidden p-2 text-cyan-200/50 transition-all hover:bg-white/10 hover:text-cyan-100 rounded-full md:top-6 md:right-6 md:block"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 custom-scrollbar">
            <h3 className="mb-4 border-b border-[#22d3ee]/20 pb-3 text-2xl font-extrabold text-cyan-50 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] sm:mb-6 md:mb-8 md:pb-4 md:text-3xl">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            
            {activeTab === 'GAME' && (
              <div className="space-y-6">
                {/* Character Actions: Unstuck Teleport */}
                <div className="rounded-3xl border border-[#22d3ee]/20 bg-black/40 p-4 sm:p-6 shadow-inner">
                  <h4 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-cyan-200/50">Character Recovery</h4>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-extrabold text-cyan-50">Unstuck Teleport</div>
                      <div className="mt-1 text-sm font-medium text-slate-400">
                        Trapped in terrain or an invalid map? Channel for 5s to return to the world hub. (5m cooldown)
                      </div>
                    </div>
                    <button
                      disabled={isCastingUnstuck || unstuckRemainingCooldown > 0}
                      onClick={handleStartUnstuck}
                      className="shrink-0 rounded-xl bg-amber-600 px-5 py-3 font-extrabold text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all hover:bg-amber-500 hover:translate-y-[2px] disabled:opacity-50 disabled:pointer-events-none active:scale-95 border border-amber-400 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <LifeBuoy className="w-4 h-4" />
                      {isCastingUnstuck
                        ? `Channeling (${unstuckTimer}s)...`
                        : unstuckRemainingCooldown > 0
                        ? `Cooldown (${Math.ceil(unstuckRemainingCooldown / 1000)}s)`
                        : 'Use Unstuck'}
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#22d3ee]/20 bg-black/40 p-4 sm:p-6 shadow-inner">
                  <h4 className="mb-4 text-sm font-extrabold uppercase tracking-widest text-cyan-200/50">Display</h4>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-extrabold text-cyan-50">Fullscreen Mode</div>
                      <div className="mt-1 text-sm font-medium text-slate-400">Best on phones when the browser allows it (iOS may block).</div>
                    </div>
                    <button
                      onClick={() => {
                        soundSynth?.playActionSound?.();
                        onToggleFullscreen();
                      }}
                      className="shrink-0 rounded-xl bg-cyan-600 px-5 py-3 font-extrabold text-white shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all hover:bg-cyan-500 hover:translate-y-[2px] hover:shadow-[0_0_10px_rgba(34,211,238,0.6)] active:scale-95 border border-cyan-400 cursor-pointer"
                    >
                      {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'INTERFACE' && (
              <div className="space-y-6">
                {/* 1. Theme Engine Styles */}
                <div className="bg-black/40 border border-border/40 p-6 rounded-3xl shadow-inner space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider">
                        Game Engine UI Theme (6 Premade Styles)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetHudConfig();
                        showToast('Reset UI style to Saints Gold default.');
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-amber-400/40 hover:text-white transition cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3 text-amber-400" />
                      Reset to Default
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {HUD_THEME_LIST.map((themeOption) => {
                      const isSelected = (hudThemeId || hudConfig?.themeId || 'saints-gold') === themeOption.id;
                      return (
                        <button
                          key={themeOption.id}
                          type="button"
                          onClick={() => {
                            soundSynth?.playActionSound?.();
                            setHudTheme(themeOption.id);
                            showToast(`Applied ${themeOption.name} theme.`);
                          }}
                          className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                              : 'bg-black/60 text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: themeOption.palette.primary }}
                              />
                              <span className="font-extrabold text-xs text-slate-100 truncate">
                                {themeOption.name}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                            {themeOption.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. HUD Engine Customization Sliders */}
                <div className="bg-black/40 border border-border/40 p-6 rounded-3xl shadow-inner space-y-4">
                  <h4 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider">
                    Interface Customizer
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* HUD Scale */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-200">
                        <span>HUD Scale</span>
                        <span className="text-amber-400 font-mono">
                          {Math.round((hudConfig?.scale ?? 1) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="75"
                        max="125"
                        step="5"
                        value={Math.round((hudConfig?.scale ?? 1) * 100)}
                        onChange={(e) => setHudScale(Number(e.target.value) / 100)}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Glass Opacity */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-200">
                        <span>Glass Backdrop Opacity</span>
                        <span className="text-amber-400 font-mono">
                          {Math.round((hudConfig?.opacity ?? 0.95) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="100"
                        step="5"
                        value={Math.round((hudConfig?.opacity ?? 0.95) * 100)}
                        onChange={(e) => updateHudConfig({ opacity: Number(e.target.value) / 100 })}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Vitality Gauge Format */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-300 block">
                        Vitality Gauge Format
                      </label>
                      <select
                        value={hudConfig?.vitalsFormat || 'dual-bar'}
                        onChange={(e) => updateHudConfig({ vitalsFormat: e.target.value as any })}
                        className="w-full text-xs p-2 rounded-xl bg-black/80 border border-white/15 text-slate-200 cursor-pointer hover:border-amber-400/50 transition-colors"
                      >
                        <option value="dual-bar">Dual Full Bars (HP + MP + XP)</option>
                        <option value="compact-stacked">Compact Stacked</option>
                        <option value="heart-containers">Heart Containers (Pokemon / Zelda)</option>
                        <option value="pokemon-gauge">Pokemon Battle Gauge (Tri-Color HP)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={hudConfig?.borderGlow !== false}
                        onChange={(e) => updateHudConfig({ borderGlow: e.target.checked })}
                        className="rounded accent-amber-400 cursor-pointer"
                      />
                      <span>Glow Borders</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={hudConfig?.showCoords !== false}
                        onChange={(e) => updateHudConfig({ showCoords: e.target.checked })}
                        className="rounded accent-amber-400 cursor-pointer"
                      />
                      <span>Radar Coords</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={hudConfig?.showHotbarKeybinds !== false}
                        onChange={(e) => updateHudConfig({ showHotbarKeybinds: e.target.checked })}
                        className="rounded accent-amber-400 cursor-pointer"
                      />
                      <span>Hotbar Keybinds</span>
                    </label>
                  </div>
                </div>

                {/* 3. Layout Presets & Viewfinder Edit */}
                <div className="bg-black/40 border border-border/40 p-6 rounded-3xl shadow-inner space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
                      HUD Docking Presets
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BUILTIN_HUD_PRESETS.map((preset) => {
                      const isSelected = activeHudPreset?.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            soundSynth?.playActionSound?.();
                            setActiveHudPreset(preset.id);
                            showToast(`Applied "${preset.name}".`);
                          }}
                          className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-200 border-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.25)]'
                              : 'bg-black/60 text-slate-400 border-white/10 hover:bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-sm text-slate-100">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {preset.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Edit Interface Live Mode */}
                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-slate-100 font-extrabold text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        Interactive Viewfinder Edit Mode
                      </div>
                      <div className="text-slate-400 text-xs mt-0.5 font-medium">
                        Drag, drop, and resize in-game HUD widgets directly across screen dock zones.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={enterViewfinderEdit}
                      disabled={isEditingInterface}
                      className="shrink-0 px-6 py-2.5 rounded-xl font-extrabold transition-all active:scale-95 bg-primary text-primary-foreground shadow-lg hover:brightness-110 disabled:opacity-60 cursor-pointer text-xs"
                    >
                      Edit HUD Layout
                    </button>
                  </div>

                  {isAdminUser && (
                    <div className="flex items-center justify-between p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <Hammer className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="text-amber-300 font-extrabold text-xs block">
                            World Studio Interface Designer
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            Advanced engine UI editor with live previews in Studio.
                          </span>
                        </div>
                      </div>
                      <a
                        href="/studio"
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer"
                      >
                        Open Studio
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}



            {activeTab === 'CONTROLS' && (
              <div className="space-y-6">
                <div className="bg-black/40 border border-[#22d3ee]/20 p-6 rounded-3xl shadow-inner">
                  <h4 className="text-sm font-extrabold text-cyan-200/50 mb-4 uppercase tracking-widest">
                    Mobile Touch
                  </h4>
                  <div className="text-cyan-50 font-extrabold text-lg mb-1">Movement Style</div>
                  <div className="text-slate-400 text-sm mb-5 font-medium">
                    Default is a floating joystick that appears where you touch. Switch to a fixed D-Pad anytime.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMobileControlMode('floating')}
                      className={`px-4 py-4 rounded-2xl font-extrabold text-sm border transition-all ${
                        mobileControlMode === 'floating'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.3)]'
                          : 'bg-black/60 text-slate-400 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      Floating Joystick
                    </button>
                    <button
                      onClick={() => setMobileControlMode('dpad')}
                      className={`px-4 py-4 rounded-2xl font-extrabold text-sm border transition-all ${
                        mobileControlMode === 'dpad'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.3)]'
                          : 'bg-black/60 text-slate-400 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      Static D-Pad
                    </button>
                  </div>
                </div>
                
                <div className="bg-black/40 border border-[#22d3ee]/20 p-6 rounded-3xl shadow-inner">
                  <h4 className="text-sm font-extrabold text-cyan-200/50 mb-4 uppercase tracking-widest">
                    Keyboard Bindings
                  </h4>
                  <div className="text-cyan-50 font-extrabold text-lg mb-1">Keybind Remapping</div>
                  <div className="text-slate-400 text-sm font-medium mb-4">
                    Rebind hotkeys for menus (I, K, P, etc.) and abilities. Coming soon!
                  </div>
                  <div className="flex flex-col items-center justify-center h-24 border border-dashed border-white/10 rounded-xl bg-black/20 text-cyan-200/30">
                    <p className="font-extrabold text-sm uppercase">Coming Soon</p>
                  </div>
                </div>
              </div>
            )}

            {/* GRAPHICS TAB */}
            {activeTab === 'GRAPHICS' && (
              <div className="space-y-6">
                <div className="bg-black/40 border border-[#22d3ee]/20 p-6 rounded-3xl shadow-inner space-y-5">
                  <h4 className="text-sm font-extrabold text-cyan-200/50 uppercase tracking-widest">
                    Visual Fidelity
                  </h4>
                  <div>
                    <div className="text-cyan-50 font-extrabold text-lg mb-1">Quality Preset</div>
                    <div className="text-slate-400 text-sm mb-4 font-medium">
                      Adjust shadow resolution, lighting reflections, and particle density.
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['low', 'medium', 'high'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setGraphicsQuality(q)}
                          className={`px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                            graphicsQuality === q
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.3)]'
                              : 'bg-black/60 text-slate-400 border-white/10 hover:bg-white/5'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-cyan-50 font-extrabold text-base">Target Framerate</div>
                      <div className="text-slate-400 text-xs font-medium mt-0.5">Sync game loop refresh rate to monitor.</div>
                    </div>
                    <div className="flex gap-2">
                      {(['60', '120', 'uncapped'] as const).map((fps) => (
                        <button
                          key={fps}
                          onClick={() => setTargetFps(fps)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer ${
                            targetFps === fps
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                              : 'bg-black/60 text-slate-400 border-white/10 hover:bg-white/5'
                          }`}
                        >
                          {fps === 'uncapped' ? 'Max' : `${fps} FPS`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-cyan-50 font-extrabold text-base">Floating Combat Text</div>
                      <div className="text-slate-400 text-xs font-medium mt-0.5">Show damage and capture numbers above entities.</div>
                    </div>
                    <button
                      onClick={() => setShowDamageNumbers((v) => !v)}
                      className={`w-12 h-6 rounded-full relative transition-colors border cursor-pointer ${
                        showDamageNumbers ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/60 border-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 bottom-0.5 w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all ${
                        showDamageNumbers ? 'left-[24px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIO TAB */}
            {activeTab === 'AUDIO' && (
              <div className="space-y-6">
                <div className="bg-black/40 border border-[#22d3ee]/20 p-6 rounded-3xl shadow-inner space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-cyan-200/50 uppercase tracking-widest">
                      Volume Controls
                    </h4>
                    <button
                      onClick={() => setIsMuted((v) => !v)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isMuted
                          ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                      }`}
                    >
                      {isMuted ? 'MUTED' : 'UNMUTED'}
                    </button>
                  </div>

                  {/* Master Volume */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-cyan-50 font-bold">Master Volume</span>
                      <span className="font-mono text-cyan-300">{isMuted ? 0 : masterVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : masterVolume}
                      onChange={(e) => {
                        setMasterVolume(Number(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      className="w-full accent-cyan-400 h-1.5 bg-black/60 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* SFX Volume */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-cyan-50 font-bold">Sound Effects (SFX)</span>
                      <span className="font-mono text-cyan-300">{isMuted ? 0 : sfxVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : sfxVolume}
                      onChange={(e) => {
                        setSfxVolume(Number(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      className="w-full accent-cyan-400 h-1.5 bg-black/60 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Music Volume */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-cyan-50 font-bold">Music & Ambience</span>
                      <span className="font-mono text-cyan-300">{isMuted ? 0 : musicVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : musicVolume}
                      onChange={(e) => {
                        setMusicVolume(Number(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      className="w-full accent-cyan-400 h-1.5 bg-black/60 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* GAMEPLAY TAB */}
            {activeTab === 'GAMEPLAY' && (
              <div className="space-y-6">
                <div className="bg-black/40 border border-[#22d3ee]/20 p-6 rounded-3xl shadow-inner space-y-5">
                  <h4 className="text-sm font-extrabold text-cyan-200/50 uppercase tracking-widest">
                    Multiplayer & Combat
                  </h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-cyan-50 font-extrabold text-base">Show Nearby Saints</div>
                      <div className="text-slate-400 text-xs font-medium mt-0.5">Render online players and nameplates in your shard.</div>
                    </div>
                    <button
                      onClick={() => setShowPeerNameplates((v) => !v)}
                      className={`w-12 h-6 rounded-full relative transition-colors border cursor-pointer ${
                        showPeerNameplates ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/60 border-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 bottom-0.5 w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all ${
                        showPeerNameplates ? 'left-[24px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-cyan-50 font-extrabold text-base">Combat Auto-Targeting</div>
                      <div className="text-slate-400 text-xs font-medium mt-0.5">Automatically select hostile monsters when attacked.</div>
                    </div>
                    <button
                      onClick={() => setCombatAutoTarget((v) => !v)}
                      className={`w-12 h-6 rounded-full relative transition-colors border cursor-pointer ${
                        combatAutoTarget ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/60 border-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 bottom-0.5 w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all ${
                        combatAutoTarget ? 'left-[24px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-cyan-50 font-extrabold text-base">Auto-Accept Friend Party Invites</div>
                      <div className="text-slate-400 text-xs font-medium mt-0.5">Automatically accept invitations sent by friends.</div>
                    </div>
                    <button
                      onClick={() => setAutoAcceptFriendParty((v) => !v)}
                      className={`w-12 h-6 rounded-full relative transition-colors border cursor-pointer ${
                        autoAcceptFriendParty ? 'bg-cyan-500/20 border-cyan-400' : 'bg-black/60 border-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 bottom-0.5 w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all ${
                        autoAcceptFriendParty ? 'left-[24px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>

          <div className="border-t border-[#22d3ee]/20 p-3 md:hidden">
            <button
              onClick={() => window.location.href = '/'}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 font-extrabold text-red-400 transition-all active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
            >
              <LogOut className="w-5 h-5" />
              Leave Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
