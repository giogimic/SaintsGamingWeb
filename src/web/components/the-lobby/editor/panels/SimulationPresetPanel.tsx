'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listSimulationPresets,
  getSimulationPreset,
  upsertSimulationPreset,
  deleteSimulationPreset,
  type SimulationPresetInput,
} from '@/app/actions/studio/simulation-presets';
import type { SimulationPreset } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';

function simResourceKey(form: SimulationPresetInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'simulation:new';
  return `simulation:${form.slug}`;
}

const EMPTY_FORM: SimulationPresetInput = {
  slug: '',
  name: '',
  description: '',
  isActive: false,
  xpMultiplier: 1.0,
  dropMultiplier: 1.0,
  goldMultiplier: 1.0,
};

export const SimulationPresetPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [presets, setPresets] = useState<SimulationPreset[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<SimulationPresetInput>({ ...EMPTY_FORM });

  const resourceKey = simResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<SimulationPresetInput>(resourceKey);

  syncFormRef(formData);

  const originalPreset = useMemo(() => presets.find(p => p.slug === activeSlug), [presets, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalPreset) return false;
    return (
      formData.name !== originalPreset.name ||
      formData.description !== (originalPreset.description || '') ||
      formData.isActive !== originalPreset.isActive ||
      formData.xpMultiplier !== originalPreset.xpMultiplier ||
      formData.dropMultiplier !== originalPreset.dropMultiplier ||
      formData.goldMultiplier !== originalPreset.goldMultiplier
    );
  }, [formData, originalPreset, activeSlug]);

  useEffect(() => {
    let active = true;
    listSimulationPresets(search).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setPresets(res.data);
      }
    });
    return () => { active = false; };
  }, [search, dataVersion]);

  const handleSelect = async (slug: string) => {
    const res = await getSimulationPreset(slug);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      setFormData({
        slug: res.data.slug,
        name: res.data.name,
        description: res.data.description || '',
        isActive: res.data.isActive,
        xpMultiplier: res.data.xpMultiplier,
        dropMultiplier: res.data.dropMultiplier,
        goldMultiplier: res.data.goldMultiplier,
      });
      setValidationError(null);
    } else {
      setValidationError(res.error || 'Failed to load preset');
    }
  };

  const handleCreateNew = () => {
    setActiveSlug(null);
    setFormData({ ...EMPTY_FORM });
    setValidationError(null);
  };

  const handleRevert = () => {
    if (activeSlug) handleSelect(activeSlug);
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (!confirm(`Delete simulation preset ${activeSlug}?`)) return;
    const res = await deleteSimulationPreset(activeSlug);
    if (res.success) {
      handleCreateNew();
      incrementDataVersion();
    } else {
      setValidationError(res.error || 'Failed to delete');
    }
  };

  const handleSave = async () => {
    if (!formData.slug.trim()) {
      setValidationError('Slug is required.');
      return;
    }
    setSaving(true);
    setValidationError(null);

    const res = await upsertSimulationPreset({
      ...formData,
      slug: formData.slug.trim().toLowerCase(),
    });
    setSaving(false);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      incrementDataVersion();
    } else {
      setValidationError(res.error || 'Failed to save preset.');
    }
  };

  const handleChange = (field: keyof SimulationPresetInput, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredPresets = presets.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CatalogEditorShell<SimulationPreset>
      title="Simulation Presets"
      search={search}
      onSearchChange={setSearch}
      items={filteredPresets}
      activeId={activeSlug}
      getItemId={(it) => it.slug}
      getItemName={(it) => it.name}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
      onSave={handleSave}
      onRevert={handleRevert}
      onDelete={handleDelete}
      saving={saving}
      isDirty={(it) => it.slug === activeSlug ? isDirty : false}
      validationError={validationError}
      canUndoDefinition={canUndoDefinition}
      canRedoDefinition={canRedoDefinition}
      onUndoDefinition={() => applyHistory('undo', setFormData)}
      onRedoDefinition={() => applyHistory('redo', setFormData)}
    >
      <div className="flex h-full flex-col p-4 overflow-y-auto">
        <div className="mb-4 text-xs font-mono text-slate-500">
          Simulation Configuration
        </div>

        {/* ── Identity ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Slug (ID)
            <input
              type="text"
              disabled={!!activeSlug}
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              className="rounded bg-black/50/50 px-2 py-1.5 font-mono text-slate-200 border border-[#806f47]/20 disabled:opacity-50"
              placeholder="e.g. hardcore_mode"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Name
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50/50 px-2 py-1.5 font-sans text-slate-200 border border-[#806f47]/20"
              placeholder="e.g. Hardcore Mode"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 mb-4 text-[11px] font-bold text-slate-400">
          Description
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            className="rounded bg-black/50/50 px-2 py-1.5 font-sans text-slate-200 border border-[#806f47]/20 min-h-[60px]"
          />
        </label>

        {/* ── Active Toggle ───────────────────────── */}
        <label className="flex items-center gap-2 mb-6 text-[11px] font-bold text-slate-400">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
            className="accent-emerald-500"
          />
          Set as Active Preset
          <span className="text-[10px] text-slate-500 font-normal ml-2">Only one preset should be active at a time.</span>
        </label>

        {/* ── Multipliers ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-6 mb-4">
          <label className="flex flex-col gap-2 text-[11px] font-bold text-slate-400">
            <div className="flex justify-between">
              <span>XP Yield</span>
              <span className="text-amber-300 font-mono">{formData.xpMultiplier}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={formData.xpMultiplier}
              onChange={(e) => handleChange('xpMultiplier', parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-500 font-normal">Globally modifies all experience gained.</span>
          </label>

          <label className="flex flex-col gap-2 text-[11px] font-bold text-slate-400">
            <div className="flex justify-between">
              <span>Drop Rate</span>
              <span className="text-amber-300 font-mono">{formData.dropMultiplier}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.05"
              value={formData.dropMultiplier}
              onChange={(e) => handleChange('dropMultiplier', parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-500 font-normal">Modifies base drop probability for all loot tables.</span>
          </label>

          <label className="flex flex-col gap-2 text-[11px] font-bold text-slate-400">
            <div className="flex justify-between">
              <span>Gold Yield</span>
              <span className="text-amber-300 font-mono">{formData.goldMultiplier}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={formData.goldMultiplier}
              onChange={(e) => handleChange('goldMultiplier', parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="text-[10px] text-slate-500 font-normal">Modifies all gold drops and quest rewards.</span>
          </label>
        </div>
      </div>
    </CatalogEditorShell>
  );
};

export default SimulationPresetPanel;
