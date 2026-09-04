'use client';

import { useEffect, useMemo } from 'react';
import { useGameStore } from './store';
import {
  Backpack,
  Sword,
  Shield,
  ScrollText,
  Store,
  Users,
  PawPrint,
  Trophy,
  Hammer,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { getHudTheme } from './hud/hud-themes';

/**
 * QuickMenuDock (ClassicPanel)
 *
 * Compact icon dock for quick access to MMO game interface windows.
 * Clean modern dark glass styling with active amber/gold glow and configurable buttons.
 */
export default function ClassicPanel() {
  const toggleWindow = useGameStore((s) => s.toggleWindow);
  const openWindows = useGameStore((s) => s.openWindows);
  const inventory = useGameStore((s) => s.player.inventory);
  const activeQuests = useGameStore((s) => s.player.activeQuests);
  const skills = useGameStore((s) => s.player.skills);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const gameMode = useGameStore((s) => s.gameMode);

  const hudThemeId = useGameStore((s) => s.hudThemeId);
  const hudConfig = useGameStore((s) => s.hudConfig);
  const theme = getHudTheme(hudThemeId || hudConfig?.themeId);

  // Quick-glance badge data
  const itemCount = useMemo(() => {
    return Object.values(inventory || {}).reduce((sum, qty) => sum + qty, 0);
  }, [inventory]);

  const questCount = useMemo(() => {
    return Object.keys(activeQuests || {}).length;
  }, [activeQuests]);

  const totalLevel = useMemo(() => {
    return Object.values(skills || {}).reduce((sum, s) => sum + (s.level || 1), 0);
  }, [skills]);

  // Keyboard hotkeys — toggle windows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;

      const key = e.key.toLowerCase();
      if (key === 'i') {
        soundSynth?.playSelectSound?.();
        toggleWindow('inventory');
      } else if (key === 'k') {
        soundSynth?.playSelectSound?.();
        toggleWindow('skills');
      } else if (key === 'c') {
        soundSynth?.playSelectSound?.();
        toggleWindow('equipment');
      } else if (key === 'l') {
        soundSynth?.playSelectSound?.();
        toggleWindow('quests');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleWindow]);

  const quickConfig = hudConfig?.quickMenuButtons || {
    inventory: true,
    skills: true,
    equipment: true,
    quests: true,
    gtc: true,
    party: true,
    dex: true,
    achievements: true,
    studio: true,
  };

  const allButtons = [
    { id: 'inventory', icon: Backpack, hotkey: 'I', label: 'Inventory', badge: itemCount > 0 ? `${itemCount}` : undefined, enabled: quickConfig.inventory !== false, isWindow: true },
    { id: 'skills', icon: Sword, hotkey: 'K', label: 'Skills', badge: `${totalLevel}`, enabled: quickConfig.skills !== false, isWindow: true },
    { id: 'equipment', icon: Shield, hotkey: 'C', label: 'Equipment', enabled: quickConfig.equipment !== false, isWindow: true },
    { id: 'quests', icon: ScrollText, hotkey: 'L', label: 'Quest Log', badge: questCount > 0 ? `${questCount}` : undefined, enabled: quickConfig.quests !== false, isWindow: true },
    { id: 'gtc', icon: Store, hotkey: undefined, label: 'Grand Exchange / GTC', enabled: quickConfig.gtc !== false, isWindow: true },
    { id: 'party', icon: Users, hotkey: 'P', label: 'Party Roster', enabled: quickConfig.party === true, isWindow: false, mode: 'PARTY' as const },
    { id: 'dex', icon: PawPrint, hotkey: 'X', label: 'Saints Dex', enabled: quickConfig.dex === true, isWindow: false, mode: 'DEX' as const },
    { id: 'achievements', icon: Trophy, hotkey: 'B', label: 'Achievements', enabled: quickConfig.achievements === true, isWindow: false, mode: 'ACHIEVEMENTS' as const },
  ];

  const activeButtons = allButtons.filter((b) => b.enabled);

  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-full'
      : theme.borderRadiusClass || 'rounded-2xl';

  return (
    <div
      className="pointer-events-auto shrink-0 select-none font-mono"
      style={{
        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.7))',
        opacity: hudConfig?.opacity ?? 0.95,
      }}
    >
      <div
        className={`flex items-center gap-1.5 p-1.5 ${theme.palette.glassBg} border ${theme.palette.border} ${radiusClass} backdrop-blur-xl`}
        style={{
          boxShadow: hudConfig?.borderGlow ? theme.palette.accentGlow : undefined,
        }}
      >
        {activeButtons.map((btn) => {
          const isActive = btn.isWindow ? openWindows.includes(btn.id) : gameMode === btn.mode;
          const Icon = btn.icon;
          return (
            <button
              key={btn.id}
              type="button"
              className={`
                flex items-center justify-center p-2 rounded-xl cursor-pointer transition-all duration-150 relative group
                ${
                  isActive
                    ? `${theme.palette.badgeBg} ${theme.palette.badgeText} shadow-[0_0_12px_rgba(245,158,11,0.35)] border ${theme.palette.borderActive}`
                    : 'text-slate-400 hover:text-amber-200 hover:bg-white/10 border border-transparent'
                }
              `}
              onClick={() => {
                soundSynth?.playSelectSound?.();
                if (btn.isWindow) {
                  toggleWindow(btn.id);
                } else if (btn.mode) {
                  setGameMode(gameMode === btn.mode ? 'EXPLORING' : btn.mode);
                }
              }}
              title={`${btn.label}${btn.hotkey ? ` [${btn.hotkey}]` : ''}`}
            >
              <Icon className="h-4 w-4" />
              {/* Hotkey Label */}
              {btn.hotkey && hudConfig?.showHotbarKeybinds !== false && (
                <span className="absolute -top-1 -right-1 text-[7px] font-bold text-amber-300 bg-black/90 px-1 rounded border border-amber-500/30">
                  {btn.hotkey}
                </span>
              )}
              {/* Quick-Glance Badge */}
              {btn.badge && (
                <span className="absolute -bottom-1 right-0 text-[7px] font-bold text-emerald-300 bg-black/90 px-1 rounded border border-emerald-500/30 leading-tight">
                  {btn.badge}
                </span>
              )}
              {/* Tooltip */}
              <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-[#050b14]/95 border border-amber-500/40 text-[10px] text-amber-200 px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none z-50 font-bold shadow-lg">
                {btn.label}{btn.hotkey ? ` [${btn.hotkey}]` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
