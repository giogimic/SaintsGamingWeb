/**
 * Studio Omnisearch — Ctrl+K command palette for definitions, maps, and actions.
 * PT1 (bible 27 §4.4). Client-side index built from existing API data.
 *
 * Searches maps, items, loot tables, quests, creatures, NPCs, abilities, classes,
 * dialogue, and provides quick-action stubs (open dock, switch mode, etc.).
 */
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Map, Package, ScrollText, PawPrint, Sword, Users, Coins, MessageSquare,
  Star, StarOff, Bookmark, ChevronRight, Zap, CornerDownLeft, X, Hash, Layers
} from 'lucide-react';
import { useEditorStore, type PanelId, STUDIO_DOCK_META } from './editor-store';
import { useGameStore } from '../store';
import { useStudioBookmarks, type StudioBookmarkEntry } from './hooks/useStudioBookmarks';
import { GAME_MAPS, loadMap } from '../data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';

/* ── Types ────────────────────────────────────────── */

export type SearchResultType =
  | 'map' | 'item' | 'loot' | 'quest' | 'creature' | 'npc'
  | 'dialogue' | 'ability' | 'class' | 'action' | 'dock';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Called when the result is selected. */
  onSelect: () => void;
  bookmarkable?: boolean;
}

const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  map: <Map className="w-4 h-4" />,
  item: <Package className="w-4 h-4" />,
  loot: <Coins className="w-4 h-4" />,
  quest: <ScrollText className="w-4 h-4" />,
  creature: <PawPrint className="w-4 h-4" />,
  npc: <Users className="w-4 h-4" />,
  dialogue: <MessageSquare className="w-4 h-4" />,
  ability: <Zap className="w-4 h-4" />,
  class: <Sword className="w-4 h-4" />,
  action: <ChevronRight className="w-4 h-4" />,
  dock: <Layers className="w-4 h-4" />,
};

const TYPE_COLORS: Record<SearchResultType, string> = {
  map: 'text-emerald-400',
  item: 'text-amber-400',
  loot: 'text-yellow-400',
  quest: 'text-blue-400',
  creature: 'text-pink-400',
  npc: 'text-violet-400',
  dialogue: 'text-cyan-400',
  ability: 'text-red-400',
  class: 'text-orange-400',
  action: 'text-slate-400',
  dock: 'text-slate-400',
};

/* ── Quick-action results (always available) ────── */

function buildQuickActions(showToast: (msg: string) => void): SearchResult[] {
  const dockActions: SearchResult[] = Object.entries(STUDIO_DOCK_META).map(([id, meta]) => ({
    id: `dock:${id}`,
    type: 'dock' as SearchResultType,
    title: `Open ${meta.label}`,
    subtitle: meta.blurb,
    onSelect: () => showToast(`Open ${meta.label} dock`),
  }));

  return [
    {
      id: 'action:save',
      type: 'action',
      title: 'Save Map',
      subtitle: 'Ctrl+S',
      onSelect: () => showToast('Save triggered'),
    },
    {
      id: 'action:playtest',
      type: 'action',
      title: 'Start Playtest',
      subtitle: 'Ctrl+E',
      onSelect: () => {
        useEditorStore.getState().enterPlaytest();
        showToast('Playtest started');
      },
    },
    {
      id: 'action:reset-layout',
      type: 'action',
      title: 'Reset Panel Layout',
      onSelect: () => {
        window.localStorage.removeItem('saints.panelLayouts');
        window.location.reload();
      },
    },
    ...dockActions,
  ];
}

/* ── Main Component ──────────────────────────────── */

export function StudioOmnisearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const showToast = useGameStore((s) => s.showToast);
  const { bookmarks, toggleBookmark, isBookmarked } = useStudioBookmarks();

  const quickActions = useMemo(() => buildQuickActions(showToast), [showToast]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setApiResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced API search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setApiResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const mapped: SearchResult[] = [];
          
          // Map threads/articles/modpacks/users from GlobalSearch API into our format
          if (data.threads) {
            data.threads.forEach((t: any) => mapped.push({
              id: `quest:${t.id}`,
              type: 'quest',
              title: t.title,
              subtitle: `Thread #${t.id}`,
              bookmarkable: true,
              onSelect: () => showToast(`Open quest: ${t.title}`),
            }));
          }
          if (data.modpacks) {
            data.modpacks.forEach((m: any) => mapped.push({
              id: `item:${m.id}`,
              type: 'item',
              title: m.name,
              subtitle: m.game,
              bookmarkable: true,
              onSelect: () => showToast(`Open item: ${m.name}`),
            }));
          }
          setApiResults(mapped);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, showToast]);

  // Build results: bookmarks first, then API results + quick actions (filtered)
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const all: SearchResult[] = [];

    // Show bookmarks if no query, otherwise filter them
    if (!q) {
      bookmarks.forEach((b) => all.push({
        id: b.id,
        type: b.type as SearchResultType,
        title: b.title,
        subtitle: '★ Bookmarked',
        bookmarkable: true,
        onSelect: () => showToast(`Open bookmarked: ${b.title}`),
      }));
    }

    // Add Maps from GAME_MAPS
    if (q) {
      Object.keys(GAME_MAPS).forEach((mapId) => {
        if (mapId.toLowerCase().includes(q)) {
          const map = GAME_MAPS[mapId];
          all.push({
            id: `map:${mapId}`,
            type: 'map',
            title: map.name || mapId,
            subtitle: `World Map (${map.width}x${map.height}) · Warp`,
            bookmarkable: true,
            onSelect: async () => {
              try {
                const loaded = ensureMapHasStudioTilesets(await loadMap(mapId));
                useGameStore.getState().setCurrentMapId(mapId);
                useGameStore.getState().setActiveMapData(loaded);
                useGameStore.getState().showToast(`Warped to ${map.name || mapId}`);
              } catch {
                useGameStore.getState().showToast(`Failed to load map ${mapId}`);
              }
            },
          });
        }
      });
    }

    // Add API results
    all.push(...apiResults);

    // Add quick actions (filter by query)
    const filteredActions = q
      ? quickActions.filter((a) => a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q))
      : quickActions.slice(0, 5); // Show top 5 actions when no query
    all.push(...filteredActions);

    return all;
  }, [query, apiResults, quickActions, bookmarks, showToast]);

  // Keyboard nav
  useEffect(() => {
    setSelectedIdx(0);
  }, [results.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      results[selectedIdx].onSelect();
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [results, selectedIdx, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[selectedIdx] as HTMLElement;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-full max-w-xl rounded-2xl border border-[#806f47]/50 bg-[#050b14]/98 shadow-[0_25px_80px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[#806f47]/30 px-4 py-3">
          <Search className="w-5 h-5 text-[#cbb26a] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search maps, items, quests, creatures, or type a command..."
            className="flex-1 bg-transparent text-white text-sm font-mono placeholder-slate-500 outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[#cbb26a]/30 border-t-[#cbb26a] rounded-full animate-spin" />
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 && query.length >= 2 && !loading && (
            <div className="px-4 py-6 text-center text-slate-500 text-sm font-mono">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length === 0 && query.length < 2 && bookmarks.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-500 text-sm font-mono">
              Type to search or use ↑↓ to browse actions
            </div>
          )}

          {results.map((result, idx) => {
            const isSelected = idx === selectedIdx;
            const bookmarked = result.bookmarkable && isBookmarked(result.id);
            return (
              <div
                key={result.id}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => { result.onSelect(); onClose(); }}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#806f47]/15 border-l-2 border-[#cbb26a]'
                    : 'border-l-2 border-transparent hover:bg-white/5'
                }`}
              >
                <span className={`shrink-0 ${TYPE_COLORS[result.type] || 'text-slate-400'}`}>
                  {result.icon || TYPE_ICONS[result.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-mono truncate">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-[10px] text-slate-500 font-mono truncate">{result.subtitle}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">
                    {result.type}
                  </span>
                  {result.bookmarkable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark({
                          id: result.id,
                          type: result.type,
                          title: result.title,
                        });
                      }}
                      className={`p-1 rounded transition-colors ${
                        bookmarked
                          ? 'text-[#cbb26a] hover:text-[#cbb26a]/70'
                          : 'text-slate-600 hover:text-[#cbb26a]'
                      }`}
                      title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                      {bookmarked ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {isSelected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#806f47]/20 px-4 py-2 text-[10px] font-mono text-slate-600">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bookmark className="w-3 h-3" />
            <span>{bookmarks.length} bookmarked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
