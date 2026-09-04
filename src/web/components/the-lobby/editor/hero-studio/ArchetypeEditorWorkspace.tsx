'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllStarterHeroes, upsertStarterHero, deleteStarterHero,
  toggleStarterHeroActive, StarterHeroData
} from '@/app/actions/game/starter-heroes';
import { fetchAllMaps } from '@/app/actions/admin/game-admin';
import { getAllCharacterClasses } from '@/app/actions/game/character-classes';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import {
  Plus, Trash2, Save, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle,
  FileJson, Copy, Check, Users, ImageIcon,
} from 'lucide-react';
import SpriteBrowser from '../SpriteBrowser';
import { CharacterSpritePreview } from '@/web/components/the-lobby/CharacterSpritePreview';

const EMPTY_HERO: StarterHeroData = {
  slug: '',
  gameId: 'custom_1',
  name: '',
  classId: 'WARRIOR',
  assetProfileId: '',
  flavor: '',
  tag: 'Starter',
  tagColor: '#a78bfa',
  sortOrder: 0,
  isActive: true,
  startingMap: 'DEMO_SANDBOX',
  startingX: 14,
  startingY: 15,
  startingInventory: '{"patch_kit":5}',
  visualData: '[]',
};

type VisualLayer = {
  id: string;
  category: string;
  assetProfileId: string;
  assetBundleId?: string;
  tint?: string;
};

// ─── Hero List Item ────────────────────────────────────────────────────────────

function HeroListItem({
  hero,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
}: {
  hero: any;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group"
      style={{
        background: isSelected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
        border: isSelected ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
        opacity: hero.isActive ? 1 : 0.45,
      }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {hero.assetProfileId ? (
          <CharacterSpritePreview
            assetProfileId={hero.assetProfileId}
            assetBundleId={hero.assetBundleId}
            layers={(() => {
              try {
                const arr = JSON.parse(hero.visualData || '[]');
                return arr.length > 0 ? [hero.assetProfileId, ...arr.map((l: any) => l.assetProfileId)] : undefined;
              } catch { return undefined; }
            })()}
            size={24}
            scale={1.1}
          />
        ) : (
          <Users className="w-4 h-4 text-slate-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-black text-violet-100 truncate">{hero.name || 'Unnamed Archetype'}</div>
        <div className="text-[9px] text-violet-500/50 font-mono uppercase">{hero.classId} · {hero.assetProfileId || 'No Sprite'}</div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="p-1 rounded transition-colors"
          style={{ color: hero.isActive ? '#34d399' : 'rgba(255,255,255,0.2)' }}
          title={hero.isActive ? 'Active — click to hide' : 'Hidden — click to show'}
        >
          {hero.isActive ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded text-red-400/40 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div
        className="w-1 h-4 rounded-full shrink-0"
        style={{ background: hero.isActive ? '#34d399' : 'rgba(255,255,255,0.1)' }}
      />
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export function ArchetypeEditorWorkspace() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  
  // Data State
  const [heroes, setHeroes] = useState<any[]>([]);
  const [classList, setClassList] = useState<{slug: string, name: string, classId: string}[]>([]);
  const [mapList, setMapList] = useState<{id: string, name: string}[]>([]);
  
  // Form State
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<StarterHeroData>({ ...EMPTY_HERO, gameId: activeGameId });
  const [isNew, setIsNew] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);
  const [activeLayerPicker, setActiveLayerPicker] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [heroesRes, mapsRes, classesRes] = await Promise.all([
      getAllStarterHeroes(activeGameId),
      fetchAllMaps(),
      getAllCharacterClasses(activeGameId),
    ]);
    if (heroesRes.success) setHeroes(heroesRes.data);
    if (mapsRes.success) setMapList(mapsRes.data);
    if (classesRes.success) setClassList(classesRes.data);
  }, [activeGameId]);

  useEffect(() => {
    void load();
    setForm({ ...EMPTY_HERO, gameId: activeGameId });
    setIsNew(false);
    setSelected(null);
  }, [load, activeGameId]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSelectHero = (hero: any) => {
    setSelected(hero);
    setForm({
      slug: hero.slug, gameId: hero.gameId || activeGameId, name: hero.name, classId: hero.classId,
      assetProfileId: hero.assetProfileId, assetBundleId: hero.assetBundleId || '', visualData: hero.visualData || '[]', flavor: hero.flavor, tag: hero.tag,
      tagColor: hero.tagColor, sortOrder: hero.sortOrder, isActive: hero.isActive,
      startingMap: hero.startingMap, startingX: hero.startingX, startingY: hero.startingY,
      startingInventory: hero.startingInventory,
    });
    setIsNew(false);
  };

  const handleNew = () => {
    setSelected(null);
    setForm({ ...EMPTY_HERO, gameId: activeGameId, sortOrder: heroes.length + 1 });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.name || !form.assetProfileId) {
      showStatus('error', 'Slug, Name, and Sprite Key are required.');
      return;
    }
    setLoading(true);
    const res = await upsertStarterHero({ ...form, gameId: form.gameId || activeGameId });
    setLoading(false);
    if (res.success) {
      showStatus('success', `${form.name} saved successfully!`);
      await load();
      setIsNew(false);
    } else {
      showStatus('error', res.error || 'Save failed.');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete "${slug}" permanently?`)) return;
    const res = await deleteStarterHero(slug);
    if (res.success) {
      showStatus('success', 'Deleted.');
      if (selected?.slug === slug) { setSelected(null); setIsNew(false); }
      await load();
    } else {
      showStatus('error', res.error || 'Delete failed.');
    }
  };

  const handleToggle = async (hero: any) => {
    const res = await toggleStarterHeroActive(hero.slug, !hero.isActive);
    if (res.success) await load();
  };

  const handleCopyFormJson = () => {
    navigator.clipboard.writeText(JSON.stringify(form, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDuplicate = () => {
    if (!form.slug) return;
    const newSlug = `${form.slug}_copy_${Math.floor(Math.random() * 900 + 100)}`;
    setSelected(null);
    setForm({
      ...form,
      slug: newSlug,
      name: `${form.name} (Copy)`,
      sortOrder: heroes.length + 1,
    });
    setIsNew(true);
    showStatus('success', 'Cloned archetype into new draft. Make your changes and Save.');
  };

  const f = (key: keyof StarterHeroData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const getVisualLayers = (): VisualLayer[] => {
    try {
      return JSON.parse(form.visualData || '[]');
    } catch {
      return [];
    }
  };

  const updateVisualLayers = (layers: VisualLayer[]) => {
    f('visualData', JSON.stringify(layers));
  };

  const addVisualLayer = () => {
    const layers = getVisualLayers();
    layers.push({ id: Math.random().toString(36).substring(7), category: 'clothes', assetProfileId: '' });
    updateVisualLayers(layers);
  };

  const removeVisualLayer = (id: string) => {
    updateVisualLayers(getVisualLayers().filter(l => l.id !== id));
  };

  const updateLayer = (id: string, updates: Partial<VisualLayer>) => {
    updateVisualLayers(getVisualLayers().map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // Validation state checks
  const isSpriteValid = Boolean(form.assetProfileId || form.assetBundleId);
  const isSlugValid = Boolean(form.slug && /^[a-z0-9_]+$/.test(form.slug));
  let isJsonValid = true;
  try { JSON.parse(form.startingInventory); } catch { isJsonValid = false; }

  const inputCls = "w-full bg-[#050b14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-[#806f47] transition-colors";
  const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1";
  const activeCount = heroes.filter((h) => h.isActive).length;

  return (
    <div className="relative h-full min-h-0">
      <CatalogEditorShell
        title="Archetype Studio"
        blurb={`Catalog mode · profile ${activeGameId} · ${activeCount}/${heroes.length} active`}
        dirty={isNew}
        toolbar={
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => void load()} className="rounded p-1.5 text-slate-400 hover:bg-white/5" title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={handleNew} className="rounded p-1.5 text-emerald-400 hover:bg-white/5" title="New archetype">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        }
        list={
          <div className="flex h-full min-h-0 flex-col gap-1.5">
            <button
              type="button"
              onClick={handleNew}
              className="w-full rounded-lg border border-pink-500/40 bg-pink-500/20 px-2 py-1.5 text-[10px] font-bold text-pink-200 hover:bg-pink-500/30 flex items-center justify-center gap-1"
            >
              <Plus size={11} strokeWidth={3} /> New Custom Archetype
            </button>
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 px-1 pt-1">
              Archetypes Pool ({heroes.length})
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {heroes.length === 0 ? (
                <p className="p-2 text-center text-[10px] text-slate-500">No archetypes yet. Create one.</p>
              ) : (
                heroes.map((h) => (
                  <HeroListItem
                    key={h.slug}
                    hero={h}
                    isSelected={selected?.slug === h.slug && !isNew}
                    onSelect={() => handleSelectHero(h)}
                    onToggle={() => void handleToggle(h)}
                    onDelete={() => void handleDelete(h.slug)}
                  />
                ))
              )}
            </div>
          </div>
        }
      >
        {status && (
          <div className={`mb-2 flex items-center gap-1 rounded px-2 py-1 text-[10px] ${status.type === 'success' ? 'bg-emerald-900/40 text-emerald-200' : 'bg-red-900/40 text-red-200'}`}>
            {status.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {status.msg}
          </div>
        )}

        {(selected || isNew) ? (
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-pink-500/20 pb-2">
              <span className="text-[11px] font-bold text-pink-200">
                {isNew ? 'New Archetype Template' : `Editing: ${selected?.name}`}
              </span>
              <div className="flex items-center gap-1.5">
                {selected && !isNew && (
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="rounded px-2 py-1 text-[10px] font-bold text-purple-300 hover:bg-purple-950/50 border border-purple-500/30 flex items-center gap-1 transition-all cursor-pointer"
                    title="Duplicate archetype as new draft"
                  >
                    <Copy size={11} />
                    <span>Clone</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyFormJson}
                  className="rounded px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/5 flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <FileJson size={11} />}
                  {copied ? 'Copied!' : 'Copy Spec'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={loading || !isSpriteValid || !isSlugValid || !isJsonValid}
                  className="rounded bg-pink-600/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-pink-100 hover:bg-pink-600/70 disabled:opacity-40 flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Save size={11} />
                  {loading ? 'Saving…' : 'Save Archetype'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

              {/* ── Validation Status Bar ── */}
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div
                  className="px-2 py-1 rounded flex items-center gap-1 font-bold"
                  style={{
                    background: isSlugValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: isSlugValid ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    color: isSlugValid ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {isSlugValid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  Slug: {isSlugValid ? 'Valid' : 'Required (lowercase/no spaces)'}
                </div>
                <div
                  className="px-2 py-1 rounded flex items-center gap-1 font-bold"
                  style={{
                    background: isSpriteValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: isSpriteValid ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    color: isSpriteValid ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {isSpriteValid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  Sprite: {isSpriteValid ? 'Assigned' : 'Required'}
                </div>
                <div
                  className="px-2 py-1 rounded flex items-center gap-1 font-bold"
                  style={{
                    background: isJsonValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: isJsonValid ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    color: isJsonValid ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {isJsonValid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  Inventory: {isJsonValid ? 'Valid JSON' : 'Invalid JSON Syntax'}
                </div>
              </div>

              {/* ── Identity ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Identity & Metadata
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Display Name *</label>
                    <input value={form.name} onChange={e => f('name', e.target.value)} className={inputCls} placeholder="e.g. Beast Master" />
                  </div>
                  <div>
                    <label className={labelCls}>Slug (Unique Identifier) *</label>
                    <input
                      value={form.slug}
                      onChange={e => f('slug', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className={inputCls}
                      placeholder="e.g. creature_beast_master"
                      disabled={!isNew}
                      style={{ opacity: isNew ? 1 : 0.5 }}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className={labelCls}>Flavor Description (Shown under title in character creator)</label>
                  <input value={form.flavor} onChange={e => f('flavor', e.target.value)} className={inputCls} placeholder="Short 1-line description of archetype" maxLength={80} />
                  <p className="text-[8px] text-slate-600 mt-0.5">{form.flavor.length}/80 characters</p>
                </div>
              </section>

              {/* ── Class ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Archetype Combat Class
                </div>
                {classList.length === 0 ? (
                  <p className="text-[10px] text-amber-500">No classes found in registry! Please define classes first.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {classList.map(cls => {
                      const isActive = form.classId === cls.classId;
                      return (
                        <button
                          key={cls.slug}
                          onClick={() => f('classId', cls.classId)}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all"
                          style={{
                            background: isActive ? `rgba(139,92,246,0.15)` : 'rgba(255,255,255,0.03)',
                            border: isActive ? `1px solid rgba(139,92,246,0.5)` : '1px solid rgba(255,255,255,0.06)',
                            boxShadow: isActive ? `0 0 10px rgba(139,92,246,0.2)` : 'none',
                          }}
                        >
                          <span className="text-[10px] font-black" style={{ color: isActive ? '#a78bfa' : 'rgba(139,92,246,0.35)' }}>
                            {cls.name}
                          </span>
                          <span className="text-[8px] text-slate-500 font-mono">{cls.classId}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Tag / Badge ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Difficulty / Playstyle Tag
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Custom Tag Text</label>
                    <input value={form.tag} onChange={e => f('tag', e.target.value)} className={inputCls} placeholder="e.g. Balanced" />
                  </div>
                  <div>
                    <label className={labelCls}>Tag Badge Color</label>
                    <input type="color" value={form.tagColor} onChange={e => f('tagColor', e.target.value)}
                      className="h-7 w-14 rounded border border-slate-800 bg-transparent cursor-pointer" />
                  </div>
                  <div
                    className="px-2 py-1 rounded text-[9px] font-black self-end mb-0.5"
                    style={{
                      background: `${form.tagColor}18`,
                      border: `1px solid ${form.tagColor}50`,
                      color: form.tagColor,
                    }}
                  >
                    {form.tag || 'Preview'}
                  </div>
                </div>
              </section>

              {/* ── Sprite Key ── */}
              <section>
                <div
                  className="flex items-center justify-between pb-1 mb-2"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  <span className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em]">
                    Avatar Sprite
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCatalogBrowser(true)}
                    className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded transition-all cursor-pointer shadow"
                  >
                    <ImageIcon size={10} />
                    Open Asset Manager
                  </button>
                </div>

                {/* Selected sprite preview */}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{
                      background: isSpriteValid ? 'rgba(139,92,246,0.1)' : 'rgba(239,68,68,0.1)',
                      border: isSpriteValid ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    {form.assetProfileId ? (
                      <CharacterSpritePreview
                        assetProfileId={form.assetProfileId}
                        assetBundleId={form.assetBundleId}
                        layers={(() => {
                          try {
                            const arr = JSON.parse(form.visualData || '[]');
                            return arr.length > 0 ? [form.assetProfileId, ...arr.map((l: any) => l.assetProfileId)] : undefined;
                          } catch { return undefined; }
                        })()}
                        size={32}
                        scale={1.8}
                      />
                    ) : (
                      <Users className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Sprite Key (Source Image)</label>
                    <input
                      value={form.assetProfileId}
                      onChange={e => f('assetProfileId', e.target.value)}
                      className={inputCls}
                      placeholder="e.g. warrior, /uploads/modular-hero.png"
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className={labelCls}>Sprite Bundle ID (Dynamic Component Data)</label>
                  <input
                    value={form.assetBundleId || ''}
                    onChange={e => f('assetBundleId', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. paladin-male-042 (Generated via Asset Manager)"
                  />
                  <p className="text-[8px] text-slate-600 mt-0.5">
                    If this character uses modular layers from the Asset Manager, this holds the metadata link.
                  </p>
                </div>
              </section>

              {/* ── Appearance Layers ── */}
              <section>
                <div
                  className="flex items-center justify-between pb-1 mb-2"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  <span className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em]">
                    Appearance Layers
                  </span>
                  <button
                    type="button"
                    onClick={addVisualLayer}
                    className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shadow"
                  >
                    <Plus size={10} />
                    Add Layer
                  </button>
                </div>
                
                <div className="space-y-2">
                  {getVisualLayers().length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No layers added. Uses default Base Sprite.</p>
                  ) : (
                    getVisualLayers().map((layer, i) => (
                      <div key={layer.id} className="flex flex-col gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-300">Layer {i + 1}</span>
                          <button onClick={() => removeVisualLayer(layer.id)} className="text-red-400/60 hover:text-red-400 p-0.5 rounded cursor-pointer">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className={labelCls}>Category</label>
                            <select
                              value={layer.category}
                              onChange={(e) => updateLayer(layer.id, { category: e.target.value })}
                              className={inputCls}
                            >
                              <option value="hair">Hair</option>
                              <option value="clothes">Clothes</option>
                              <option value="accessory">Accessory</option>
                              <option value="weapon">Weapon</option>
                              <option value="effect">Effect</option>
                            </select>
                          </div>
                          <div className="flex-[2]">
                            <label className={labelCls}>Asset Profile</label>
                            <div className="flex gap-1">
                              <input
                                value={layer.assetProfileId}
                                onChange={(e) => updateLayer(layer.id, { assetProfileId: e.target.value })}
                                className={inputCls}
                                placeholder="Sprite Key"
                              />
                              <button
                                type="button"
                                onClick={() => setActiveLayerPicker(layer.id)}
                                className="bg-cyan-900/40 text-cyan-400 px-2 rounded border border-cyan-500/20 flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <ImageIcon size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* ── Spawn Settings ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Initial Spawn Position
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className={labelCls}>Starting Map</label>
                    <select
                      value={form.startingMap}
                      onChange={e => f('startingMap', e.target.value)}
                      className={inputCls}
                    >
                      {mapList.length === 0 && <option value="DEMO_SANDBOX">DEMO_SANDBOX (Fallback)</option>}
                      {mapList.map(map => (
                        <option key={map.id} value={map.id}>{map.name} ({map.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Spawn X</label>
                    <input type="number" value={form.startingX} onChange={e => f('startingX', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Spawn Y</label>
                    <input type="number" value={form.startingY} onChange={e => f('startingY', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                </div>
              </section>

              {/* ── Sort & Visibility ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Sorting & Status
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Sort Order (0 = first)</label>
                    <input type="number" value={form.sortOrder} onChange={e => f('sortOrder', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Visible in Character Creator</label>
                    <button
                      onClick={() => f('isActive', !form.isActive)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
                      style={{
                        background: form.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.08)',
                        border: form.isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.2)',
                        color: form.isActive ? '#6ee7b7' : '#fca5a5',
                      }}
                    >
                      {form.isActive ? <Eye size={11} /> : <EyeOff size={11} />}
                      {form.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Starting Inventory ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Starting Inventory Specs (JSON Map)
                </div>
                <textarea
                  value={form.startingInventory}
                  onChange={e => f('startingInventory', e.target.value)}
                  rows={3}
                  className={inputCls + ' resize-none'}
                  placeholder='{"item_id": quantity}'
                />
                <p className="text-[8px] text-slate-600 mt-0.5">
                  Format: <code>{`{"capture_script":20,"patch_kit":10}`}</code>. Standard starter kit auto-granted on spawn.
                </p>
              </section>


            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
            <Users size={32} />
            <p className="text-center text-[10px]">
              Select an archetype to edit<br />or click &quot;New Custom Archetype&quot;
            </p>
          </div>
        )}
      </CatalogEditorShell>

      {/* Catalog Modular Sprite Picker Modal */}
      {(showCatalogBrowser || activeLayerPicker) && (
        <div
          className="pointer-events-auto absolute inset-0 z-40 p-4 flex items-center justify-center animate-in fade-in duration-200"
          style={{ background: 'rgba(5,0,15,0.96)', backdropFilter: 'blur(10px)' }}
        >
          <div className="w-full max-w-3xl h-[80vh] bg-[#0a051d] border border-cyan-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/30 bg-[#050b14]/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="font-black text-cyan-200 text-sm">
                  Select Character / Modular Sprite from Catalog
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCatalogBrowser(false);
                  setActiveLayerPicker(null);
                }}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <SpriteBrowser
                filterType="CHARACTER"
                onSelect={(selectedAssets) => {
                  const asset = selectedAssets[0];
                  if (asset) {
                    if (activeLayerPicker) {
                      updateLayer(activeLayerPicker, {
                        assetProfileId: asset.source,
                        assetBundleId: asset.variantFamily || asset.id,
                      });
                    } else {
                      f('assetProfileId', asset.source);
                      if (asset.variantFamily || asset.id) {
                        f('assetBundleId', asset.variantFamily || asset.id);
                      }
                    }
                  }
                  setShowCatalogBrowser(false);
                  setActiveLayerPicker(null);
                }}
                onClose={() => {
                  setShowCatalogBrowser(false);
                  setActiveLayerPicker(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
