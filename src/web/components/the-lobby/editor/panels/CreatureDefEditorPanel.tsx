'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PawPrint, Plus, Trash2, Save, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle,
  FileJson, Copy, Check, ChevronLeft, Cuboid, Flame, Shield, Swords, Zap,
  Clock, Sparkles, Filter, Search, Dna, Compass, Camera
} from 'lucide-react';
import {
  getAllCreatureDefs,
  upsertCreatureDef,
  deleteCreatureDef,
  toggleCreatureDefActive,
} from '@/app/actions/game/creature-defs';
import {
  CreatureDefData,
  emptyCreatureDef,
  CREATURE_ELEMENT_TYPES,
  CREATURE_MYTHOS_FAMILIES,
  CreatureElementType,
  CreatureMythosType,
  creatureAssetUrl,
  resolveEntitySpriteUrl,
} from '@/shared/game/creatureCatalog';
import { WorldModelSelector, WorldModelValue } from '../components/WorldModelSelector';
import { ArchetypeModelPreview3D } from '../hero-studio/ArchetypeModelPreview3D';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { useEditorStore } from '../editor-store';
import { useCreatureDefs } from '@/web/hooks/studio-data';
import { cn } from '@/shared/lib/utils';

const CREATURE_STAGES = ['Basic', 'Stage 1', 'Stage 2', 'Legendary'] as const;

const inputCls = "w-full bg-[#050b14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all placeholder:text-slate-700";
const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

export function CreatureDefEditorPanel() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const { creatureDefs: list, isLoading, mutateCreatureDefs } = useCreatureDefs(activeGameId);

  // View Mode: 'gallery' | 'edit' | 'cameras'
  const [viewState, setViewState] = useState<'gallery' | 'edit'>('gallery');

  // Form State
  const [selected, setSelected] = useState<CreatureDefData | null>(null);
  const [form, setForm] = useState<CreatureDefData>({
    ...emptyCreatureDef(),
    gameId: activeGameId,
    category: 'beast',
    typePrimary: 'Normal',
    typeSecondary: 'None',
    mythos: 'Beastial',
    stage: 'Basic',
    baseHp: 45,
    physicalPower: 50,
    physicalDefense: 45,
    abilityPower: 50,
    abilityDefense: 45,
    combatTempo: 60,
    catchRate: 190,
    starterLevel: 5,
    isWildSpawn: true,
  });
  const [isNew, setIsNew] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');
  const [elementFilter, setElementFilter] = useState<'ALL' | string>('ALL');
  const [copied, setCopied] = useState(false);

  // Filter out hostile monsters to show turn-based creatures and companions
  const creaturesOnly = useMemo(() => {
    return list.filter((c) => c.category !== 'monster' && c.tag !== 'Monster');
  }, [list]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const f = <K extends keyof CreatureDefData>(key: K, val: CreatureDefData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSelectCreature = (c: CreatureDefData) => {
    setSelected(c);
    setForm({
      ...c,
      category: 'beast',
      typePrimary: c.typePrimary || 'Normal',
      typeSecondary: c.typeSecondary || 'None',
      mythos: c.mythos || 'Beastial',
      stage: c.stage || 'Basic',
    });
    setIsNew(false);
    setViewState('edit');
  };

  const handleNew = () => {
    const nextDex = creaturesOnly.length > 0 ? Math.max(...creaturesOnly.map((c) => c.dexNumber || 0)) + 1 : 1;
    const freshSlug = `creature_${Math.floor(Date.now() / 1000)}`;
    const newCreature: CreatureDefData = {
      ...emptyCreatureDef(),
      slug: freshSlug,
      name: 'New Creature',
      gameId: activeGameId,
      category: 'beast',
      dexNumber: nextDex,
      typePrimary: 'Normal',
      typeSecondary: 'None',
      mythos: 'Beastial',
      stage: 'Basic',
      baseHp: 50,
      physicalPower: 50,
      physicalDefense: 50,
      abilityPower: 50,
      abilityDefense: 50,
      combatTempo: 50,
      catchRate: 190,
      starterLevel: 5,
      isWildSpawn: true,
      isActive: true,
      spriteOverworld: JSON.stringify({ worldModel: { type: '3D Model', assetId: '', scale: 1 } }),
    };
    setSelected(null);
    setForm(newCreature);
    setIsNew(true);
    setViewState('edit');
  };

  const handleBack = () => {
    setViewState('gallery');
  };

  const handleSave = async () => {
    if (!form.slug || !form.name) {
      showStatus('error', 'Slug and Name are required.');
      return;
    }

    setLoading(true);
    const payload: CreatureDefData = {
      ...form,
      gameId: activeGameId,
      category: 'beast',
      spriteOverworld: form.spriteOverworld || JSON.stringify({ worldModel: { type: '3D Model', assetId: '', scale: 1 } }),
    };

    const res = await upsertCreatureDef(payload);
    setLoading(false);

    if (res.success) {
      showStatus('success', `${form.name} saved successfully!`);
      setIsNew(false);
      mutateCreatureDefs();
    } else {
      showStatus('error', res.error || 'Failed to save creature.');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Permanently delete creature "${slug}"?`)) return;
    setLoading(true);
    const res = await deleteCreatureDef(slug);
    setLoading(false);

    if (res.success) {
      showStatus('success', 'Creature deleted.');
      if (selected?.slug === slug) {
        setSelected(null);
        setIsNew(false);
        setViewState('gallery');
      }
      mutateCreatureDefs();
    } else {
      showStatus('error', res.error || 'Failed to delete.');
    }
  };

  const handleDuplicate = () => {
    if (!form.slug) return;
    const newSlug = `${form.slug}_copy_${Math.floor(Math.random() * 900 + 100)}`;
    setSelected(null);
    setForm({
      ...form,
      slug: newSlug,
      name: `${form.name} (Copy)`,
      dexNumber: (form.dexNumber || 0) + 1,
    });
    setIsNew(true);
    showStatus('success', 'Cloned creature into new draft. Make changes and Save.');
  };

  const handleCopyFormJson = () => {
    navigator.clipboard.writeText(JSON.stringify(form, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // World Model representation helpers
  const getWorldModel = (): WorldModelValue => {
    try {
      const parsed = JSON.parse(form.spriteOverworld || '{}');
      if (parsed.worldModel) return parsed.worldModel;
    } catch {}
    return { type: '3D Model', assetId: form.spriteOverworld || '', scale: 1 };
  };

  const handleWorldModelChange = (val: WorldModelValue) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(form.spriteOverworld || '{}');
      if (typeof parsed !== 'object') parsed = {};
    } catch {}
    delete parsed.modularAttachments;
    parsed.worldModel = val;
    f('spriteOverworld', JSON.stringify(parsed));
  };

  // Evolutions helper
  const addEvolution = () => {
    f('evolutions', [...(form.evolutions || []), { targetSlug: '', atLevel: 16 }]);
  };

  const updateEvolution = (idx: number, patch: any) => {
    const list = [...(form.evolutions || [])];
    list[idx] = { ...list[idx], ...patch };
    f('evolutions', list);
  };

  const removeEvolution = (idx: number) => {
    f('evolutions', (form.evolutions || []).filter((_, i) => i !== idx));
  };

  // Live validation markers
  const isSlugValid = Boolean(form.slug && /^[a-z0-9_]+$/.test(form.slug));
  const isVisualValid = Boolean(form.spriteOverworld);
  const isStatsValid = form.baseHp > 0 && form.catchRate > 0;
  const totalStats = form.baseHp + form.physicalPower + form.physicalDefense + form.abilityPower + form.abilityDefense + form.combatTempo;

  const filteredCreatures = creaturesOnly.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (elementFilter === 'ALL') return true;
    return c.typePrimary === elementFilter || c.typeSecondary === elementFilter;
  });

  // ─── GALLERY VIEW ──────────────────────────────────────────────────────────
  if (viewState === 'gallery') {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#050b14] relative">
        {/* Gallery Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20 shrink-0">
          <div>
            <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 flex items-center gap-2">
              <PawPrint className="text-rose-400" size={20} />
              Creature Registry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Turn-based companion battlers, evolutions, capture rates, and species dex.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void mutateCreatureDefs()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-rose-400' : ''} />
            </button>
            <button
              onClick={handleNew}
              className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} /> Create Creature
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Element Filter Chips */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-[#07111c]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search creatures by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#050b14] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setElementFilter('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border",
                elementFilter === 'ALL'
                  ? "bg-rose-600/30 border-rose-500 text-rose-300"
                  : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              All Species ({creaturesOnly.length})
            </button>
            {['Fire', 'Water', 'Nature', 'Electric', 'Ice', 'Shadow', 'Holy', 'Dragon'].map((elem) => (
              <button
                key={elem}
                onClick={() => setElementFilter(elem)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border",
                  elementFilter === elem
                    ? "bg-rose-600/30 border-rose-500 text-rose-300"
                    : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                {elem}
              </button>
            ))}
          </div>
        </div>

        {/* Status Toast */}
        {status && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-xl border ${status.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : 'bg-red-950/90 border-red-500/30 text-red-300'} backdrop-blur-md`}>
              {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {status.msg}
            </div>
          </div>
        )}

        {/* Gallery Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 pb-20 custom-scrollbar">
          {filteredCreatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 my-16">
              <PawPrint size={48} className="opacity-20" />
              <p className="text-sm font-bold">No creatures found matching your filters.</p>
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow"
              >
                + Create Creature Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {filteredCreatures.map((creature) => {
                let parsed: any = {};
                try { parsed = JSON.parse(creature.spriteOverworld || '{}'); } catch {}
                const is3D = parsed.worldModel?.type === '3D Model' || parsed.type === '3D Model' || !creature.spriteOverworld.includes('.png');

                return (
                  <div
                    key={creature.slug}
                    onClick={() => handleSelectCreature(creature)}
                    className="group relative bg-[#0a101b]/80 border border-slate-800/80 hover:border-rose-500/50 rounded-2xl p-5 cursor-pointer overflow-hidden backdrop-blur-xl transition-all duration-300 flex flex-col hover:shadow-[0_8px_30px_rgba(244,63,94,0.15)] hover:-translate-y-1"
                  >
                    {/* Top Dex # & Delete overlay */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-rose-400/80 font-bold">
                        #{String(creature.dexNumber || 0).padStart(3, '0')}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(creature.slug); }}
                        className="p-1 rounded-lg bg-black/60 hover:bg-red-950/80 text-red-400 hover:text-red-300 backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Creature"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Visual Preview */}
                    <div className="flex justify-center items-center h-28 mb-3 relative z-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-rose-500/5 to-transparent rounded-xl" />
                      {is3D ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 z-10">
                          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                            <Cuboid size={24} />
                          </div>
                          <span className="text-[9px] font-bold text-rose-400/80 uppercase tracking-widest truncate max-w-[100px]">
                            {parsed.worldModel?.assetId || '3D Model'}
                          </span>
                        </div>
                      ) : (
                        <CharacterSpritePreview
                          assetProfileId={creature.spriteOverworld}
                          size={48}
                          scale={1.8}
                        />
                      )}
                    </div>

                    {/* Creature Info */}
                    <div className="text-center flex-1 flex flex-col">
                      <h3 className="text-sm font-black text-white truncate mb-0.5 group-hover:text-rose-300 transition-colors">
                        {creature.name}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-mono truncate mb-2">
                        {creature.slug}
                      </div>

                      {/* Element Badges */}
                      <div className="flex items-center justify-center gap-1.5 mb-2.5 flex-wrap">
                        {creature.typePrimary && (
                          <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800/80">
                            {creature.typePrimary}
                          </span>
                        )}
                        {creature.typeSecondary && creature.typeSecondary !== 'None' && creature.typeSecondary !== 'none' && (
                          <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/80">
                            {creature.typeSecondary}
                          </span>
                        )}
                      </div>

                      {/* Catch Rate & Stats Line */}
                      <div className="grid grid-cols-2 gap-1 text-[9.5px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg border border-slate-800/60 mt-auto">
                        <div>Catch: <strong className="text-emerald-400">{creature.catchRate}</strong></div>
                        <div>BST: <strong className="text-white">{creature.baseHp + creature.physicalPower + creature.physicalDefense + creature.abilityPower + creature.abilityDefense + creature.combatTempo}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── EDITOR VIEW ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#050b14] relative">
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/40 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            title="Back to Creature List"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white">{isNew ? 'Create Creature' : form.name}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isNew ? 'Drafting a new turn-based creature species' : `Editing creature definition: ${form.slug}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Validation Markers */}
          <div className="hidden lg:flex items-center gap-3 mr-4">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isSlugValid ? 'text-emerald-400/80' : 'text-red-400'}`}>
              {isSlugValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} Slug
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isVisualValid ? 'text-emerald-400/80' : 'text-red-400'}`}>
              {isVisualValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} Visuals
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isStatsValid ? 'text-emerald-400/80' : 'text-red-400'}`}>
              {isStatsValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} Battle Stats
            </div>
          </div>

          {!isNew && (
            <button
              onClick={handleDuplicate}
              className="px-3 py-2 rounded-lg text-xs font-bold text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Copy size={14} /> Clone
            </button>
          )}

          <button
            onClick={handleCopyFormJson}
            className="px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <FileJson size={14} />} {copied ? 'Copied' : 'JSON'}
          </button>

          <button
            onClick={() => void handleSave()}
            disabled={loading || !isSlugValid || !isStatsValid || !form.name}
            className="px-6 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer"
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save Creature'}
          </button>
        </div>
      </div>

      {/* Status Overlay */}
      {status && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95">
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-xl border ${status.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : 'bg-red-950/90 border-red-500/30 text-red-300'} backdrop-blur-md`}>
            {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status.msg}
          </div>
        </div>
      )}

      {/* Form Split Layout */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Identity & Battle Stats (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Box 1: Core Creature Identity & Species Dex */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-rose-500/10 pb-3">
                <PawPrint className="text-rose-400/80" size={16} />
                <h3 className="text-xs font-black text-rose-400/80 uppercase tracking-widest">Species Identity</h3>
              </div>

              <div>
                <label className={labelCls}>Creature Name</label>
                <input
                  value={form.name}
                  onChange={(e) => f('name', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Fennec Flare"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>System Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => f('slug', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className={inputCls}
                    placeholder="e.g. creature_fennec_flare"
                    disabled={!isNew}
                    style={{ opacity: isNew ? 1 : 0.6 }}
                  />
                </div>
                <div>
                  <label className={labelCls}>Dex Number</label>
                  <input
                    type="number"
                    value={form.dexNumber || 1}
                    onChange={(e) => f('dexNumber', Number(e.target.value))}
                    className={inputCls}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Mythos Family</label>
                  <select
                    value={form.mythos || 'Beastial'}
                    onChange={(e) => f('mythos', e.target.value as CreatureMythosType)}
                    className={inputCls}
                  >
                    {CREATURE_MYTHOS_FAMILIES.map((family) => (
                      <option key={family} value={family}>{family}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Evolution Stage</label>
                  <select
                    value={form.stage || 'Basic'}
                    onChange={(e) => f('stage', e.target.value)}
                    className={inputCls}
                  >
                    {CREATURE_STAGES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Elemental Typing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Primary Element</label>
                  <select
                    value={form.typePrimary || 'Normal'}
                    onChange={(e) => f('typePrimary', e.target.value as CreatureElementType)}
                    className={inputCls}
                  >
                    {CREATURE_ELEMENT_TYPES.map((elem) => (
                      <option key={elem} value={elem}>{elem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Secondary Element</label>
                  <select
                    value={form.typeSecondary || 'None'}
                    onChange={(e) => f('typeSecondary', e.target.value as CreatureElementType)}
                    className={inputCls}
                  >
                    {CREATURE_ELEMENT_TYPES.map((elem) => (
                      <option key={elem} value={elem}>{elem}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Dex Lore & Description</label>
                <textarea
                  value={form.flavor || ''}
                  onChange={(e) => f('flavor', e.target.value)}
                  className={cn(inputCls, "resize-none h-20")}
                  placeholder="Inhabits volcanic foothills, using its embers to ward off predators..."
                  maxLength={180}
                />
              </div>
            </div>

            {/* Box 2: Turn-Based Battle Stats */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between border-b border-rose-500/10 pb-3">
                <div className="flex items-center gap-2">
                  <Swords className="text-rose-400/80" size={16} />
                  <h3 className="text-xs font-black text-rose-400/80 uppercase tracking-widest">Base Battle Stats</h3>
                </div>
                <span className="text-[10px] font-mono text-rose-400 font-bold">
                  Base Stat Total: {totalStats}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'baseHp', label: 'HP', icon: Flame, color: 'text-emerald-400' },
                  { key: 'physicalPower', label: 'Attack', icon: Swords, color: 'text-red-400' },
                  { key: 'physicalDefense', label: 'Defense', icon: Shield, color: 'text-blue-400' },
                  { key: 'abilityPower', label: 'Sp. Atk', icon: Zap, color: 'text-purple-400' },
                  { key: 'abilityDefense', label: 'Sp. Def', icon: Shield, color: 'text-indigo-400' },
                  { key: 'combatTempo', label: 'Speed', icon: Clock, color: 'text-amber-400' },
                ].map((stat) => (
                  <div key={stat.key} className="bg-black/30 p-2.5 rounded-xl border border-slate-800/60">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className={stat.color}>{stat.label}</span>
                    </label>
                    <input
                      type="number"
                      value={form[stat.key as keyof CreatureDefData] as number}
                      onChange={(e) => f(stat.key as keyof CreatureDefData, Number(e.target.value) as any)}
                      className={inputCls}
                      min={1}
                      max={255}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Box 3: Capture & Growth */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-rose-500/10 pb-3">
                <Compass className="text-rose-400/80" size={16} />
                <h3 className="text-xs font-black text-rose-400/80 uppercase tracking-widest">Capture & Growth</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Catch Rate (1 - 255)</label>
                  <input
                    type="number"
                    value={form.catchRate ?? 190}
                    onChange={(e) => f('catchRate', Number(e.target.value))}
                    className={inputCls}
                    min={1}
                    max={255}
                  />
                  <span className="text-[9.5px] text-slate-500 mt-1 block">
                    Lower values mean harder to capture in spheres (e.g. 3 = Legendary, 255 = Common).
                  </span>
                </div>
                <div>
                  <label className={labelCls}>Starter / Wild Level</label>
                  <input
                    type="number"
                    value={form.starterLevel ?? 5}
                    onChange={(e) => f('starterLevel', Number(e.target.value))}
                    className={inputCls}
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => f('isStarter', !form.isStarter)}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between",
                    form.isStarter
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-black/30 border-slate-800 text-slate-400"
                  )}
                >
                  <span>Starter Creature</span>
                  <span className="text-[10px] font-mono">{form.isStarter ? 'YES' : 'NO'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => f('isWildSpawn', !form.isWildSpawn)}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-between",
                    form.isWildSpawn
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                      : "bg-black/30 border-slate-800 text-slate-400"
                  )}
                >
                  <span>Wild Encounter</span>
                  <span className="text-[10px] font-mono">{form.isWildSpawn ? 'ENABLED' : 'DISABLED'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3D/2D Visual Selector, Evolutions & Status (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Box 4: Asset Selector & Live 3D/2D Preview */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-3">
                <Cuboid className="text-cyan-400/80" size={16} />
                <h3 className="text-xs font-black text-cyan-400/80 uppercase tracking-widest">3D Overworld & Sprites</h3>
              </div>

              {/* Live 3D Canvas Preview */}
              {getWorldModel().type === '3D Model' && getWorldModel().assetId && (
                <div className="pb-2">
                  <ArchetypeModelPreview3D
                    baseAssetId={getWorldModel().assetId}
                    modelScale={getWorldModel().scale ?? 0.8}
                    worldModel={getWorldModel()}
                    className="h-80"
                  />
                </div>
              )}

              <WorldModelSelector
                value={getWorldModel()}
                onChange={handleWorldModelChange}
                label="Overworld Creature Representation"
                modelRole="creature"
              />



              {/* 2D Battle Sprites */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                <div>
                  <label className={labelCls}>Front Battle Sprite</label>
                  <input
                    value={form.spriteBattle || ''}
                    onChange={(e) => f('spriteBattle', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. creatures/fennec_battle.png"
                  />
                </div>
                <div>
                  <label className={labelCls}>Back Battle Sprite</label>
                  <input
                    value={form.spriteBack || ''}
                    onChange={(e) => f('spriteBack', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. creatures/fennec_back.png"
                  />
                </div>
              </div>
            </div>

            {/* Box 5: Evolution Line */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between border-b border-rose-500/10 pb-3">
                <div className="flex items-center gap-2">
                  <Dna className="text-rose-400/80" size={16} />
                  <h3 className="text-xs font-black text-rose-400/80 uppercase tracking-widest">Evolution Line</h3>
                </div>
                <button
                  type="button"
                  onClick={addEvolution}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Evolution
                </button>
              </div>

              {(form.evolutions || []).length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  No evolutions defined. This species does not evolve.
                </div>
              ) : (
                <div className="space-y-3">
                  {(form.evolutions || []).map((evo, idx) => (
                    <div key={idx} className="p-3 bg-black/40 rounded-xl border border-slate-800 flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Target Species Slug</label>
                          <input
                            value={evo.targetSlug}
                            onChange={(e) => updateEvolution(idx, { targetSlug: e.target.value })}
                            className={inputCls}
                            placeholder="e.g. creature_fennec_pyre"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-400 uppercase">Level Req.</label>
                          <input
                            type="number"
                            value={evo.atLevel || 16}
                            onChange={(e) => updateEvolution(idx, { atLevel: Number(e.target.value) })}
                            className={inputCls}
                            min={1}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvolution(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition cursor-pointer"
                        title="Remove Evolution"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Box 6: Live Status Toggle */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <button
                type="button"
                onClick={() => f('isActive', !form.isActive)}
                className={cn(
                  "w-full flex justify-between items-center px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                  form.isActive
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-red-500/15 border-red-500/40 text-red-300"
                )}
              >
                <span>{form.isActive ? 'Active in Live Game' : 'Hidden from Players (Draft)'}</span>
                {form.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
