'use client';

import { useEffect, useMemo } from 'react';
import { useGameStore } from './store';
import {
  Backpack,
  Sword,
  Shield,
  ScrollText,
  Store,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

/**
 * QuickMenuDock (ClassicPanel)
 *
 * Compact icon-only dock for quick access to game interface windows.
 * Clicking an icon toggles the corresponding FloatingWindow via the
 * openWindows store — gameMode stays EXPLORING so the game world
 * remains interactive.
 */
export default function ClassicPanel() {
  const toggleWindow = useGameStore((s) => s.toggleWindow);
  const openWindows = useGameStore((s) => s.openWindows);
  const inventory = useGameStore((s) => s.player.inventory);
  const activeQuests = useGameStore((s) => s.player.activeQuests);
  const skills = useGameStore((s) => s.player.skills);

  // Quick-glance badge data
  const itemCount = useMemo(() => {
    return Object.values(inventory).reduce((sum, qty) => sum + qty, 0);
  }, [inventory]);

  const questCount = useMemo(() => {
    return Object.keys(activeQuests || {}).length;
  }, [activeQuests]);

  const totalLevel = useMemo(() => {
    return Object.values(skills).reduce((sum, s) => sum + (s.level || 1), 0);
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

  const buttons = [
    { id: 'inventory', icon: Backpack, hotkey: 'I', label: 'Inventory', badge: itemCount > 0 ? `${itemCount}` : undefined },
    { id: 'skills', icon: Sword, hotkey: 'K', label: 'Skills', badge: `${totalLevel}` },
    { id: 'equipment', icon: Shield, hotkey: 'C', label: 'Equipment' },
    { id: 'quests', icon: ScrollText, hotkey: 'L', label: 'Quest Log', badge: questCount > 0 ? `${questCount}` : undefined },
    { id: 'gtc', icon: Store, hotkey: undefined, label: 'Global Trade Center' },
  ];

  return (
    <div
      className="pointer-events-auto shrink-0 select-none font-mono"
      style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))' }}
    >
      <div
        className="flex items-center gap-1.5 p-1.5 bg-[#0a0318]/95 border border-pink-500/30 rounded-2xl shadow-[0_0_20px_rgba(242,0,137,0.15)] backdrop-blur-xl"
        style={{
          clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
        }}
      >
        {buttons.map((btn) => {
          const isActive = openWindows.includes(btn.id);
          const Icon = btn.icon;
          return (
            <button
              key={btn.id}
              type="button"
              className={`
                flex items-center justify-center p-2 rounded-xl cursor-pointer transition-all duration-150 relative group
                ${
                  isActive
                    ? 'bg-cyan-500/25 text-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.35)] border border-cyan-400/60'
                    : 'text-slate-400 hover:text-cyan-200 hover:bg-white/5 border border-transparent'
                }
              `}
              onClick={() => {
                soundSynth?.playSelectSound?.();
                toggleWindow(btn.id);
              }}
              title={`${btn.label}${btn.hotkey ? ` [${btn.hotkey}]` : ''}`}
            >
              <Icon className="h-4 w-4" />
              {/* Hotkey Label */}
              {btn.hotkey && (
                <span className="absolute -top-1 -right-1 text-[7px] font-bold text-cyan-300 bg-black/80 px-1 rounded border border-cyan-500/30">
                  {btn.hotkey}
                </span>
              )}
              {/* Quick-Glance Badge */}
              {btn.badge && (
                <span className="absolute -bottom-1 right-0 text-[7px] font-bold text-amber-300 bg-black/80 px-1 rounded border border-amber-500/30 leading-tight">
                  {btn.badge}
                </span>
              )}
              {/* Tooltip */}
              <span className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black/95 border border-cyan-500/40 text-[10px] text-cyan-200 px-2 py-0.5 rounded whitespace-nowrap pointer-events-none z-50 font-bold">
                {btn.label}{btn.hotkey ? ` [${btn.hotkey}]` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
