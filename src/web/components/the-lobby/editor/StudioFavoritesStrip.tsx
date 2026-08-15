/**
 * Studio Favorites Strip — PT1 (bible 27 §4.8).
 *
 * A thin horizontal strip of pinned/bookmarked resources below the menu bar.
 * Click to open, drag to reorder (future), right-click to remove.
 */
'use client';

import React from 'react';
import {
  Star, Map, Package, ScrollText, PawPrint, Sword, Users, Coins,
  MessageSquare, Zap, X
} from 'lucide-react';
import { useStudioBookmarks } from './hooks/useStudioBookmarks';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  map: <Map className="w-3 h-3 text-amber-400" />,
  item: <Package className="w-3 h-3 text-cyan-400" />,
  loot: <Coins className="w-3 h-3 text-yellow-400" />,
  quest: <ScrollText className="w-3 h-3 text-emerald-400" />,
  creature: <PawPrint className="w-3 h-3 text-purple-400" />,
  npc: <Users className="w-3 h-3 text-sky-400" />,
  dialogue: <MessageSquare className="w-3 h-3 text-pink-400" />,
  ability: <Zap className="w-3 h-3 text-amber-400" />,
  class: <Sword className="w-3 h-3 text-red-400" />,
};

export function StudioFavoritesStrip() {
  const { bookmarks, removeBookmark } = useStudioBookmarks();
  const showToast = useGameStore((s) => s.showToast);

  if (bookmarks.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute top-9 left-0 right-0 h-7 z-[109] bg-[#050b14]/95 border-b border-amber-500/20 flex items-center gap-1 px-2 overflow-x-auto select-none backdrop-blur-sm font-mono">
      <Star className="w-3 h-3 text-amber-400/70 shrink-0 mr-1" />
      {bookmarks.map((b) => (
        <button
          key={b.id}
          onClick={() => {
            soundSynth?.playSelectSound?.();
            showToast(`Open: ${b.title}`);
          }}
          className="group flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-amber-500/20 text-[10px] font-mono text-slate-300 hover:text-amber-200 hover:border-amber-500/40 hover:bg-amber-950/30 transition-colors shrink-0 cursor-pointer"
          title={`${b.type}: ${b.title}`}
        >
          <span>{TYPE_ICONS[b.type] || <Star className="w-3 h-3 text-amber-400" />}</span>
          <span className="max-w-[100px] truncate font-bold">{b.title}</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              soundSynth?.playUiClick?.();
              removeBookmark(b.id);
            }}
            className="hidden group-hover:inline-flex text-slate-500 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        </button>
      ))}
    </div>
  );
}

