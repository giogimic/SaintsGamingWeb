'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../CatalogEditorShell';
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

export const LootManagerPanel: React.FC = () => {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const showToast = useGameStore((s) => s.showToast);

  const [tables, setTables] = useState<ApiLootTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const dataVersion = useEditorStore((s) => s.dataVersion);
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  
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
  }, [load, dataVersion]);

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
      draftEntriesJson !== JSON.stringify(selected.entries, null, 2) ||
      draftGuaranteedJson !== JSON.stringify(selected.guaranteedDrops, null, 2)
    );
  }, [selected, draftName, draftRolls, draftEntriesJson, draftGuaranteedJson]);

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
      const res = await fetch('/api/loot/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGameId,
          name: `New Pool ${tables.length + 1}`,
          description: '',
          entries: [{ itemId: 'wood_log', weight: 100, min: 1, max: 2 }],
          rollsPerDrop: 1,
          guaranteedDrops: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      showToast('Loot pool created');
      incrementDataVersion();
      await load();
      if (data.item?.id) setSelectedId(data.item.id);
    } catch (err) {
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
      if (!res.ok) throw new Error(data.error || 'Update failed');
      showToast('Pool updated');
      incrementDataVersion();
      await load();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm('Delete this loot pool? Refs in maps may break.')) return;
    setSaving(true);
    setValidationError(null);
    try {
      const res = await fetch(`/api/loot/tables/${selected.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Pool deleted');
      setSelectedId(null);
      incrementDataVersion();
      await load();
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (selectedId) {
      const s = tables.find(t => t.id === selectedId);
      if (s) {
        setDraftName(s.name);
        setDraftEntriesJson(JSON.stringify(s.entries, null, 2));
        setDraftGuaranteedJson(JSON.stringify(s.guaranteedDrops, null, 2));
        setDraftRolls(s.rollsPerDrop);
        setSimStats(null);
      }
    }
  };

  const handleSimulate = () => {
    if (!selected) return;
    try {
      const parsedEntries = JSON.parse(draftEntriesJson);
      const parsedGuaranteed = JSON.parse(draftGuaranteedJson);
      const tempPool = toPoolDef({
        ...selected,
        entries: parsedEntries,
        guaranteedDrops: parsedGuaranteed,
        rollsPerDrop: draftRolls,
      });
      const results = [];
      for (let i = 0; i < simCount; i++) {
        results.push(simulateLootPool(tempPool, { rng: () => Math.random() }));
      }
      setSimStats(aggregateDropStats(results));
    } catch (err) {
      setValidationError('Invalid JSON, cannot simulate.');
    }
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

        {/* JSON Editors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Weighted Entries (JSON)
            </label>
            <textarea
              className="w-full h-48 bg-[#111a2a] border border-[#806f47]/40 rounded p-3 font-mono text-xs outline-none focus:border-[#cbb26a] resize-none text-[#e5c07b]"
              value={draftEntriesJson}
              onChange={(e) => setDraftEntriesJson(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Guaranteed Drops (JSON)
            </label>
            <textarea
              className="w-full h-48 bg-[#111a2a] border border-[#806f47]/40 rounded p-3 font-mono text-xs outline-none focus:border-[#cbb26a] resize-none text-[#e5c07b]"
              value={draftGuaranteedJson}
              onChange={(e) => setDraftGuaranteedJson(e.target.value)}
            />
          </div>
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
                onClick={handleSimulate}
                className="bg-[#23354f] hover:bg-[#2d4263] border border-[#405c87] text-white px-3 py-1 rounded transition-colors shadow-sm ml-2 font-bold"
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
                      <td colSpan={4} className="px-3 py-4 text-center text-[#806f47] italic">No items dropped.</td>
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
