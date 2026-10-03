'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Skull, Plus, Trash2, Save, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle,
  FileJson, Copy, Check, ChevronLeft, Cuboid, Flame, Shield, Swords, Zap,
  Target, Clock, Coins, Award, Sparkles, Filter, Search
} from 'lucide-react';
import {
  getAllCreatureDefs,
  upsertCreatureDef,
  deleteCreatureDef,
} from '@/app/actions/game/creature-defs';
import {
  CreatureDefData,
  emptyCreatureDef,
  CREATURE_ELEMENT_TYPES,
  CreatureElementType
} from '@/shared/game/creatureCatalog';
import { WorldModelSelector, WorldModelValue } from '../components/WorldModelSelector';
import { ModelWardrobeEditor } from '../components/ModelWardrobeEditor';
import type { ModelWardrobeItem } from '@/shared/game/modelWardrobe';
import { ArchetypeModelPreview3D } from '../hero-studio/ArchetypeModelPreview3D';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { useEditorStore } from '../editor-store';
import { cn } from '@/shared/lib/utils';

const MONSTER_STAGES = [
  { id: 'Minion', label: 'Minion', blurb: 'Standard dungeon trash and world mobs', color: 'border-slate-700 bg-slate-800 text-slate-300' },
  { id: 'Elite', label: 'Elite', blurb: 'Toughened patrol captain or miniboss', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  { id: 'Dungeon Boss', label: 'Dungeon Boss', blurb: 'Guards end of dungeon or instanced vault', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
  { id: 'World Boss', label: 'World Boss', blurb: 'Massive open-world raid challenge', color: 'border-red-500/50 bg-red-500/15 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]' },
];

const inputCls = "w-full bg-[#050b14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-slate-700";
const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

export function MonsterEditorPanel() {
  const activeGameId = useEditorStore((state) => state.activeGameId);

  // Data State
  const [monsters, setMonsters] = useState<CreatureDefData[]>([]);
  const [viewState, setViewState] = useState<'gallery' | 'edit'>('gallery');

  // Form State
  const [selected, setSelected] = useState<CreatureDefData | null>(null);
  const [form, setForm] = useState<CreatureDefData>({
    ...emptyCreatureDef(),
    category: 'monster',
    tag: 'Monster',
    tagColor: '#ef4444',
    isWildSpawn: true,
    stage: 'Minion',
    starterLevel: 10,
    aggroRadius: 8,
    respawnSec: 60,
  });
  const [isNew, setIsNew] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | string>('ALL');
  const [copied, setCopied] = useState(false);

  const loadMonsters = useCallback(async () => {
    setLoading(true);
    const res = await getAllCreatureDefs(activeGameId);
    if (res.success && res.data) {
      // Filter out capturable creatures; retain monsters
      const monsterList = res.data.filter((c: any) => c.category === 'monster' || c.tag === 'Monster');
      setMonsters(monsterList);
    }
    setLoading(false);
  }, [activeGameId]);

  useEffect(() => {
    void loadMonsters();
  }, [loadMonsters]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const f = <K extends keyof CreatureDefData>(key: K, val: CreatureDefData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSelectMonster = (m: CreatureDefData) => {
    setSelected(m);
    setForm({
      ...m,
      category: 'monster',
      tag: 'Monster',
      aggroRadius: m.aggroRadius ?? 8,
      respawnSec: m.respawnSec ?? 60,
    });
    setIsNew(false);
    setViewState('edit');
  };

  const handleNew = () => {
    const freshSlug = `monster_${Math.floor(Date.now() / 1000)}`;
    const newMonster: CreatureDefData = {
      ...emptyCreatureDef(),
      slug: freshSlug,
      name: 'New Monster',
      gameId: activeGameId,
      category: 'monster',
      tag: 'Monster',
      tagColor: '#ef4444',
      stage: 'Minion',
      isWildSpawn: true,
      starterLevel: 10,
      baseHp: 350,
      physicalPower: 35,
      physicalDefense: 25,
      abilityPower: 20,
      abilityDefense: 20,
      combatTempo: 100,
      aggroRadius: 8,
      respawnSec: 60,
      spriteOverworld: JSON.stringify({ worldModel: { type: '3D Model', assetId: '', scale: 1 } }),
    };
    setSelected(null);
    setForm(newMonster);
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
      category: 'monster',
      tag: 'Monster',
      isWildSpawn: form.isWildSpawn ?? true,
      spriteOverworld: form.spriteOverworld || JSON.stringify({ worldModel: { type: '3D Model', assetId: '', scale: 1 } }),
    };

    const res = await upsertCreatureDef(payload);
    setLoading(false);

    if (res.success) {
      showStatus('success', `${form.name} saved successfully!`);
      setIsNew(false);
      await loadMonsters();
    } else {
      showStatus('error', res.error || 'Failed to save monster.');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Permanently delete monster "${slug}"?`)) return;
    setLoading(true);
    const res = await deleteCreatureDef(slug);
    setLoading(false);

    if (res.success) {
      showStatus('success', 'Monster deleted.');
      if (selected?.slug === slug) {
        setSelected(null);
        setIsNew(false);
        setViewState('gallery');
      }
      await loadMonsters();
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
    });
    setIsNew(true);
    showStatus('success', 'Cloned monster into new draft. Make changes and Save.');
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
    parsed.worldModel = val;
    f('spriteOverworld', JSON.stringify(parsed));
  };

  const getModularAttachments = (): ModelWardrobeItem[] => {
    try {
      const parsed = JSON.parse(form.spriteOverworld || '{}');
      if (Array.isArray(parsed.modularAttachments)) return parsed.modularAttachments;
      return Array.isArray(parsed.worldModel?.modularAttachments) ? parsed.worldModel.modularAttachments : [];
    } catch {
      return [];
    }
  };

  const handleModularAttachmentsChange = (items: ModelWardrobeItem[]) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(form.spriteOverworld || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
    } catch {}
    parsed.modularAttachments = items;
    if (parsed.worldModel && Array.isArray(parsed.worldModel.modularAttachments)) {
      parsed.worldModel = { ...parsed.worldModel, modularAttachments: items };
    }
    f('spriteOverworld', JSON.stringify(parsed));
  };

  // Live validation markers
  const isSlugValid = Boolean(form.slug && /^[a-z0-9_]+$/.test(form.slug));
  const isVisualValid = Boolean(form.spriteOverworld);
  const isStatsValid = form.baseHp > 0 && form.physicalPower > 0;

  const filteredMonsters = monsters.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.slug.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (stageFilter === 'ALL') return true;
    return m.stage === stageFilter;
  });

  // ─── GALLERY VIEW ──────────────────────────────────────────────────────────
  if (viewState === 'gallery') {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#050b14] relative">
        {/* Gallery Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20 shrink-0">
          <div>
            <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-rose-300 to-amber-400 flex items-center gap-2">
              <Skull className="text-red-500" size={20} />
              Monster Registry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Real-time action combat enemies, dungeon encounters, and hostile world bosses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadMonsters()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-red-400' : ''} />
            </button>
            <button
              onClick={handleNew}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} /> Create Monster
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Filter Chips */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-[#07111c]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-red-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search monsters by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#050b14] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setStageFilter('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border",
                stageFilter === 'ALL'
                  ? "bg-red-600/30 border-red-500 text-red-300"
                  : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              All Monsters ({monsters.length})
            </button>
            {MONSTER_STAGES.map((st) => (
              <button
                key={st.id}
                onClick={() => setStageFilter(st.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border",
                  stageFilter === st.id
                    ? "bg-red-600/30 border-red-500 text-red-300"
                    : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                {st.label}
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
          {filteredMonsters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 my-16">
              <Skull size={48} className="opacity-20" />
              <p className="text-sm font-bold">No monsters found matching your filters.</p>
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow"
              >
                + Create Monster Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {filteredMonsters.map((monster) => {
                let parsed: any = {};
                try { parsed = JSON.parse(monster.spriteOverworld || '{}'); } catch {}
                const is3D = parsed.worldModel?.type === '3D Model' || parsed.type === '3D Model' || !monster.spriteOverworld.includes('.png');

                return (
                  <div
                    key={monster.slug}
                    onClick={() => handleSelectMonster(monster)}
                    className="group relative bg-[#0a101b]/80 border border-slate-800/80 hover:border-red-500/50 rounded-2xl p-5 cursor-pointer overflow-hidden backdrop-blur-xl transition-all duration-300 flex flex-col hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)] hover:-translate-y-1"
                  >
                    {/* Delete action overlay */}
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(monster.slug); }}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-red-950/80 text-red-400 hover:text-red-300 backdrop-blur-md transition-colors"
                        title="Delete Monster"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Visual Preview */}
                    <div className="flex justify-center items-center h-28 mb-4 relative z-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent rounded-xl" />
                      {is3D ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 z-10">
                          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <Cuboid size={24} />
                          </div>
                          <span className="text-[9px] font-bold text-red-400/80 uppercase tracking-widest truncate max-w-[100px]">
                            {parsed.worldModel?.assetId || '3D Model'}
                          </span>
                        </div>
                      ) : (
                        <CharacterSpritePreview
                          assetProfileId={monster.spriteOverworld}
                          size={48}
                          scale={1.8}
                        />
                      )}
                    </div>

                    {/* Monster Info */}
                    <div className="text-center flex-1 flex flex-col">
                      <h3 className="text-sm font-black text-white truncate mb-0.5 group-hover:text-red-300 transition-colors">
                        {monster.name}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-mono truncate mb-2">
                        {monster.slug}
                      </div>

                      {/* Rank & Element Badges */}
                      <div className="flex items-center justify-center gap-1.5 mb-3 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded text-[8.5px] font-bold uppercase",
                          monster.stage === 'World Boss' ? "bg-red-950/80 text-red-300 border border-red-800" :
                          monster.stage === 'Dungeon Boss' ? "bg-purple-950/80 text-purple-300 border border-purple-800" :
                          monster.stage === 'Elite' ? "bg-amber-950/80 text-amber-300 border border-amber-800" :
                          "bg-slate-800 text-slate-300 border border-slate-700"
                        )}>
                          {monster.stage || 'Minion'}
                        </span>
                        {monster.typePrimary && monster.typePrimary !== 'None' && monster.typePrimary !== 'none' && (
                          <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60">
                            {monster.typePrimary}
                          </span>
                        )}
                      </div>

                      {/* Combat Stats Line */}
                      <div className="grid grid-cols-2 gap-1 text-[9.5px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg border border-slate-800/60 mt-auto">
                        <div>HP: <strong className="text-white">{monster.baseHp}</strong></div>
                        <div>ATK: <strong className="text-red-400">{monster.physicalPower}</strong></div>
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
            title="Back to Monster List"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white">{isNew ? 'Create Monster' : form.name}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isNew ? 'Drafting a new action-combat monster template' : `Editing monster definition: ${form.slug}`}
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
              {isStatsValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} Combat Stats
            </div>
          </div>

          {!isNew && (
            <button
              onClick={handleDuplicate}
              className="px-3 py-2 rounded-lg text-xs font-bold text-red-300 hover:bg-red-500/10 border border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
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
            className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer"
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save Monster'}
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
          {/* LEFT COLUMN: Identity & Combat Stats (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Box 1: Core Monster Identity & Threat */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-red-500/10 pb-3">
                <Skull className="text-red-500/80" size={16} />
                <h3 className="text-xs font-black text-red-400/80 uppercase tracking-widest">Monster Identity</h3>
              </div>

              <div>
                <label className={labelCls}>Monster Name</label>
                <input
                  value={form.name}
                  onChange={(e) => f('name', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Shadowclaw Behemoth"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>System Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => f('slug', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className={inputCls}
                    placeholder="e.g. monster_shadowclaw"
                    disabled={!isNew}
                    style={{ opacity: isNew ? 1 : 0.6 }}
                  />
                </div>
                <div>
                  <label className={labelCls}>Combat Threat Level</label>
                  <input
                    type="number"
                    value={form.starterLevel || 1}
                    onChange={(e) => f('starterLevel', Number(e.target.value))}
                    className={inputCls}
                    min={1}
                    max={120}
                  />
                </div>
              </div>

              {/* Combat Rank Selector */}
              <div>
                <label className={labelCls}>Combat Classification</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MONSTER_STAGES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => f('stage', st.id)}
                      className={cn(
                        "p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                        form.stage === st.id
                          ? "bg-red-500/20 border-red-500/60 text-red-300 shadow-sm"
                          : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <span className="text-xs font-bold">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Element Type Affinity */}
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
                <label className={labelCls}>Lore & Encounter Description</label>
                <textarea
                  value={form.flavor || ''}
                  onChange={(e) => f('flavor', e.target.value)}
                  className={cn(inputCls, "resize-none h-20")}
                  placeholder="A ferocious predator stalking the dark caverns..."
                  maxLength={180}
                />
              </div>
            </div>

            {/* Box 2: Action Combat Stats */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between border-b border-red-500/10 pb-3">
                <div className="flex items-center gap-2">
                  <Swords className="text-red-400/80" size={16} />
                  <h3 className="text-xs font-black text-red-400/80 uppercase tracking-widest">Real-Time Action Stats</h3>
                </div>
                <span className="text-[10px] font-mono text-red-400">
                  Total Rating: {form.baseHp + form.physicalPower + form.physicalDefense + form.abilityPower + form.abilityDefense}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'baseHp', label: 'Base HP', icon: Flame, color: 'text-emerald-400' },
                  { key: 'physicalPower', label: 'Physical ATK', icon: Swords, color: 'text-red-400' },
                  { key: 'physicalDefense', label: 'Physical DEF', icon: Shield, color: 'text-blue-400' },
                  { key: 'abilityPower', label: 'Ability ATK', icon: Zap, color: 'text-purple-400' },
                  { key: 'abilityDefense', label: 'Ability DEF', icon: Shield, color: 'text-indigo-400' },
                  { key: 'combatTempo', label: 'Combat Tempo', icon: Clock, color: 'text-amber-400' },
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
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Box 3: Aggro & Behavior */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-red-500/10 pb-3">
                <Target className="text-red-400/80" size={16} />
                <h3 className="text-xs font-black text-red-400/80 uppercase tracking-widest">Aggro & Encounter Rules</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Aggro Radius (Tiles)</label>
                  <input
                    type="number"
                    value={form.aggroRadius ?? 8}
                    onChange={(e) => f('aggroRadius', Number(e.target.value))}
                    className={inputCls}
                    min={1}
                    max={64}
                  />
                </div>
                <div>
                  <label className={labelCls}>Respawn Time (Seconds)</label>
                  <input
                    type="number"
                    value={form.respawnSec ?? 60}
                    onChange={(e) => f('respawnSec', Number(e.target.value))}
                    className={inputCls}
                    min={5}
                    max={86400}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3D Visual Selector & Engine Rules (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Box 4: Asset Selector & Live 3D Preview */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-3">
                <Cuboid className="text-cyan-400/80" size={16} />
                <h3 className="text-xs font-black text-cyan-400/80 uppercase tracking-widest">3D Model & Equipment</h3>
              </div>

              {/* Live 3D Canvas Preview */}
              {getWorldModel().type === '3D Model' && getWorldModel().assetId && (
                <div className="pb-2">
                  <ArchetypeModelPreview3D
                    baseAssetId={getWorldModel().assetId}
                    modelScale={getWorldModel().scale ?? 0.8}
                    modularAttachments={getModularAttachments()
                      .filter((attachment) => attachment.defaultVisible !== false)
                      .map((attachment) => ({
                        ...attachment,
                        type: attachment.type === '3D Sprite' ? '3D Model' : attachment.type || '3D Model',
                      }))}
                    className="h-80"
                    disableBackground={true}
                    hideToolbar={true}
                  />
                </div>
              )}

              <WorldModelSelector
                value={getWorldModel()}
                onChange={handleWorldModelChange}
                label="Monster World Model"
                allowSocketConfig={true}
                assetPickerFilterType="CREATURE"
                assetPickerCategoryFilter="CREATURES"
              />

              {getWorldModel().type === '3D Model' && (
                <ModelWardrobeEditor
                  modelAssetId={getWorldModel().assetId}
                  value={getModularAttachments()}
                  onChange={handleModularAttachmentsChange}
                  title="Monster Weapon & Armor Sockets"
                />
              )}
            </div>

            {/* Box 5: Spawning Rules & Live Status */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-red-500/10 pb-3">
                <Sparkles className="text-red-400/80" size={16} />
                <h3 className="text-xs font-black text-red-400/80 uppercase tracking-widest">Spawning & Live Status</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Difficulty Tag</label>
                  <input
                    value={form.tag || 'Monster'}
                    onChange={(e) => f('tag', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Monster"
                  />
                </div>
                <div>
                  <label className={labelCls}>Tag Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form.tagColor || '#ef4444'}
                      onChange={(e) => f('tagColor', e.target.value)}
                      className="h-9 w-12 rounded cursor-pointer border border-slate-800 bg-black"
                    />
                    <div
                      className="flex-1 rounded flex items-center justify-center text-xs font-bold uppercase tracking-wider"
                      style={{ background: `${form.tagColor || '#ef4444'}15`, color: form.tagColor || '#ef4444', border: `1px solid ${form.tagColor || '#ef4444'}40` }}
                    >
                      {form.stage || 'Monster'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2">
                <button
                  type="button"
                  onClick={() => f('isWildSpawn', !form.isWildSpawn)}
                  className={cn(
                    "w-full flex justify-between items-center px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                    form.isWildSpawn
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-black/40 border-slate-800 text-slate-400"
                  )}
                >
                  <span>Wild Open-World Spawner Eligible</span>
                  <span className="text-[10px] font-mono">{form.isWildSpawn ? 'ENABLED' : 'MANUAL ONLY'}</span>
                </button>

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
    </div>
  );
}
