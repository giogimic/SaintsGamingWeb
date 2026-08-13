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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  map: <Map className="w-3 h-3" />,
  item: <Package className="w-3 h-3" />,
  loot: <Coins className="w-3 h-3" />,
  quest: <ScrollText className="w-3 h-3" />,
  creature: <PawPrint className="w-3 h-3" />,
  npc: <Users className="w-3 h-3" />,
  dialogue: <MessageSquare className="w-3 h-3" />,
  ability: <Zap className="w-3 h-3" />,
  class: <Sword className="w-3 h-3" />,
};

export function StudioFavoritesStrip() {
  const { bookmarks, removeBookmark } = useStudioBookmarks();
  const showToast = useGameStore((s) => s.showToast);

  if (bookmarks.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute top-8 left-0 right-0 h-7 z-[109] bg-[#050b14]/90 border-b border-[#806f47]/20 flex items-center gap-1 px-2 overflow-x-auto select-none backdrop-blur-sm">
      <Star className="w-3 h-3 text-[#cbb26a]/50 shrink-0 mr-1" />
      {bookmarks.map((b) => (
        <button
          key={b.id}
          onClick={() => showToast(`Open: ${b.title}`)}
          className="group flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-white hover:bg-[#806f47]/15 transition-colors shrink-0"
          title={`${b.type}: ${b.title}`}
        >
          <span className="text-slate-500">{TYPE_ICONS[b.type] || <Star className="w-3 h-3" />}</span>
          <span className="max-w-[100px] truncate">{b.title}</span>
          <span
            onClick={(e) => { e.stopPropagation(); removeBookmark(b.id); }}
            className="hidden group-hover:inline-flex text-slate-600 hover:text-red-400 transition-colors ml-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
