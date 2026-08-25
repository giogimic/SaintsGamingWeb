'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAllCharacterClasses,
  upsertCharacterClass,
  deleteCharacterClass,
  toggleCharacterClassPlayable,
  importCharacterClassesJson,
  getGlobalShinyChance,
  setGlobalShinyChance,
} from '@/app/actions/character-classes';
import {
  ClassDefData,
  PLAYABLE_CLASS_IDS,
  SHARED_BASE_STATS,
  emptyClassDef,
  resolveClassStats,
} from '@/shared/game/classCatalog';
import { COMBAT_SKILL_TYPINGS, skillSlugToLabel } from '@/shared/game/skillTypings';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import {
  Plus, Trash2, Save, RefreshCw, Eye, EyeOff, Database, FileJson,
  CheckCircle2, AlertCircle, Sparkles,
} from 'lucide-react';

const inputCls =
  'w-full bg-[#050b14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-[#806f47] transition-colors';
const labelCls = 'block text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1';

export function ClassEditorWorkspace() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const [list, setList] = useState<ClassDefData[]>([]);
  const [form, setForm] = useState<ClassDefData>({ ...emptyClassDef(), profileId: null });
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [globalShiny, setGlobalShiny] = useState(0.5);

  const load = useCallback(async () => {
    const [classesRes, shinyRes] = await Promise.all([
      getAllCharacterClasses(activeGameId),
      getGlobalShinyChance(),
    ]);
    if (classesRes.success) setList(classesRes.data);
    if (shinyRes.success) setGlobalShiny(shinyRes.percent);
  }, [activeGameId]);

  useEffect(() => {
    void load();
    setForm({ ...emptyClassDef(), profileId: null });
    setIsNew(false);
  }, [load]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const f = <K extends keyof ClassDefData>(key: K, value: ClassDefData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setStatDelta = (key: keyof typeof SHARED_BASE_STATS, value: number) => {
    setForm((prev) => ({
      ...prev,
      statDeltas: { ...prev.statDeltas, [key]: value },
    }));
  };

  const setSkillDelta = (key: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      skillDeltas: { ...prev.skillDeltas, [key]: value },
    }));
  };

  const handleSelect = (c: ClassDefData) => {
    setForm({ ...c });
    setIsNew(false);
  };

  const handleNew = () => {
    setForm({
      ...emptyClassDef(),
      profileId: activeGameId,
      sortOrder: list.length + 1,
      slug: `class_${list.length + 1}`,
    });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.name || !form.classId) {
      showStatus('error', 'Slug, name, and classId required.');
      return;
    }
    setLoading(true);
    const res = await upsertCharacterClass({
      ...form,
      // Empty string = shared; undefined falls back to active world profile
      profileId: form.profileId === undefined ? activeGameId : form.profileId || null,
    });
    setLoading(false);
    if (res.success) {
      showStatus('success', `${form.name} saved.`);
      setIsNew(false);
      await load();
    } else {
      showStatus('error', res.error || 'Save failed');
    }
  };



  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete class ${slug}?`)) return;
    const res = await deleteCharacterClass(slug);
    if (res.success) {
      showStatus('success', 'Deleted.');
      await load();
      if (form.slug === slug) {
        setForm(emptyClassDef());
        setIsNew(false);
      }
    } else showStatus('error', res.error || 'Delete failed');
  };

  const handleToggle = async (slug: string, isPlayable: boolean) => {
    const res = await toggleCharacterClassPlayable(slug, isPlayable);
    if (res.success) await load();
    else showStatus('error', res.error || 'Toggle failed');
  };

  const handleImport = async () => {
    setLoading(true);
    const res = await importCharacterClassesJson(jsonInput);
    setLoading(false);
    if (res.success) {
      showStatus('success', `Imported ${res.count} classes.`);
      setShowJson(false);
      await load();
    } else showStatus('error', res.error || 'Import failed');
  };

  const handleSaveGlobalShiny = async () => {
    const res = await setGlobalShinyChance(globalShiny);
    if (res.success) showStatus('success', `Global shiny chance set to ${res.percent}%`);
    else showStatus('error', res.error || 'Failed');
  };

  const resolved = resolveClassStats(form);

  return (
    <CatalogEditorShell
      title="Class Catalog"
      blurb={`Catalog mode · profile ${activeGameId} · CharacterClass SoT`}
      dirty={isNew}
      toolbar={
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => void load()} className="rounded p-1.5 text-slate-400 hover:bg-white/5" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button type="button" onClick={() => setShowJson((v) => !v)} className="rounded px-2 py-1 text-slate-300 hover:bg-white/5 flex items-center gap-1" title="Import JSON">
            <FileJson className="h-3.5 w-3.5" /> JSON
          </button>
          <button type="button" onClick={handleNew} className="rounded p-1.5 text-emerald-400 hover:bg-white/5" title="New class">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      }
      list={
        <div className="space-y-1">
          {list.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => handleSelect(c)}
              className={`w-full rounded border px-2 py-1.5 text-left text-[11px] transition-colors ${
                form.slug === c.slug && !isNew
                  ? 'border-[#806f47] bg-[#806f47]/15 text-[#e2d5b3]'
                  : 'border-transparent text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold truncate" style={{ color: c.color }}>{c.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggle(c.slug, !c.isPlayable);
                  }}
                  title={c.isPlayable ? 'Playable' : 'Hidden'}
                >
                  {c.isPlayable ? <Eye size={11} className="text-emerald-400" /> : <EyeOff size={11} className="text-slate-500" />}
                </button>
              </div>
              <div className="text-[9px] text-slate-500">
                {c.classId}
                <span className="text-slate-600"> · {c.profileId || 'shared'}</span>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <p className="p-2 text-center text-[10px] text-slate-500">No classes. Click Seed.</p>
          )}
        </div>
      }
    >
      {status && (
        <div className={`mb-2 px-2 py-1 rounded flex items-center gap-1 text-[10px] ${status.type === 'success' ? 'bg-emerald-900/40 text-emerald-200' : 'bg-red-900/40 text-red-200'}`}>
          {status.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {status.msg}
        </div>
      )}

      <div className="mb-2 p-2 rounded border border-[#806f47]/30 bg-[#0b1320]/60 space-y-1">
        <div className="flex items-center gap-1.5 text-[#cbb26a] font-bold text-[10px] uppercase">
          <Sparkles size={12} /> Global shiny chance
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            className={inputCls}
            value={globalShiny}
            onChange={(e) => setGlobalShiny(parseFloat(e.target.value) || 0)}
          />
          <span className="text-slate-500 whitespace-nowrap">%</span>
          <button type="button" onClick={() => void handleSaveGlobalShiny()} className="px-2 py-1 bg-[#806f47]/40 hover:bg-[#806f47]/60 rounded text-[#e2d5b3]">
            Save
          </button>
        </div>
        <p className="text-[10px] text-slate-500">Creatures can sync to this or set their own chance in the Creatures panel.</p>
      </div>

      {showJson && (
        <div className="mb-2 space-y-1">
          <textarea
            className={`${inputCls} h-24`}
            placeholder={JSON.stringify(emptyClassDef(), null, 2)}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <button type="button" onClick={() => void handleImport()} disabled={loading} className="px-3 py-1 bg-[#806f47]/40 rounded text-[#e2d5b3]">
            Import JSON
          </button>
        </div>
      )}

      <div className="space-y-3 pr-1">
          {(isNew || form.slug) && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className={labelCls}>Profile (empty = shared)</label>
                  <input
                    className={inputCls}
                    value={form.profileId ?? ''}
                    onChange={(e) => f('profileId', e.target.value || null)}
                    placeholder="saints / custom_1 / empty=shared"
                  />
                </div>
                <div>
                  <label className={labelCls}>Slug</label>
                  <input className={inputCls} value={form.slug} disabled={!isNew} onChange={(e) => f('slug', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Class ID</label>
                  <select
                    className={inputCls}
                    value={form.classId}
                    onChange={(e) => f('classId', e.target.value)}
                  >
                    {PLAYABLE_CLASS_IDS.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={form.name} onChange={(e) => f('name', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Color</label>
                  <input className={inputCls} type="color" value={form.color} onChange={(e) => f('color', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} />
              </div>

              <div className="p-2 rounded border border-slate-800 bg-[#050b14]/60">
                <div className={labelCls}>Stat deltas (on shared base)</div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Shared base: HP {SHARED_BASE_STATS.hp} · ATK {SHARED_BASE_STATS.atk} · DEF {SHARED_BASE_STATS.def} · SPD {SHARED_BASE_STATS.spd}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['hp', 'atk', 'def', 'spd', 'ratk', 'rdef'] as const).map((k) => (
                    <div key={k}>
                      <label className="text-[9px] text-slate-500 uppercase">{k} Δ → {resolved[k]}</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={form.statDeltas[k] ?? 0}
                        onChange={(e) => setStatDelta(k, parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2 rounded border border-slate-800 bg-[#050b14]/60">
                <div className={labelCls}>Combat skill starting deltas</div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Skills are not class-locked — these only change starting levels.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {COMBAT_SKILL_TYPINGS.map((k) => (
                    <div key={k}>
                      <label className="text-[9px] text-slate-500">{skillSlugToLabel(k)}</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={(form.skillDeltas as Record<string, number>)[k] ?? 0}
                        onChange={(e) => setSkillDelta(k, parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <label className="flex items-center gap-1 text-slate-300">
                  <input type="checkbox" checked={form.isPlayable} onChange={(e) => f('isPlayable', e.target.checked)} /> Playable
                </label>
                <div className="flex-1" />
                {!isNew && form.slug && (
                  <button type="button" onClick={() => void handleDelete(form.slug)} className="px-2 py-1 text-red-300 border border-red-900/50 rounded flex items-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSave()}
                  className="px-4 py-2 bg-[#806f47]/50 hover:bg-[#806f47]/70 text-[#e2d5b3] font-bold rounded flex items-center gap-1"
                >
                  <Save size={12} /> {loading ? 'Saving…' : 'Save Class'}
                </button>
              </div>
            </>
          )}
          {!isNew && !form.slug && (
            <div className="text-slate-500 text-center mt-10">Select a class or click New / Seed.</div>
          )}
      </div>
    </CatalogEditorShell>
  );
}
