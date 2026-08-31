'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Plus, Trash2, ExternalLink, Package } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useGameStore } from '../../store';
import {
  aggregateDropStats,
  type LootDropEntry,
  type LootPoolDef,
  simulateLootPool,
} from '@/shared/game/lootRefs';
import { listItemTemplates, type ItemTemplateInput } from '@/app/actions/item-templates';
import { useLootTables } from '@/web/hooks/studio-data';

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

function toPoolDef(row: ApiLootTable, draftEntries: LootDropEntry[], draftGuaranteed: LootDropEntry[], rolls: number): LootPoolDef {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    rollsPerDrop: rolls,
    entries: draftEntries,
    guaranteedDrops: draftGuaranteed,
    minLevel: row.minLevel ?? undefined,
    maxLevel: row.maxLevel ?? undefined,
    requiredTags: row.requiredTags,
  };
}

export const LootManagerPanel: React.FC = () => {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const showToast = useGameStore((s) => s.showToast);

  const { lootTables: tables, isLoading: loading, mutateLootTables } = useLootTables(activeGameId);
  
  const [itemsList, setItemsList] = useState<Array<{ slug: string; name: string }>>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const dataVersion = useEditorStore((s) => s.dataVersion);
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);

  const [simCount, setSimCount] = useState(100);
  const [simStats, setSimStats] = useState<Record<string, { count: number; totalQty: number; rate: number }> | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEntries, setDraftEntries] = useState<LootDropEntry[]>([]);
  const [draftGuaranteed, setDraftGuaranteed] = useState<LootDropEntry[]>([]);
  const [draftRolls, setDraftRolls] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await listItemTemplates();
      if (res.success && res.data) {
        setItemsList(res.data.map((i) => ({ slug: i.slug, name: i.name })));
      }
    })();
  }, [dataVersion]);

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

  const isDirty = useMemo(() => {
    if (!selected) return true;
    return (
      draftName !== selected.name ||
      draftRolls !== selected.rollsPerDrop ||
      JSON.stringify(draftEntries) !== JSON.stringify(selected.entries) ||
      JSON.stringify(draftGuaranteed) !== JSON.stringify(selected.guaranteedDrops)
    );
  }, [selected, draftName, draftRolls, draftEntries, draftGuaranteed]);

  useEffect(() => {
    if (!selected) {
      setDraftName('');
      setDraftEntries([]);
      setDraftGuaranteed([]);
      setDraftRolls(1);
      setSimStats(null);
      return;
    }
    setDraftName(selected.name);
    setDraftEntries(Array.isArray(selected.entries) ? [...selected.entries] : []);
    setDraftGuaranteed(Array.isArray(selected.guaranteedDrops) ? [...selected.guaranteedDrops] : []);
    setDraftRolls(selected.rollsPerDrop || 1);
    setSimStats(null);
  }, [selected]);

  const handleSelect = (id: string) => {
    if (isDirty && selectedId) {
      if (!confirm('You have unsaved changes. Discard?')) return;
    }
    setSelectedId(id);
    setValidationError(null);
  };

  const handleCreateNew = async () => {
    if (isDirty && selectedId) {
      if (!confirm('You have unsaved changes. Discard?')) return;
    }
    setSaving(true);
    setValidationError(null);
    try {
      const defaultItemId = itemsList[0]?.slug || 'wood_log';
      const tempId = `temp_${Date.now()}`;
      const newPool = {
        id: tempId,
        gameId: activeGameId,
        name: `New Pool ${tables.length + 1}`,
        description: '',
        entries: [{ itemId: defaultItemId, weight: 100, min: 1, max: 2 }],
        rollsPerDrop: 1,
        guaranteedDrops: [],
        requiredTags: [],
      };
      
      // Optimistic update
      mutateLootTables([...tables, newPool as ApiLootTable], false);
      setSelectedId(tempId);
      
      const res = await fetch('/api/loot/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGameId,
          name: newPool.name,
          description: newPool.description,
          entries: newPool.entries,
          rollsPerDrop: newPool.rollsPerDrop,
          guaranteedDrops: newPool.guaranteedDrops,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      showToast('Loot pool created');
      incrementDataVersion();
      if (data.item?.id) {
        setSelectedId(data.item.id);
      }
      mutateLootTables(); // Revalidate with server truth
    } catch (err) {
      mutateLootTables(); // Rollback
      setValidationError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setValidationError(null);
    try {
      // Optimistic update
      const updatedTable = {
        ...selected,
        name: draftName,
        entries: draftEntries,
        guaranteedDrops: draftGuaranteed,
        rollsPerDrop: draftRolls,
      };
      mutateLootTables(tables.map(t => t.id === selected.id ? updatedTable : t), false);
      
      const res = await fetch(`/api/loot/tables/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draftName,
          entries: draftEntries,
          guaranteedDrops: draftGuaranteed,
          rollsPerDrop: draftRolls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      showToast('Pool updated');
      incrementDataVersion();
      mutateLootTables(); // Revalidate
    } catch (err) {
      mutateLootTables(); // Rollback
      setValidationError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm('Are you sure you want to delete this pool?')) return;
    setSaving(true);
    try {
      // Optimistic update
      mutateLootTables(tables.filter(t => t.id !== selected.id), false);
      setSelectedId(null);
      
      const res = await fetch(`/api/loot/tables/${selected.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      showToast('Pool deleted');
      incrementDataVersion();
      mutateLootTables(); // Revalidate
    } catch (err) {
      mutateLootTables(); // Rollback
      setValidationError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (selectedId) {
      const s = tables.find((t) => t.id === selectedId);
      if (s) {
        setDraftName(s.name);
        setDraftEntries(Array.isArray(s.entries) ? [...s.entries] : []);
        setDraftGuaranteed(Array.isArray(s.guaranteedDrops) ? [...s.guaranteedDrops] : []);
        setDraftRolls(s.rollsPerDrop || 1);
        setSimStats(null);
      }
    }
  };

  const handleSimulate = () => {
    if (!selected) return;
    try {
      const tempPool = toPoolDef(selected, draftEntries, draftGuaranteed, draftRolls);
      const results = [];
      for (let i = 0; i < simCount; i++) {
        results.push(simulateLootPool(tempPool, { rng: () => Math.random() }));
      }
      setSimStats(aggregateDropStats(results));
    } catch {
      setValidationError('Failed to simulate loot table.');
    }
  };

  // Jump to item editor (B5)
  const handleOpenItem = (itemSlug: string) => {
    if (!itemSlug) return;
    useEditorStore.getState().openPanel('items');
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('studio_focus_item', {
          detail: { itemSlug },
        })
      );
    }, 50);
    showToast(`Opening Item Editor for ${itemSlug}`);
  };

  // Entry row helpers (C4)
  const totalWeight = useMemo(() => {
    return draftEntries.reduce((acc, e) => acc + (Number(e.weight) || 0), 0);
  }, [draftEntries]);

  const addEntry = () => {
    const defaultSlug = itemsList[0]?.slug || 'wood_log';
    setDraftEntries([...draftEntries, { itemId: defaultSlug, weight: 100, min: 1, max: 1 }]);
  };

  const updateEntry = (idx: number, patch: Partial<LootDropEntry>) => {
    const next = [...draftEntries];
    if (next[idx]) {
      next[idx] = { ...next[idx], ...patch };
      setDraftEntries(next);
    }
  };

  const removeEntry = (idx: number) => {
    setDraftEntries(draftEntries.filter((_, i) => i !== idx));
  };

  const addGuaranteed = () => {
    const defaultSlug = itemsList[0]?.slug || 'wood_log';
    setDraftGuaranteed([...draftGuaranteed, { itemId: defaultSlug, weight: 100, min: 1, max: 1 }]);
  };

  const updateGuaranteed = (idx: number, patch: Partial<LootDropEntry>) => {
    const next = [...draftGuaranteed];
    if (next[idx]) {
      next[idx] = { ...next[idx], ...patch };
      setDraftGuaranteed(next);
    }
  };

  const removeGuaranteed = (idx: number) => {
    setDraftGuaranteed(draftGuaranteed.filter((_, i) => i !== idx));
  };

  return (
    <CatalogEditorShell<ApiLootTable>
      title="Loot Pools"
      items={filtered}
      activeId={selectedId}
      getItemId={(t) => t.id}
      getItemName={(t) => t.name}
      isDirty={(t) => (t.id === selectedId ? isDirty : false)}
      search={query}
      onSearchChange={setQuery}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
      onSave={handleSave}
      onRevert={handleRevert}
      onDelete={handleDelete}
      saving={saving}
      validationError={validationError}
    >
      <div className="space-y-4">
        {/* Basic Fields */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Pool Name
            </label>
            <input
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </div>
          <div className="w-24">
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Rolls
            </label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
              value={draftRolls}
              onChange={(e) => setDraftRolls(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Pool ID (Read Only)
            </label>
            <input
              className="w-full bg-[#050b14] border border-[#806f47]/20 rounded px-3 py-1.5 font-mono text-[#a59981]"
              value={selected?.id || ''}
              readOnly
            />
          </div>
        </div>

        {/* Visual Table Editor: Weighted Drops (Phase 8 Track C4 & B5) */}
        <div className="bg-[#0b1320] border border-[#806f47]/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#cbb26a] uppercase tracking-wide">
                Weighted Drop Entries
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({draftEntries.length} items · Total Weight: {totalWeight})
              </span>
            </div>
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded cursor-pointer font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Add Drop Entry</span>
            </button>
          </div>

          {draftEntries.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic py-2">No weighted entries in this pool.</p>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-slate-500 uppercase tracking-wider px-2">
                <div className="col-span-5">Item Template</div>
                <div className="col-span-2 text-center">Min Qty</div>
                <div className="col-span-2 text-center">Max Qty</div>
                <div className="col-span-2 text-center">Weight (%)</div>
                <div className="col-span-1 text-center">Actions</div>
              </div>

              {draftEntries.map((entry, idx) => {
                const pct = totalWeight > 0 ? (((Number(entry.weight) || 0) / totalWeight) * 100).toFixed(1) : '0.0';
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-[#050b14] border border-[#806f47]/20 rounded p-1.5 text-[11px]">
                    <div className="col-span-5 flex items-center gap-1.5">
                      {itemsList.length > 0 ? (
                        <select
                          value={entry.itemId}
                          onChange={(e) => updateEntry(idx, { itemId: e.target.value })}
                          className="flex-1 bg-[#111a2a] border border-[#806f47]/30 rounded px-2 py-1 text-[10px] text-amber-300 font-mono outline-none cursor-pointer"
                        >
                          {itemsList.map((item) => (
                            <option key={item.slug} value={item.slug}>
                              {item.name} ({item.slug})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={entry.itemId}
                          onChange={(e) => updateEntry(idx, { itemId: e.target.value })}
                          placeholder="item_slug"
                          className="flex-1 bg-[#111a2a] border border-[#806f47]/30 rounded px-2 py-1 text-[10px] text-slate-200 outline-none font-mono"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenItem(entry.itemId)}
                        className="p-1 text-sky-400 hover:bg-sky-950/40 rounded transition-colors cursor-pointer shrink-0"
                        title="Jump to Item in Item Editor (B5)"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={entry.min}
                        onChange={(e) => updateEntry(idx, { min: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full text-center bg-[#111a2a] border border-[#806f47]/30 rounded px-1 py-1 text-[10px] text-slate-200 outline-none"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={entry.max}
                        onChange={(e) => updateEntry(idx, { max: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full text-center bg-[#111a2a] border border-[#806f47]/30 rounded px-1 py-1 text-[10px] text-slate-200 outline-none"
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={entry.weight}
                        onChange={(e) => updateEntry(idx, { weight: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full text-center bg-[#111a2a] border border-[#806f47]/30 rounded px-1 py-1 text-[10px] text-amber-400 font-bold outline-none"
                      />
                      <span className="text-[9px] text-slate-500 shrink-0 font-mono">{pct}%</span>
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeEntry(idx)}
                        className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                        title="Remove entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual Table Editor: Guaranteed Drops */}
        <div className="bg-[#0b1320] border border-[#806f47]/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#cbb26a] uppercase tracking-wide">
                Guaranteed Drops
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({draftGuaranteed.length} items · 100% Drop Chance)
              </span>
            </div>
            <button
              type="button"
              onClick={addGuaranteed}
              className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded cursor-pointer font-bold"
            >
              <Plus className="w-3 h-3" />
              <span>Add Guaranteed Drop</span>
            </button>
          </div>

          {draftGuaranteed.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic py-2">No guaranteed drops in this pool.</p>
          ) : (
            <div className="space-y-1.5">
              <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-slate-500 uppercase tracking-wider px-2">
                <div className="col-span-6">Item Template</div>
                <div className="col-span-2 text-center">Min Qty</div>
                <div className="col-span-2 text-center">Max Qty</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>

              {draftGuaranteed.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-[#050b14] border border-[#806f47]/20 rounded p-1.5 text-[11px]">
                  <div className="col-span-6 flex items-center gap-1.5">
                    {itemsList.length > 0 ? (
                      <select
                        value={entry.itemId}
                        onChange={(e) => updateGuaranteed(idx, { itemId: e.target.value })}
                        className="flex-1 bg-[#111a2a] border border-[#806f47]/30 rounded px-2 py-1 text-[10px] text-amber-300 font-mono outline-none cursor-pointer"
                      >
                        {itemsList.map((item) => (
                          <option key={item.slug} value={item.slug}>
                            {item.name} ({item.slug})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={entry.itemId}
                        onChange={(e) => updateGuaranteed(idx, { itemId: e.target.value })}
                        placeholder="item_slug"
                        className="flex-1 bg-[#111a2a] border border-[#806f47]/30 rounded px-2 py-1 text-[10px] text-slate-200 outline-none font-mono"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenItem(entry.itemId)}
                      className="p-1 text-sky-400 hover:bg-sky-950/40 rounded transition-colors cursor-pointer shrink-0"
                      title="Jump to Item in Item Editor (B5)"
                    >
                      <Package className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={entry.min}
                      onChange={(e) => updateGuaranteed(idx, { min: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full text-center bg-[#111a2a] border border-[#806f47]/30 rounded px-1 py-1 text-[10px] text-slate-200 outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={entry.max}
                      onChange={(e) => updateGuaranteed(idx, { max: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full text-center bg-[#111a2a] border border-[#806f47]/30 rounded px-1 py-1 text-[10px] text-slate-200 outline-none"
                    />
                  </div>

                  <div className="col-span-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeGuaranteed(idx)}
                      className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                      title="Remove guaranteed drop"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simulator */}
        <div className="bg-[#050b14] border border-[#806f47]/30 rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#cbb26a] font-bold text-[12px] uppercase tracking-wide">
              <Sparkles className="w-4 h-4" />
              <span>Simulate Drops</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-[#806f47] uppercase">Sim Count:</label>
              <select
                className="bg-[#111a2a] border border-[#806f47]/40 rounded px-2 py-1 outline-none text-[#e2d5b3]"
                value={simCount}
                onChange={(e) => setSimCount(parseInt(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={100}>100</option>
                <option value={1000}>1000</option>
                <option value={10000}>10000</option>
              </select>
              <button
                type="button"
                onClick={handleSimulate}
                className="bg-[#23354f] hover:bg-[#2d4263] border border-[#405c87] text-white px-3 py-1 rounded transition-colors shadow-sm ml-2 font-bold cursor-pointer"
              >
                Run
              </button>
            </div>
          </div>

          {simStats ? (
            <div className="bg-[#111a2a] rounded border border-[#806f47]/20 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b1320] text-[#a59981] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 border-b border-[#806f47]/20">Item ID</th>
                    <th className="px-3 py-2 text-right border-b border-[#806f47]/20">Drop Rate</th>
                    <th className="px-3 py-2 text-right border-b border-[#806f47]/20">Total Qty</th>
                    <th className="px-3 py-2 text-right border-b border-[#806f47]/20">Avg / Drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#806f47]/20">
                  {Object.entries(simStats).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-[#806f47] italic">
                        No items dropped.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(simStats)
                      .sort((a, b) => b[1].rate - a[1].rate)
                      .map(([itemId, stat]) => (
                        <tr key={itemId} className="hover:bg-[#806f47]/10 transition-colors">
                          <td className="px-3 py-2 text-[#cbb26a] font-mono">{itemId}</td>
                          <td className="px-3 py-2 text-right">{(stat.rate * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right">{stat.totalQty}</td>
                          <td className="px-3 py-2 text-right text-[#a59981]">
                            {(stat.totalQty / simCount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-[#806f47] italic text-xs">
              Click Run to simulate loot rolls with current draft settings.
            </div>
          )}
        </div>
      </div>
    </CatalogEditorShell>
  );
};
