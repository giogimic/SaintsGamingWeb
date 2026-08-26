'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listDungeons,
  getDungeon,
  upsertDungeon,
  deleteDungeon,
  type DungeonTemplateInput,
} from '@/app/actions/dungeons';
import type { DungeonTemplate } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';
import { DefinitionRefBadge } from '../components/DefinitionRefBadge';
import { RuleConditionBuilder } from '../components/RuleConditionBuilder';

function dungeonResourceKey(form: DungeonTemplateInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'dungeon:new';
  return `dungeon:${form.slug}`;
}

export const DungeonEditorPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [dungeons, setDungeons] = useState<DungeonTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<DungeonTemplateInput>({
    slug: '',
    name: '',
    description: '',
    entryLevelReq: 1,
    maxPartySize: 4,
    rewardLootPoolId: '',
    mapReferences: '[]',
    clearConditions: '{}',
  });

  const resourceKey = dungeonResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<DungeonTemplateInput>(resourceKey);

  syncFormRef(formData);

  const originalDungeon = useMemo(() => dungeons.find(d => d.slug === activeSlug), [dungeons, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalDungeon) return false;
    return (
      formData.name !== originalDungeon.name ||
      formData.description !== (originalDungeon.description || '') ||
      formData.entryLevelReq !== originalDungeon.entryLevelReq ||
      formData.maxPartySize !== originalDungeon.maxPartySize ||
      formData.rewardLootPoolId !== (originalDungeon.rewardLootPoolId || '') ||
      formData.mapReferences !== originalDungeon.mapReferences ||
      formData.clearConditions !== originalDungeon.clearConditions
    );
  }, [formData, originalDungeon, activeSlug]);

  const loadList = async () => {
    setLoading(true);
    const res = await listDungeons();
    if (res.success && res.data) {
      setDungeons(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, [dataVersion]);

  const handleSelect = async (slug: string) => {
    if (isDirty && activeSlug && !confirm("Discard unsaved changes?")) return;

    setActiveSlug(slug);
    setValidationError(null);
    const res = await getDungeon(slug);
    if (res.success && res.data) {
      setFormData({
        slug: res.data.slug,
        name: res.data.name,
        description: res.data.description || '',
        entryLevelReq: res.data.entryLevelReq,
        maxPartySize: res.data.maxPartySize,
        rewardLootPoolId: res.data.rewardLootPoolId || '',
        mapReferences: res.data.mapReferences,
        clearConditions: res.data.clearConditions,
      });
    }
  };

  const handleCreateNew = () => {
    if (isDirty && activeSlug && !confirm("Discard unsaved changes?")) return;
    setActiveSlug(null);
    setValidationError(null);
    setFormData({
      slug: '',
      name: '',
      description: '',
      entryLevelReq: 1,
      maxPartySize: 4,
      rewardLootPoolId: '',
      mapReferences: '[]',
      clearConditions: '{}',
    });
  };

  const handleSave = async () => {
    if (!formData.slug.trim() || !formData.name.trim()) {
      setValidationError("Slug and Name are required.");
      return;
    }
    setSaving(true);
    setValidationError(null);
    const res = await upsertDungeon(formData);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      incrementDataVersion();
      await loadList();
    } else {
      setValidationError(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleRevert = () => {
    if (activeSlug) {
      handleSelect(activeSlug);
    }
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (!confirm('Are you sure you want to delete this dungeon template?')) return;
    setSaving(true);
    const res = await deleteDungeon(activeSlug);
    if (res.success) {
      incrementDataVersion();
      setActiveSlug(null);
      handleCreateNew();
      await loadList();
    } else {
      setValidationError(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleUndo = () => applyHistory('undo', setFormData);
  const handleRedo = () => applyHistory('redo', setFormData);

  const filteredDungeons = dungeons.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CatalogEditorShell<DungeonTemplate>
      title="Dungeon Studio"
      items={filteredDungeons}
      activeId={activeSlug}
      getItemId={(it) => it.slug}
      getItemName={(it) => it.name}
      isDirty={(it) => it.slug === activeSlug ? isDirty : false}
      search={search}
      onSearchChange={setSearch}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
      onSave={handleSave}
      onRevert={handleRevert}
      onDelete={handleDelete}
      onUndoDefinition={handleUndo}
      onRedoDefinition={handleRedo}
      canUndoDefinition={canUndoDefinition}
      canRedoDefinition={canRedoDefinition}
      saving={saving}
      validationError={validationError}
    >
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">Dungeon Blueprint</span>
          <DefinitionRefBadge type="dungeon" slug={activeSlug || formData.slug} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Slug (ID)</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.slug}
              disabled={!!activeSlug}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. copper_mines"
            />
          </div>
          <div>
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Name</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.name}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Description</label>
          <textarea
            className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 min-h-[80px]"
            value={formData.description || ''}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Entry Level</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.entryLevelReq}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, entryLevelReq: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Max Party Size</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.maxPartySize}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, maxPartySize: parseInt(e.target.value) || 4 })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Reward Loot Pool</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.rewardLootPoolId || ''}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, rewardLootPoolId: e.target.value })}
              placeholder="e.g. boss_copper"
            />
          </div>
        </div>
        
        <div>
          <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Map References (JSON Array of Map IDs)</label>
          <textarea
            className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-2 outline-none focus:border-[#cbb26a] text-[#e2d5b3] font-mono text-sm mt-1 min-h-[100px]"
            value={formData.mapReferences}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onChange={(e) => setFormData({ ...formData, mapReferences: e.target.value })}
            placeholder={'["copper_mines_f1", "copper_mines_boss"]'}
          />
        </div>
        
        <div>
          <RuleConditionBuilder
            label="Clear / Completion Conditions"
            value={formData.clearConditions}
            onChange={(_cond, jsonStr) => setFormData({ ...formData, clearConditions: jsonStr })}
          />
        </div>

      </div>
    </CatalogEditorShell>
  );
};
