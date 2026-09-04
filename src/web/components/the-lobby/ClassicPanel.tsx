'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Settings,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Star,
  X,
  Sliders,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { getHudTheme } from './hud/hud-themes';

const STORAGE_KEY_FAVORITES = 'saints_quick_menu_favorites';
const DEFAULT_FAVORITES = ['inventory', 'skills', 'equipment', 'quests'];

interface MenuItemDef {
  id: string;
  icon: any;
  hotkey?: string;
  label: string;
  desc: string;
  badge?: string;
  isWindow?: boolean;
  mode?: string;
  action?: () => void;
}

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

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Load custom favorites on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFavorites(parsed);
        }
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // Save favorites to storage
  const updateFavorites = (newFavs: string[]) => {
    setFavorites(newFavs);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(newFavs));
    } catch {
      // Ignore storage error
    }
  };

  const toggleFavorite = (id: string) => {
    soundSynth?.playSelectSound?.();
    if (favorites.includes(id)) {
      if (favorites.length <= 1) return; // Keep at least one
      updateFavorites(favorites.filter((f) => f !== id));
    } else {
      updateFavorites([...favorites, id]);
    }
  };

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setIsCustomizing(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

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

  // Keyboard hotkeys
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
      } else if (key === 'x') {
        soundSynth?.playSelectSound?.();
        setGameMode(gameMode === 'DEX' ? 'EXPLORING' : 'DEX');
      } else if (key === 'p') {
        soundSynth?.playSelectSound?.();
        setGameMode(gameMode === 'PARTY' ? 'EXPLORING' : 'PARTY');
      } else if (key === 'b') {
        soundSynth?.playSelectSound?.();
        setGameMode(gameMode === 'ACHIEVEMENTS' ? 'EXPLORING' : 'ACHIEVEMENTS');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleWindow, gameMode, setGameMode]);

  const menuItems: MenuItemDef[] = [
    {
      id: 'inventory',
      icon: Backpack,
      hotkey: 'I',
      label: 'Inventory',
      desc: 'Items & backpack',
      badge: itemCount > 0 ? `${itemCount}` : undefined,
      isWindow: true,
    },
    {
      id: 'skills',
      icon: Sword,
      hotkey: 'K',
      label: 'Skills',
      desc: 'Abilities & levels',
      badge: `${totalLevel}`,
      isWindow: true,
    },
    {
      id: 'equipment',
      icon: Shield,
      hotkey: 'C',
      label: 'Equipment',
      desc: 'Gear & loadout',
      isWindow: true,
    },
    {
      id: 'quests',
      icon: ScrollText,
      hotkey: 'L',
      label: 'Quest Log',
      desc: 'Active missions',
      badge: questCount > 0 ? `${questCount}` : undefined,
      isWindow: true,
    },
    {
      id: 'dex',
      icon: PawPrint,
      hotkey: 'X',
      label: 'Saints Dex',
      desc: 'Creatures & lore',
      mode: 'DEX',
    },
    {
      id: 'gtc',
      icon: Store,
      label: 'Marketplace',
      desc: 'Grand Exchange / GTC',
      isWindow: true,
    },
    {
      id: 'party',
      icon: Users,
      hotkey: 'P',
      label: 'Party',
      desc: 'Group & roster',
      mode: 'PARTY',
    },
    {
      id: 'achievements',
      icon: Trophy,
      hotkey: 'B',
      label: 'Achievements',
      desc: 'Trophies & goals',
      mode: 'ACHIEVEMENTS',
    },
    {
      id: 'studio',
      icon: Hammer,
      label: 'World Studio',
      desc: 'Map & quest builder',
      action: () => {
        window.location.href = '/studio';
      },
    },
    {
      id: 'options',
      icon: Settings,
      label: 'Options',
      desc: 'Game settings',
      action: () => {
        window.dispatchEvent(new CustomEvent('open_game_options'));
      },
    },
  ];

  const handleItemClick = (item: MenuItemDef) => {
    soundSynth?.playSelectSound?.();
    if (item.action) {
      item.action();
    } else if (item.isWindow) {
      toggleWindow(item.id);
    } else if (item.mode) {
      setGameMode(gameMode === item.mode ? 'EXPLORING' : (item.mode as any));
    }
  };

  const favoriteItems = useMemo(() => {
    return favorites
      .map((id) => menuItems.find((m) => m.id === id))
      .filter((m): m is MenuItemDef => !!m);
  }, [favorites, menuItems]);

  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-full'
      : theme.borderRadiusClass || 'rounded-2xl';

  return (
    <div
      ref={drawerRef}
      className="pointer-events-auto shrink-0 select-none font-mono relative"
      style={{
        filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.7))',
        opacity: hudConfig?.opacity ?? 0.95,
      }}
    >
      {/* ── EXPANDED POP-OUT MENU DRAWER ── */}
      {isExpanded && (
        <div
          className="absolute bottom-full mb-3 right-0 w-80 bg-[#050b14]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 animate-in slide-in-from-bottom-2 fade-in duration-150"
          style={{
            boxShadow: hudConfig?.borderGlow ? theme.palette.accentGlow : undefined,
          }}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-100 tracking-wide">
                  SAINTS MENU
                </h3>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                  {isCustomizing ? 'Pin quick favorites' : 'Time To Play'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setIsCustomizing(!isCustomizing);
                }}
                className={`p-1.5 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  isCustomizing
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
                title="Customize quick favorites bar"
              >
                <Star className="w-3 h-3 text-amber-400" fill={isCustomizing ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">{isCustomizing ? 'Done' : 'Quick'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setIsExpanded(false);
                  setIsCustomizing(false);
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close Menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-0.5 custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = item.isWindow
                ? openWindows.includes(item.id)
                : gameMode === item.mode;
              const isFav = favorites.includes(item.id);
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className={`relative flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'bg-black/40 hover:bg-white/10 border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => {
                    if (isCustomizing) {
                      toggleFavorite(item.id);
                    } else {
                      handleItemClick(item);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-white/5 text-slate-300 group-hover:text-amber-300 group-hover:bg-amber-500/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-black text-slate-200 truncate">
                          {item.label}
                        </span>
                        {item.hotkey && hudConfig?.showHotbarKeybinds !== false && (
                          <span className="text-[8px] font-extrabold text-amber-400 bg-black/80 px-1 py-0.2 rounded border border-amber-500/30 shrink-0">
                            {item.hotkey}
                          </span>
                        )}
                      </div>
                      <p className="text-[8px] text-slate-400 truncate">
                        {item.badge ? `Active: ${item.badge}` : item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Favorite / Pin Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    className={`p-1 rounded-md transition-colors cursor-pointer shrink-0 ml-1 ${
                      isFav
                        ? 'text-amber-400 hover:text-amber-300'
                        : isCustomizing
                        ? 'text-slate-600 hover:text-slate-400'
                        : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:text-amber-300'
                    }`}
                    title={isFav ? 'Unpin from quick bar' : 'Pin to quick bar'}
                  >
                    <Star className="w-3 h-3" fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Drawer Footer Tip */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Press Hotkeys to Quick-Toggle</span>
            <span className="text-amber-400">Saints Gaming</span>
          </div>
        </div>
      )}

      {/* ── COLLAPSED / COMPACT FLOATING BAR ── */}
      <div
        className={`flex items-center gap-1 p-1 bg-black/40 border border-white/10 ${radiusClass} backdrop-blur-xl transition-all duration-200 hover:border-amber-400/40`}
        style={{
          boxShadow: hudConfig?.borderGlow ? theme.palette.accentGlow : undefined,
        }}
      >
        {/* Favorited Quick Action Buttons */}
        {favoriteItems.map((btn) => {
          const isActive = btn.isWindow
            ? openWindows.includes(btn.id)
            : gameMode === btn.mode;
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
                    : 'text-slate-300 hover:text-amber-300 hover:bg-white/10 border border-transparent'
                }
              `}
              onClick={() => handleItemClick(btn)}
              title={`${btn.label}${btn.hotkey ? ` [${btn.hotkey}]` : ''}`}
            >
              <Icon className="h-4 w-4" />

              {/* Hotkey Badge */}
              {btn.hotkey && hudConfig?.showHotbarKeybinds !== false && (
                <span className="absolute -top-1 -right-1 text-[7px] font-extrabold text-amber-300 bg-black/90 px-1 rounded border border-amber-500/30">
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

        {/* Expand / Launcher Button */}
        <button
          type="button"
          onClick={() => {
            soundSynth?.playSelectSound?.();
            setIsExpanded(!isExpanded);
          }}
          className={`flex items-center justify-center p-2 rounded-xl cursor-pointer transition-all duration-150 border ${
            isExpanded
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/20'
          }`}
          title={isExpanded ? 'Collapse Menu' : 'Open Saints Menu'}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
