'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listProfessionTemplates,
  getProfessionTemplate,
  upsertProfessionTemplate,
  deleteProfessionTemplate,
  type ProfessionTemplateInput,
} from '@/app/actions/professions';
import type { ProfessionTemplate } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';

function professionResourceKey(form: ProfessionTemplateInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'profession:new';
  return `profession:${form.slug}`;
}

export const ProfessionEditorPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [professions, setProfessions] = useState<ProfessionTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfessionTemplateInput>({
    slug: '',
    name: '',
    description: '',
    iconAssetId: '',
    xpCurve: 'exponential',
    maxLevel: 99,
  });

  const resourceKey = professionResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<ProfessionTemplateInput>(resourceKey);

  syncFormRef(formData);

  const originalProfession = useMemo(() => professions.find(p => p.slug === activeSlug), [professions, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalProfession) return false;
    return (
      formData.name !== originalProfession.name ||
      formData.description !== (originalProfession.description || '') ||
      formData.iconAssetId !== (originalProfession.iconAssetId || '') ||
      formData.xpCurve !== originalProfession.xpCurve ||
      formData.maxLevel !== originalProfession.maxLevel
    );
  }, [formData, originalProfession, activeSlug]);

  const loadList = async (q = search) => {
    setLoading(true);
    const res = await listProfessionTemplates(q);
    if (res.success && res.data) setProfessions(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, [search, dataVersion]);

  const handleSelect = async (slug: string) => {
    if (isDirty && activeSlug) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setActiveSlug(slug);
    setValidationError(null);
    const res = await getProfessionTemplate(slug);
    if (res.success && res.data) {
      setFormData({
        slug: res.data.slug,
        name: res.data.name,
        description: res.data.description || '',
        iconAssetId: res.data.iconAssetId || '',
        xpCurve: res.data.xpCurve,
        maxLevel: res.data.maxLevel,
      });
    }
  };

  const handleCreateNew = () => {
    if (isDirty && activeSlug) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setActiveSlug(null);
    setValidationError(null);
    setFormData({
      slug: '',
      name: 'New Profession',
      description: '',
      iconAssetId: '',
      xpCurve: 'exponential',
      maxLevel: 99,
    });
  };

  const handleSave = async () => {
    setValidationError(null);
    if (!formData.slug || !formData.name) {
      setValidationError('Slug and Name are required');
      return;
    }

    setSaving(true);
    const res = await upsertProfessionTemplate(formData);
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
    if (activeSlug) handleSelect(activeSlug);
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (!confirm(`Delete profession ${activeSlug}? This cannot be undone.`)) return;
    const res = await deleteProfessionTemplate(activeSlug);
    if (res.success) {
      setActiveSlug(null);
      incrementDataVersion();
      await loadList();
    } else {
      setValidationError(`Error deleting: ${res.error}`);
    }
  };

  const handleUndo = () => {
    applyHistory('undo', setFormData);
  };

  const handleRedo = () => {
    applyHistory('redo', setFormData);
  };

  return (
    <CatalogEditorShell<ProfessionTemplate>
      title="Profession Studio"
      items={professions}
      activeId={activeSlug}
      getItemId={(it) => it.slug}
      getItemName={(it) => it.slug}
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
        <div className="grid grid-cols-2 gap-4">
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Slug (ID)</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.slug}
              disabled={!!activeSlug}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              placeholder="e.g. woodcutting"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Name</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.name}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Woodcutting"
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

        <div className="grid grid-cols-3 gap-4">
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Max Level</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.maxLevel}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, maxLevel: parseInt(e.target.value) || 99 })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">XP Curve</label>
            <select
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.xpCurve}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => {
                commitStructural({ ...formData, xpCurve: e.target.value });
                setFormData({ ...formData, xpCurve: e.target.value });
              }}
            >
              <option value="exponential">Exponential (Runescape-like)</option>
              <option value="linear">Linear</option>
              <option value="flat">Flat</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Icon Asset ID</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.iconAssetId || ''}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, iconAssetId: e.target.value })}
              placeholder="e.g. icon_axe_01"
            />
          </div>
        </div>
      </div>
    </CatalogEditorShell>
  );
};
