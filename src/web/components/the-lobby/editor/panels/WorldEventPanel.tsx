'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listWorldEvents,
  getWorldEvent,
  upsertWorldEvent,
  deleteWorldEvent,
  type WorldEventInput,
} from '@/app/actions/world-events';
import type { WorldEventTemplate } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';

function eventResourceKey(form: WorldEventInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'worldevent:new';
  return `worldevent:${form.slug}`;
}

const EMPTY_FORM: WorldEventInput = {
  slug: '',
  name: '',
  description: '',
  isActive: false,
  scheduleCron: '',
  durationSeconds: 0,
  mutationsData: '{}',
};

export const WorldEventPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [events, setEvents] = useState<WorldEventTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorldEventInput>({ ...EMPTY_FORM });

  const resourceKey = eventResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<WorldEventInput>(resourceKey);

  syncFormRef(formData);

  const originalEvent = useMemo(() => events.find(e => e.slug === activeSlug), [events, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalEvent) return false;
    return (
      formData.name !== originalEvent.name ||
      formData.description !== (originalEvent.description || '') ||
      formData.isActive !== originalEvent.isActive ||
      formData.scheduleCron !== (originalEvent.scheduleCron || '') ||
      formData.durationSeconds !== (originalEvent.durationSeconds || 0) ||
      formData.mutationsData !== originalEvent.mutationsData
    );
  }, [formData, originalEvent, activeSlug]);

  useEffect(() => {
    let active = true;
    listWorldEvents(search).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setEvents(res.data);
      }
    });
    return () => { active = false; };
  }, [search, dataVersion]);

  const handleSelect = async (slug: string) => {
    const res = await getWorldEvent(slug);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      setFormData({
        slug: res.data.slug,
        name: res.data.name,
        description: res.data.description || '',
        isActive: res.data.isActive,
        scheduleCron: res.data.scheduleCron || '',
        durationSeconds: res.data.durationSeconds || 0,
        mutationsData: res.data.mutationsData || '{}',
      });
      setValidationError(null);
    } else {
      setValidationError(res.error || 'Failed to load event');
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
    if (!confirm(`Delete world event ${activeSlug}?`)) return;
    const res = await deleteWorldEvent(activeSlug);
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

    const res = await upsertWorldEvent({
      ...formData,
      slug: formData.slug.trim().toLowerCase(),
    });
    setSaving(false);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      incrementDataVersion();
    } else {
      setValidationError(res.error || 'Failed to save event.');
    }
  };

  const handleChange = (field: keyof WorldEventInput, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CatalogEditorShell<WorldEventTemplate>
      title="World Events"
      search={search}
      onSearchChange={setSearch}
      items={filteredEvents}
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
          World Event Definitions
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
              placeholder="e.g. nightfall"
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
              placeholder="e.g. Nightfall"
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

        {/* ── Scheduling & Active ─────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 mt-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="accent-emerald-500"
            />
            Active
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Cron Schedule
            <input
              type="text"
              value={formData.scheduleCron || ''}
              onChange={(e) => handleChange('scheduleCron', e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50/50 px-2 py-1.5 font-mono text-blue-300 border border-[#806f47]/20"
              placeholder="0 20 * * *"
            />
            <span className="text-[10px] text-slate-500 font-normal">e.g. &quot;0 20 * * *&quot; for 8 PM daily</span>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Duration (sec)
            <input
              type="number"
              value={formData.durationSeconds || 0}
              onChange={(e) => handleChange('durationSeconds', parseInt(e.target.value) || 0)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50/50 px-2 py-1.5 font-mono text-slate-200 border border-[#806f47]/20"
            />
            <span className="text-[10px] text-slate-500 font-normal">How long the event lasts (3600 = 1 hr)</span>
          </label>
        </div>

        {/* ── Mutations JSON ──────────────────────── */}
        <div className="flex-1 mt-2">
          <label className="flex flex-col gap-1 h-full text-[11px] font-bold text-slate-400">
            World State Mutations (JSON)
            <textarea
              value={formData.mutationsData}
              onChange={(e) => handleChange('mutationsData', e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50/50 px-2 py-2 font-mono text-slate-200 border border-[#806f47]/20 h-full min-h-[200px] resize-none"
              placeholder={'{\n  "spawnRateMult": 2.0,\n  "weather": "night",\n  "monsterStrengthMult": 1.2\n}'}
            />
            <span className="text-[10px] text-slate-500 font-normal">Key-value pairs that modify global world state while the event is active.</span>
          </label>
        </div>
      </div>
    </CatalogEditorShell>
  );
};

export default WorldEventPanel;
