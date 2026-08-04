'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Coins,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  aggregateDropStats,
  type LootDropEntry,
  type LootPoolDef,
  simulateLootPool,
} from '@/shared/game/lootRefs';

type ApiLootTable = {
  id: string;
  gameId: string;
  name: string;
  description?: string | null;
  entries: LootDropEntry[];
  rollsPerDrop: number;
  guaranteedDrops: LootDropEntry[];
  minLevel?: number | null;
  maxLevel?: number | null;
  requiredTags: string[];
};

function toPoolDef(row: ApiLootTable): LootPoolDef {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    rollsPerDrop: row.rollsPerDrop,
    entries: row.entries,
    guaranteedDrops: row.guaranteedDrops,
    minLevel: row.minLevel ?? undefined,
    maxLevel: row.maxLevel ?? undefined,
    requiredTags: row.requiredTags,
  };
}

/**
 * Studio Loot Manager (bible 17) — data-driven pools, preview, simulate.
 * Entities reference pool IDs; balancing stays centralized.
 */
export const LootManagerPanel: React.FC = () => {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const showToast = useGameStore((s) => s.showToast);

  const [tables, setTables] = useState<ApiLootTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simCount, setSimCount] = useState(100);
  const [simStats, setSimStats] = useState<Record<string, { count: number; totalQty: number; rate: number }> | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEntriesJson, setDraftEntriesJson] = useState('[]');
  const [draftGuaranteedJson, setDraftGuaranteedJson] = useState('[]');
  const [draftRolls, setDraftRolls] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/loot/tables?gameId=${encodeURIComponent(activeGameId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load loot tables');
      setTables(data.items ?? []);
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Failed to load loot tables');
    } finally {
      setLoading(false);
    }
  }, [activeGameId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }, [tables, query]);

  const selected = tables.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setDraftName('');
      setDraftEntriesJson('[]');
      setDraftGuaranteedJson('[]');
      setDraftRolls(1);
      setSimStats(null);
      return;
    }
    setDraftName(selected.name);
    setDraftEntriesJson(JSON.stringify(selected.entries, null, 2));
    setDraftGuaranteedJson(JSON.stringify(selected.guaranteedDrops, null, 2));
    setDraftRolls(selected.rollsPerDrop);
    setSimStats(null);
  }, [selected]);

  const createPool = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/loot/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGameId,
          name: `New Pool ${tables.length + 1}`,
          description: '',
          entries: [{ itemId: 'wood', weight: 100, min: 1, max: 2 }],
          rollsPerDrop: 1,
          guaranteedDrops: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      showToast('Loot pool created');
      await load();
      if (data.item?.id) setSelectedId(data.item.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const clonePool = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/loot/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGameId,
          name: `${selected.name} (copy)`,
          description: selected.description,
          entries: selected.entries,
          rollsPerDrop: selected.rollsPerDrop,
          guaranteedDrops: selected.guaranteedDrops,
          minLevel: selected.minLevel,
          maxLevel: selected.maxLevel,
          requiredTags: selected.requiredTags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clone failed');
      showToast('Pool cloned');
      await load();
      if (data.item?.id) setSelectedId(data.item.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Clone failed');
    } finally {
      setSaving(false);
    }
  };

  const savePool = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      let entries: LootDropEntry[] = [];
      let guaranteedDrops: LootDropEntry[] = [];
      try {
        entries = JSON.parse(draftEntriesJson);
        guaranteedDrops = JSON.parse(draftGuaranteedJson);
      } catch {
        throw new Error('Entries / guaranteed JSON is invalid');
      }
      const res = await fetch(`/api/loot/tables/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draftName,
          entries,
          guaranteedDrops,
          rollsPerDrop: draftRolls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      showToast('Loot pool saved');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deletePool = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete loot pool "${selected.name}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/loot/tables/${selected.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      showToast('Pool deleted');
      setSelectedId(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const runSimulate = () => {
    if (!selected) return;
    const pool = toPoolDef({
      ...selected,
      name: draftName,
      rollsPerDrop: draftRolls,
      entries: JSON.parse(draftEntriesJson),
      guaranteedDrops: JSON.parse(draftGuaranteedJson),
    });
    const samples = Array.from({ length: Math.max(1, Math.min(simCount, 5000)) }, () =>
      simulateLootPool(pool)
    );
    setSimStats(aggregateDropStats(samples));
  };

  const exportJson = () => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.name.replace(/\s+/g, '_').toLowerCase()}_loot.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 text-slate-200">
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-[#cbb26a]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#cbb26a]">
              Loot Manager
            </h3>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Global pools for world profile <span className="text-slate-300">{activeGameId}</span>. Entities
            reference pool IDs — change once, update everywhere.
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            title="Refresh"
            onClick={() => void load()}
            className="rounded-md border border-slate-700 p-1.5 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            title="Create pool"
            disabled={saving}
            onClick={() => void createPool()}
            className="rounded-md border border-[#806f47]/50 bg-[#cbb26a]/10 p-1.5 text-[#cbb26a] hover:bg-[#cbb26a]/20"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pools…"
          className="w-full rounded-md border border-slate-700 bg-black/40 py-1.5 pl-7 pr-2 font-mono text-[11px] outline-none focus:border-[#cbb26a]/50"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
        <ul className="min-h-0 space-y-1 overflow-y-auto rounded-md border border-slate-800 bg-black/20 p-1">
          {filtered.length === 0 && (
            <li className="p-3 text-center font-mono text-[10px] text-slate-500">
              {loading ? 'Loading…' : 'No loot pools yet — create one.'}
            </li>
          )}
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                  selectedId === t.id
                    ? 'bg-[#cbb26a]/15 text-[#cbb26a]'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="truncate font-mono text-[11px] font-bold">{t.name}</div>
                <div className="truncate font-mono text-[9px] text-slate-500">
                  {t.entries.length} entries · {t.rollsPerDrop} roll(s)
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="min-h-0 space-y-2 overflow-y-auto rounded-md border border-slate-800 bg-black/20 p-2">
          {!selected ? (
            <p className="p-4 text-center font-mono text-[10px] text-slate-500">
              Select a pool to edit, simulate, or export.
            </p>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Name</span>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1 font-mono text-[11px]"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  Rolls per drop
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={draftRolls}
                  onChange={(e) => setDraftRolls(Number(e.target.value) || 1)}
                  className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1 font-mono text-[11px]"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  Weighted entries (JSON)
                </span>
                <textarea
                  rows={5}
                  value={draftEntriesJson}
                  onChange={(e) => setDraftEntriesJson(e.target.value)}
                  className="w-full resize-y rounded-md border border-slate-700 bg-black/40 px-2 py-1 font-mono text-[10px]"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  Guaranteed drops (JSON)
                </span>
                <textarea
                  rows={3}
                  value={draftGuaranteedJson}
                  onChange={(e) => setDraftGuaranteedJson(e.target.value)}
                  className="w-full resize-y rounded-md border border-slate-700 bg-black/40 px-2 py-1 font-mono text-[10px]"
                />
              </label>

              <div className="flex flex-wrap gap-1 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void savePool()}
                  className="rounded-md border border-[#806f47]/50 bg-[#cbb26a]/15 px-2 py-1 font-mono text-[10px] font-bold uppercase text-[#cbb26a]"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void clonePool()}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 font-mono text-[10px] uppercase text-slate-300"
                >
                  <Copy className="h-3 w-3" /> Clone
                </button>
                <button
                  type="button"
                  onClick={exportJson}
                  className="rounded-md border border-slate-700 px-2 py-1 font-mono text-[10px] uppercase text-slate-300"
                >
                  Export
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void deletePool()}
                  className="inline-flex items-center gap-1 rounded-md border border-red-900/50 px-2 py-1 font-mono text-[10px] uppercase text-red-400"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>

              <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#cbb26a]" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Simulate
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={simCount}
                    onChange={(e) => setSimCount(Number(e.target.value) || 100)}
                    className="ml-auto w-20 rounded-md border border-slate-700 bg-black/40 px-2 py-0.5 font-mono text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={runSimulate}
                    className="rounded-md border border-[#806f47]/40 px-2 py-0.5 font-mono text-[10px] uppercase text-[#cbb26a]"
                  >
                    Run
                  </button>
                </div>
                {simStats && (
                  <ul className="max-h-32 space-y-1 overflow-y-auto font-mono text-[10px]">
                    {Object.entries(simStats)
                      .sort((a, b) => b[1].rate - a[1].rate)
                      .map(([itemId, s]) => (
                        <li key={itemId} className="flex justify-between gap-2 text-slate-300">
                          <span>{itemId}</span>
                          <span className="text-slate-500">
                            {(s.rate * 100).toFixed(1)}% · avg qty{' '}
                            {(s.totalQty / Math.max(1, simCount)).toFixed(2)}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
