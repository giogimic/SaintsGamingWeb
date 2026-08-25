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
import { ITEM_DB } from '../data/items';
import { SAINTS_DEX } from '../data/saints-dex';
import { SAINTS_TAMER_QUESTS } from '../data/quests';
import { soundSynth } from '@/engine/sound-synth';

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
    onSelect: () => {
      useEditorStore.getState().openPanel(id as PanelId);
      showToast(`Opened ${meta.label} dock`);
    },
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
      id: 'action:atlas',
      type: 'action',
      title: 'World Atlas & Connected Maps',
      subtitle: 'Ctrl+Shift+M',
      onSelect: () => {
        useEditorStore.getState().setStudioMode('atlas');
        showToast('Opened Atlas Studio');
      },
    },
    {
      id: 'action:assets',
      type: 'action',
      title: 'Asset Studio & Manager',
      subtitle: 'Ctrl+Shift+A',
      onSelect: () => {
        useEditorStore.getState().setStudioMode('assets');
        showToast('Opened Asset Studio');
      },
    },
    {
      id: 'action:hero',
      type: 'action',
      title: 'Hero Studio (Archetypes & Classes)',
      subtitle: 'Ctrl+Shift+H',
      onSelect: () => {
        useEditorStore.getState().setStudioMode('hero');
        showToast('Opened Hero Studio');
      },
    },
    {
      id: 'action:problems',
      type: 'action',
      title: 'Map Diagnostics & Problems',
      subtitle: 'Ctrl+Shift+O',
      onSelect: () => {
        useEditorStore.getState().openPanel('problems');
        showToast('Opened Map Diagnostics');
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const showToast = useGameStore((s) => s.showToast);
  const { bookmarks, toggleBookmark, isBookmarked } = useStudioBookmarks();

  const quickActions = useMemo(() => buildQuickActions(showToast), [showToast]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build results: bookmarks first, then maps, items, creatures, quests, quick actions
  const results = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const all: SearchResult[] = [];

    // Show bookmarks if no query
    if (!q) {
      bookmarks.forEach((b) => all.push({
        id: b.id,
        type: b.type as SearchResultType,
        title: b.title,
        subtitle: '★ Bookmarked',
        bookmarkable: true,
        onSelect: () => showToast(`Selected: ${b.title}`),
      }));
    }

    if (q) {
      // 1. Search Maps
      Object.keys(GAME_MAPS).forEach((mapId) => {
        const map = GAME_MAPS[mapId];
        const matchName = (map.name || '').toLowerCase().includes(q);
        const matchId = mapId.toLowerCase().includes(q);
        if (matchName || matchId) {
          all.push({
            id: `map:${mapId}`,
            type: 'map',
            title: map.name || mapId,
            subtitle: `World Map (${map.width}x${map.height}) · Click to Warp`,
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

      // 2. Search Items DB
      Object.entries(ITEM_DB).forEach(([itemId, item]) => {
        if (item.name.toLowerCase().includes(q) || itemId.toLowerCase().includes(q)) {
          all.push({
            id: `item:${itemId}`,
            type: 'item',
            title: item.name,
            subtitle: `${item.type || 'Item'} · ${item.description || 'Game Item'}`,
            bookmarkable: true,
            onSelect: () => {
              useEditorStore.getState().openPanel('items');
              showToast(`Item: ${item.name}`);
            },
          });
        }
      });

      // 3. Search Creatures / Saints Dex
      Object.entries(SAINTS_DEX).forEach(([cId, creature]) => {
        if (creature.name.toLowerCase().includes(q) || cId.toLowerCase().includes(q)) {
          all.push({
            id: `creature:${cId}`,
            type: 'creature',
            title: creature.name,
            subtitle: `${creature.type_primary || 'Creature'} · HP ${creature.stat_profile?.HP || 50} / ATK ${creature.stat_profile?.ATK || 10}`,
            bookmarkable: true,
            onSelect: () => {
              useEditorStore.getState().openPanel('creature');
              showToast(`Creature: ${creature.name}`);
            },
          });
        }
      });

      // 4. Search Quests
      Object.entries(SAINTS_TAMER_QUESTS).forEach(([qId, quest]) => {
        const title = quest.title || quest.name || qId;
        const summary = quest.summary || quest.description || 'Campaign Objective';
        if (title.toLowerCase().includes(q) || qId.toLowerCase().includes(q) || summary.toLowerCase().includes(q)) {
          all.push({
            id: `quest:${qId}`,
            type: 'quest',
            title,
            subtitle: `Quest · ${summary}`,
            bookmarkable: true,
            onSelect: () => {
              useEditorStore.getState().openPanel('quest');
              showToast(`Quest: ${title}`);
            },
          });
        }
      });
    }

    // 5. Add matching quick actions and docks
    const filteredActions = q
      ? quickActions.filter((a) => a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q))
      : quickActions.slice(0, 6);
    all.push(...filteredActions);

    return all;
  }, [query, quickActions, bookmarks, showToast]);

  // Keyboard nav
  useEffect(() => {
    setSelectedIdx(0);
  }, [results.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      soundSynth?.playSelectSound?.();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      soundSynth?.playSelectSound?.();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      soundSynth?.playActionSound?.();
      results[selectedIdx].onSelect();
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      soundSynth?.playSelectSound?.();
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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Palette dialog */}
      <div
        className="relative w-full max-w-xl bg-[#0a101d] border border-amber-500/40 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.2)] overflow-hidden font-mono text-sm"
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
        }}
      >
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/20 bg-[#050b14]/95">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search maps, items, creatures, quests, or commands..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                soundSynth?.playUiClick?.();
                setQuery('');
              }}
              className="text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
            ESC to close
          </span>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
          {results.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching assets or commands found.
            </div>
          ) : (
            results.map((r, idx) => {
              const isSelected = idx === selectedIdx;
              const bookmarked = r.bookmarkable && isBookmarked(r.id);

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    r.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 ${TYPE_COLORS[r.type]}`}>
                      {TYPE_ICONS[r.type]}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span className="font-bold">{r.title}</span>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/5 text-amber-400/80 border border-amber-500/20 font-bold">
                          {r.type}
                        </span>
                      </div>
                      {r.subtitle && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {r.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {r.bookmarkable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundSynth?.playUiClick?.();
                          toggleBookmark({ id: r.id, type: r.type, title: r.title });
                        }}
                        className="text-slate-500 hover:text-amber-400 p-1 cursor-pointer"
                        title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
                      >
                        {bookmarked ? (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ) : (
                          <StarOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-amber-500/20 bg-[#050b14]/70 text-[10px] text-slate-400 font-bold">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-amber-400">{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

