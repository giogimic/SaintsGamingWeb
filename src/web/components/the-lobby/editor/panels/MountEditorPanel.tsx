'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listMounts,
  getMount,
  upsertMount,
  deleteMount,
  type MountTemplateInput,
} from '@/app/actions/mounts';
import type { MountTemplate } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';
import { DefinitionRefBadge } from '../components/DefinitionRefBadge';
import { RuleConditionBuilder } from '../components/RuleConditionBuilder';
import { AssetRefPicker } from '../components/AssetRefPicker';

function mountResourceKey(form: MountTemplateInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'mount:new';
  return `mount:${form.slug}`;
}

const EMPTY_FORM: MountTemplateInput = {
  slug: '',
  name: '',
  description: '',
  speedMultiplier: 1.5,
  canFly: false,
  canSwim: false,
  acquisitionData: '{}',
  restrictionsData: '{}',
  visualData: '{}',
  collectionCategory: 'mount',
};

export const MountEditorPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [mounts, setMounts] = useState<MountTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<MountTemplateInput>({ ...EMPTY_FORM });

  const resourceKey = mountResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<MountTemplateInput>(resourceKey);

  syncFormRef(formData);

  const originalMount = useMemo(() => mounts.find(m => m.slug === activeSlug), [mounts, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalMount) return false;
    return (
      formData.name !== originalMount.name ||
      formData.description !== (originalMount.description || '') ||
      formData.speedMultiplier !== originalMount.speedMultiplier ||
      formData.canFly !== originalMount.canFly ||
      formData.canSwim !== originalMount.canSwim ||
      formData.acquisitionData !== originalMount.acquisitionData ||
      formData.restrictionsData !== originalMount.restrictionsData ||
      formData.visualData !== originalMount.visualData ||
      formData.collectionCategory !== originalMount.collectionCategory
    );
  }, [formData, originalMount, activeSlug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listMounts(search).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setMounts(res.data);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [search, dataVersion]);

  const handleSelect = async (slug: string) => {
    setLoading(true);
    const res = await getMount(slug);
    setLoading(false);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      setFormData({
        slug: res.data.slug,
        name: res.data.name,
        description: res.data.description || '',
        speedMultiplier: res.data.speedMultiplier,
        canFly: res.data.canFly,
        canSwim: res.data.canSwim,
        acquisitionData: res.data.acquisitionData || '{}',
        restrictionsData: res.data.restrictionsData || '{}',
        visualData: res.data.visualData || '{}',
        collectionCategory: res.data.collectionCategory || 'mount',
      });
      setValidationError(null);
    } else {
      setValidationError(res.error || 'Failed to load mount');
    }
  };

  const handleCreateNew = () => {
    setActiveSlug(null);
    setFormData({ ...EMPTY_FORM });
    setValidationError(null);
  };

  const handleRevert = () => {
    if (activeSlug) {
      handleSelect(activeSlug);
    }
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (!confirm(`Delete mount ${activeSlug}?`)) return;
    setLoading(true);
    const res = await deleteMount(activeSlug);
    setLoading(false);
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

    const input: MountTemplateInput = {
      ...formData,
      slug: formData.slug.trim().toLowerCase(),
    };

    const res = await upsertMount(input);
    setSaving(false);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      incrementDataVersion();
    } else {
      setValidationError(res.error || 'Failed to save mount.');
    }
  };

  const handleChange = (field: keyof MountTemplateInput, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredMounts = mounts.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CatalogEditorShell<MountTemplate>
      title="Mount Studio"
      search={search}
      onSearchChange={setSearch}
      items={filteredMounts}
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
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">Mount Definitions</span>
          <DefinitionRefBadge type="mount" slug={activeSlug || formData.slug} />
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
              placeholder="e.g. swift_stallion"
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
              placeholder="e.g. Swift Stallion"
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

        {/* ── Movement & Capabilities ────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Speed Multiplier
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={formData.speedMultiplier}
              onChange={(e) => handleChange('speedMultiplier', parseFloat(e.target.value) || 1.0)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50/50 px-2 py-1.5 font-mono text-slate-200 border border-[#806f47]/20"
            />
            <span className="text-[10px] text-slate-500 font-normal">1.0 = walk speed, 1.5 = default mount</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 mt-3">
            <input
              type="checkbox"
              checked={formData.canFly}
              onChange={(e) => handleChange('canFly', e.target.checked)}
              className="accent-amber-500"
            />
            Can Fly
          </label>
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 mt-3">
            <input
              type="checkbox"
              checked={formData.canSwim}
              onChange={(e) => handleChange('canSwim', e.target.checked)}
              className="accent-cyan-500"
            />
            Can Swim
          </label>
        </div>

        {/* ── Collection ─────────────────────────── */}
        <label className="flex flex-col gap-1 mb-4 text-[11px] font-bold text-slate-400">
          Collection Category
          <input
            type="text"
            value={formData.collectionCategory}
            onChange={(e) => handleChange('collectionCategory', e.target.value)}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            className="rounded bg-black/50/50 px-2 py-1.5 font-mono text-slate-200 border border-[#806f47]/20"
            placeholder="mount"
          />
          <span className="text-[10px] text-slate-500 font-normal">Category for the player&apos;s collection log (e.g. mount, flying_mount).</span>
        </label>

        {/* ── JSON Data Fields ───────────────────── */}
        <div className="grid grid-cols-1 gap-4 flex-1">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Acquisition Data (JSON)
            <textarea
              value={formData.acquisitionData}
              onChange={(e) => handleChange('acquisitionData', e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50/50 px-2 py-2 font-mono text-slate-200 border border-[#806f47]/20 min-h-[80px] resize-none"
              placeholder={'{ "method": "quest", "sourceId": "mount_quest_01" }'}
            />
            <span className="text-[10px] text-slate-500 font-normal">How to acquire: method (quest, shop, drop, craft) + sourceId.</span>
          </label>

          <div>
            <RuleConditionBuilder
              label="Mount Usage Restrictions / Requirements"
              value={formData.restrictionsData}
              onChange={(_cond, jsonStr) => handleChange('restrictionsData', jsonStr)}
            />
          </div>

          <div className="rounded border border-[#806f47]/20 bg-[#0a1120] p-3 space-y-2">
            <span className="font-bold text-slate-300 text-xs">Visual Representation</span>
            <AssetRefPicker
              label="Mount Sprite / Creature Asset"
              assetType="CREATURE"
              value={(() => {
                try {
                  const parsed = JSON.parse(formData.visualData);
                  return parsed.spriteAssetId || '';
                } catch {
                  return '';
                }
              })()}
              onChange={(assetId, asset) => {
                try {
                  const current = JSON.parse(formData.visualData || '{}');
                  current.spriteAssetId = assetId || '';
                  if (asset) {
                    current.assetName = asset.name;
                    current.thumbnailPath = asset.thumbnailPath || asset.cdnUrl;
                  }
                  handleChange('visualData', JSON.stringify(current, null, 2));
                } catch {
                  handleChange('visualData', JSON.stringify({ spriteAssetId: assetId || '' }, null, 2));
                }
              }}
            />
            <label className="flex flex-col gap-1 text-[10px] text-slate-400 mt-2">
              Raw Visual Configuration (JSON)
              <textarea
                value={formData.visualData}
                onChange={(e) => handleChange('visualData', e.target.value)}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                className="rounded bg-black/50/50 px-2 py-1.5 font-mono text-slate-200 border border-[#806f47]/20 min-h-[60px] text-[10px]"
                placeholder={'{ "spriteAssetId": "horse_01", "ridingAnimation": "riding_horse", "scale": 1.0 }'}
              />
            </label>
          </div>
        </div>
      </div>
    </CatalogEditorShell>
  );
};
