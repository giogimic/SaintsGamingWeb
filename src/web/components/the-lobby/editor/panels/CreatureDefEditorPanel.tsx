'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAllCreatureDefs,
  upsertCreatureDef,
  deleteCreatureDef,
  toggleCreatureDefActive,
  importCreatureDefsJson,
} from '@/app/actions/game/creature-defs';
import {
  CREATURE_ELEMENT_TYPES,
  CREATURE_ASSET_OPTIONS,
  CREATURE_CATEGORIES,
  CreatureCategory,
  CreatureDefData,
  CreaturePassive,
  emptyCreatureDef,
  creatureAssetUrl,
} from '@/shared/game/creatureCatalog';
import {
  Plus, Trash2, Save, RefreshCw, Eye, EyeOff, Database, FileJson, CheckCircle2, AlertCircle, Coins, ExternalLink, Filter, PawPrint, Skull, Shield, Wand2,
} from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';
import { RegistryCombobox } from '../components/RegistryCombobox';
import { DroppableAssetInput } from '../components/DroppableAssetInput';
import { useCreatureDefs } from '@/web/hooks/studio-data';

const inputCls =
  'w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-[11px] text-foreground font-mono outline-none focus:border-sg-gold transition-colors';
const labelCls = 'block text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-1';

function creatureResourceKey(form: CreatureDefData, isNew: boolean): string {
  if (isNew || !form.slug) return 'creature:new';
  return `creature:${form.slug}`;
}

function isCreatureForm(value: unknown): value is CreatureDefData {
  return Boolean(value && typeof value === 'object' && 'slug' in value && 'name' in value);
}

export function CreatureDefEditorPanel() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const { creatureDefs: list, isLoading, mutateCreatureDefs } = useCreatureDefs(activeGameId);
  
  const [categoryFilter, setCategoryFilter] = useState<'all' | CreatureCategory>('all');
  const [form, setForm] = useState<CreatureDefData>({ ...emptyCreatureDef(), gameId: activeGameId });
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [lootTables, setLootTables] = useState<Array<{ id: string; name: string }>>([]);
  const [abilitiesList, setAbilitiesList] = useState<Array<{ slug: string; name: string }>>([]);
  const isNewRef = useRef(isNew);
  isNewRef.current = isNew;

  const resourceKey = creatureResourceKey(form, isNew);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
    clearDefinitionStackFor,
  } = useDefinitionFormHistory<CreatureDefData>(resourceKey);

  syncFormRef(form);

  const load = useCallback(async () => {
    try {
      const lootRes = await fetch(`/api/loot/tables?gameId=${encodeURIComponent(activeGameId)}`);
      const lootData = await lootRes.json();
      if (lootRes.ok && lootData.items) {
        setLootTables(lootData.items.map((t: any) => ({ id: t.id, name: t.name })));
      }
      
      const abilityRes = await fetch('/api/studio/abilities');
      const abilityData = await abilityRes.json();
      if (abilityData.success) {
        setAbilitiesList(abilityData.data.map((a: any) => ({ slug: a.slug, name: a.name })));
      }
    } catch {
      // fallback
    }
  }, [activeGameId]);

  useEffect(() => {
    void load();
    clearDefinitionStackFor('creature:new');
    setForm({ ...emptyCreatureDef(), gameId: activeGameId });
    setIsNew(false);
  }, [load, activeGameId, clearDefinitionStackFor]);

  const addLootRef = () => {
    const firstTable = lootTables[0]?.id || 'default_loot';
    const serapht = {
      ...form,
      lootTableRefs: [...(form.lootTableRefs || []), { tableId: firstTable, label: 'normal' }],
    };
    commitStructural(serapht);
    setForm(serapht);
  };

  const updateLootRef = (idx: number, patch: { tableId?: string; label?: string }) => {
    const seraphtRefs = [...(form.lootTableRefs || [])];
    if (seraphtRefs[idx]) {
      seraphtRefs[idx] = { ...seraphtRefs[idx], ...patch };
      const serapht = { ...form, lootTableRefs: seraphtRefs };
      commitStructural(serapht);
      setForm(serapht);
    }
  };

  const removeLootRef = (idx: number) => {
    const serapht = { ...form, lootTableRefs: form.lootTableRefs!.filter((_, i) => i !== idx) };
    commitStructural(serapht);
    setForm(serapht);
  };

  const addAbilitySlot = () => {
    const firstAbility = abilitiesList[0]?.slug || 'strike';
    const serapht = {
      ...form,
      abilities: [...(form.abilities || []), { abilitySlug: firstAbility, currentCooldown: 0 }],
    };
    commitStructural(serapht);
    setForm(serapht);
  };

  const updateAbilitySlot = (idx: number, updates: any) => {
    const arr = [...(form.abilities || [])];
    arr[idx] = { ...arr[idx], ...updates };
    const serapht = { ...form, abilities: arr };
    commitStructural(serapht);
    setForm(serapht);
  };

  const removeAbilitySlot = (idx: number) => {
    const serapht = { ...form, abilities: (form.abilities || []).filter((_, i) => i !== idx) };
    commitStructural(serapht);
    setForm(serapht);
  };

  const handleOpenLootTable = (tableId: string) => {
    useEditorStore.getState().openPanel('loot');
    useGameStore.getState().showToast(`Opened Loot Editor for ${tableId}`);
  };

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const f = <K extends keyof CreatureDefData>(key: K, value: CreatureDefData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSelect = (c: CreatureDefData) => {
    clearDefinitionStackFor(creatureResourceKey(form, isNewRef.current));
    setForm({ ...c });
    setIsNew(false);
  };

  const handleNew = () => {
    clearDefinitionStackFor(creatureResourceKey(form, isNewRef.current));
    setForm({ ...emptyCreatureDef(), gameId: activeGameId, sortOrder: list.length + 1 });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.name || !form.spriteOverworld) {
      showStatus('error', 'Slug, name, and overworld sprite required.');
      return;
    }
    setLoading(true);
    
    // Optimistic Update
    const newForm = { ...form, gameId: form.gameId ?? activeGameId };
    if (isNew) {
      mutateCreatureDefs([...list, newForm as CreatureDefData], false);
    } else {
      mutateCreatureDefs(list.map(c => c.slug === form.slug ? newForm : c), false);
    }

    const res = await upsertCreatureDef(newForm);
    setLoading(false);
    
    if (res.success) {
      showStatus('success', `${form.name} saved.`);
      clearDefinitionStackFor(creatureResourceKey(form, isNew));
      setIsNew(false);
      mutateCreatureDefs(); // Revalidate
    } else {
      mutateCreatureDefs(); // Rollback
      showStatus('error', res.error || 'Save failed');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete ${slug}?`)) return;
    
    // Optimistic Update
    mutateCreatureDefs(list.filter(c => c.slug !== slug), false);
    
    const res = await deleteCreatureDef(slug);
    if (res.success) {
      showStatus('success', 'Deleted.');
      mutateCreatureDefs(); // Revalidate
      if (form.slug === slug) {
        clearDefinitionStackFor(creatureResourceKey(form, false));
        setForm(emptyCreatureDef());
        setIsNew(false);
      }
    } else {
      mutateCreatureDefs(); // Rollback
      showStatus('error', res.error || 'Delete failed');
    }
  };

  const updatePassive = (idx: number, patch: Partial<CreaturePassive>, structural = false) => {
    const passives = form.passives.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    if (patch.isDefault) {
      for (let i = 0; i < passives.length; i++) passives[i].isDefault = i === idx;
    }
    const serapht = { ...form, passives };
    if (structural) commitStructural(serapht);
    setForm(serapht);
  };

  const addPassive = () => {
    const serapht: CreatureDefData = {
      ...form,
      passives: [
        ...form.passives,
        {
          id: `passive_${form.passives.length + 1}`,
          name: 'New Passive',
          description: '',
          isDefault: form.passives.length === 0,
        },
      ],
    };
    commitStructural(serapht);
    setForm(serapht);
  };

  const setSpriteKey = (kind: 'overworld' | 'battle', key: string) => {
    const serapht: CreatureDefData =
      kind === 'overworld'
        ? { ...form, spriteOverworld: key }
        : { ...form, spriteBattle: key };
    commitStructural(serapht);
    setForm(serapht);
  };

  const assets = CREATURE_ASSET_OPTIONS.filter(
    (a) => !assetFilter || a.key.includes(assetFilter.toLowerCase()) || a.label.toLowerCase().includes(assetFilter.toLowerCase())
  );

  return (
    <CatalogEditorShell
      title="Creature Catalog"
      blurb={`${list.length} defs · world ${activeGameId} · GameAsset + CreatureDef SoT · definition undo on blur`}
      dirty={isNew || canUndoDefinition}
      canUndoDefinition={canUndoDefinition}
      canRedoDefinition={canRedoDefinition}
      onUndoDefinition={() =>
        applyHistory('undo', (value) => {
          if (isCreatureForm(value)) setForm(value);
        })
      }
      onRedoDefinition={() =>
        applyHistory('redo', (value) => {
          if (isCreatureForm(value)) setForm(value);
        })
      }
      toolbar={
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setShowJson((v) => !v)} className="flex items-center gap-1 rounded border border-[#806f47]/30 bg-transparent px-2 py-1 text-slate-300">
            <FileJson size={10} /> JSON
          </button>
          <button type="button" onClick={handleNew} className="flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-white">
            <Plus size={10} /> New
          </button>
          <button type="button" onClick={() => void load()} className="rounded border border-[#806f47]/30 p-1 text-slate-400">
            <RefreshCw size={12} />
          </button>
        </div>
      }
      list={
        <div className="space-y-1">
          {/* Category Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-black/50/40 border-b border-slate-900 text-[9px] font-mono">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`py-1 rounded text-center transition-all ${
                categoryFilter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('beast')}
              className={`py-1 rounded text-center transition-all ${
                categoryFilter === 'beast'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Beasts
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('monster')}
              className={`py-1 rounded text-center transition-all ${
                categoryFilter === 'monster'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monsters
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('mercenary')}
              className={`py-1 rounded text-center transition-all ${
                categoryFilter === 'mercenary'
                  ? 'bg-violet-500/20 text-violet-300 font-bold border border-violet-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mercs
            </button>
          </div>

          <div className="space-y-0.5">
            {list
              .filter((c) => categoryFilter === 'all' || (c.category || 'beast') === categoryFilter)
              .map((c) => (
                <div
                  key={c.slug}
                  onClick={() => handleSelect(c)}
                  className={`cursor-pointer border-b border-slate-900 p-2 hover:bg-emerald-950/30 ${
                    form.slug === c.slug ? 'bg-emerald-950/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-serapht-line @serapht/serapht/no-img-element */}
                    <img src={creatureAssetUrl(c.spriteOverworld)} alt="" className="h-6 w-6 object-contain" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[10px] text-slate-200 flex items-center gap-1.5">
                        <span>{c.name}</span>
                        <span className="text-[8px] uppercase tracking-wider px-1 rounded bg-black/50/20 text-slate-400 border border-[#806f47]/20">
                          {c.category || 'beast'}
                        </span>
                      </div>
                      <div className="truncate text-[9px] text-slate-500">
                        {c.typePrimary}
                        {c.typeSecondary !== 'None' ? `/${c.typeSecondary}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-emerald-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleCreatureDefActive(c.slug, !c.isActive).then(load);
                      }}
                    >
                      {c.isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(c.slug);
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            {list.filter((c) => categoryFilter === 'all' || (c.category || 'beast') === categoryFilter).length === 0 && (
              <p className="p-2 text-[10px] text-slate-500">No definitions found for this filter.</p>
            )}
          </div>
        </div>
      }
    >
      {status && (
        <div className={`mb-2 flex items-center gap-1 px-1 text-[10px] ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {status.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {status.msg}
        </div>
      )}

      {showJson && (
        <div className="mb-3 space-y-2 border-b border-[#806f47]/20 pb-3">
          <textarea
            className={`${inputCls} h-24`}
            placeholder="Paste CreatureDef JSON array…"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-emerald-700 px-3 py-1.5 font-bold text-white"
            onClick={async () => {
              setLoading(true);
              const res = await importCreatureDefsJson(jsonInput);
              setLoading(false);
              if (res.success) {
                showStatus('success', `Imported ${res.count}`);
                setShowJson(false);
                await load();
              } else showStatus('error', res.error || 'Import failed');
            }}
          >
            Import
          </button>
          <button
            type="button"
            className="ml-2 rounded border border-slate-600 px-3 py-1.5 text-slate-300"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(emptyCreatureDef(), null, 2));
              showStatus('success', 'Copied seed JSON');
            }}
          >
            Copy seed JSON
          </button>
        </div>
      )}

      <div className="space-y-3 pr-1">
          {(isNew || form.slug) && (
            <>
              {/* Category & Identity */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div>
                  <label className={labelCls}>Taxonomy Category</label>
                  <select
                    className={inputCls}
                    value={form.category || 'beast'}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => {
                      const seraphtCat = e.target.value as CreatureCategory;
                      const serapht = { ...form, category: seraphtCat };
                      commitStructural(serapht);
                      setForm(serapht);
                    }}
                  >
                    {CREATURE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Profile (gameId)</label>
                  <input
                    className={inputCls}
                    value={form.gameId ?? ''}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('gameId', e.target.value || null)}
                    placeholder="saints / custom / empty=shared"
                  />
                </div>
              </div>

              {/* Monster Specific Controls */}
              {form.category === 'monster' && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5">
                  <div>
                    <label className={labelCls + ' text-rose-300'}>Aggro Radius (Tiles)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={form.aggroRadius ?? 5}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('aggroRadius', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls + ' text-rose-300'}>Respawn Timer (Sec)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={form.respawnSec ?? 30}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('respawnSec', Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Mercenary Specific Controls */}
              {form.category === 'mercenary' && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-violet-500/30 bg-violet-500/5">
                  <div>
                    <label className={labelCls + ' text-violet-300'}>Hire Cost (Gold)</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={form.hireCost ?? 100}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('hireCost', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls + ' text-violet-300'}>Faction / Guild ID</label>
                    <input
                      className={inputCls}
                      value={form.factionId || ''}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('factionId', e.target.value || undefined)}
                      placeholder="e.g. iron_vanguard"
                    />
                  </div>
                </div>
              )}

              {/* Beast Specific Controls */}
              {(!form.category || form.category === 'beast') && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <div>
                    <label className={labelCls + ' text-emerald-300'}>Dex Number</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={form.dexNumber || 0}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('dexNumber', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className={labelCls + ' text-emerald-300'}>Catch Rate (Multiplier)</label>
                    <input
                      type="number"
                      step="0.1"
                      className={inputCls}
                      value={form.catchRate ?? 1}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('catchRate', Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Slug</label>
                  <input
                    className={inputCls}
                    value={form.slug}
                    disabled={!isNew}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    className={inputCls}
                    value={form.name}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Type Primary</label>
                  <select
                    className={inputCls}
                    value={form.typePrimary}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('typePrimary', e.target.value)}
                  >
                    {CREATURE_ELEMENT_TYPES.filter((t) => t !== 'None').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Type Secondary</label>
                  <select
                    className={inputCls}
                    value={form.typeSecondary}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('typeSecondary', e.target.value)}
                  >
                    {CREATURE_ELEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Overworld / card sprite</label>
                <DroppableAssetInput
                  className={inputCls + ' mb-1'}
                  value={form.spriteOverworld}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) => f('spriteOverworld', e.target.value)}
                  onAssetDropped={(key) => f('spriteOverworld', key)}
                />
                <label className={labelCls}>Battle sprite</label>
                <DroppableAssetInput
                  className={inputCls + ' mb-1'}
                  value={form.spriteBattle || ''}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) => f('spriteBattle', e.target.value)}
                  onAssetDropped={(key) => f('spriteBattle', key)}
                />
                <input
                  className={inputCls + ' mb-1'}
                  placeholder="Filter assets…"
                  value={assetFilter}
                  onChange={(e) => setAssetFilter(e.target.value)}
                />
                <div className="grid grid-cols-4 gap-1 max-h-28 overflow-y-auto">
                  {assets.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setSpriteKey(a.kind === 'overworld' ? 'overworld' : 'battle', a.key)}
                      className="border border-[#806f47]/20 rounded p-1 hover:border-emerald-600 bg-black/50/40"
                      title={a.label}
                    >
                      <img src={creatureAssetUrl(a.key)} alt={a.key} className="w-full h-10 object-contain pixelated" />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <img src={creatureAssetUrl(form.spriteOverworld)} className="w-16 h-16 object-contain bg-black/50/50 rounded border border-[#806f47]/20" alt="ow" />
                  <img src={creatureAssetUrl(form.spriteBattle || form.spriteOverworld)} className="w-16 h-16 object-contain bg-black/50/50 rounded border border-[#806f47]/20" alt="bt" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Stats</label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['baseHp', 'HP'],
                      ['physicalPower', 'Phys Pwr'],
                      ['physicalDefense', 'Phys Def'],
                      ['abilityPower', 'Ability Pwr'],
                      ['abilityDefense', 'Ability Def'],
                      ['combatTempo', 'Tempo'],
                      ['catchRate', 'Catch'],
                      ['starterLevel', 'Level'],
                      ['dexNumber', 'Dex #'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <span className="text-[8px] text-slate-500">{label}</span>
                      <input
                        type="number"
                        className={inputCls}
                        value={form[key] as number}
                        onFocus={onFieldFocus}
                        onBlur={onFieldBlur}
                        onChange={(e) => f(key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>

                {/* Visual Stat Breakdown & BST (Phase 8 Track E5) */}
                <div className="mt-2.5 p-2 rounded bg-black/50/50 border border-[#806f47]/20 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span className="uppercase tracking-wider">Stat Distribution</span>
                    <span className="text-amber-300 font-mono">
                      BST: {(form.baseHp || 0) + (form.physicalPower || 0) + (form.physicalDefense || 0) + (form.abilityPower || 0) + (form.abilityDefense || 0) + (form.combatTempo || 0)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { label: 'HP', val: form.baseHp || 0, max: 200, color: 'bg-emerald-500' },
                      { label: 'Atk', val: form.physicalPower || 0, max: 200, color: 'bg-rose-500' },
                      { label: 'Def', val: form.physicalDefense || 0, max: 200, color: 'bg-blue-500' },
                      { label: 'SpA', val: form.abilityPower || 0, max: 200, color: 'bg-purple-500' },
                      { label: 'SpD', val: form.abilityDefense || 0, max: 200, color: 'bg-cyan-500' },
                      { label: 'Spe', val: form.combatTempo || 0, max: 200, color: 'bg-amber-500' },
                    ].map((st) => (
                      <div key={st.label} className="flex items-center gap-2 text-[8px] font-mono">
                        <span className="w-6 text-slate-400 font-bold">{st.label}</span>
                        <div className="flex-1 h-1.5 bg-transparent rounded-full overflow-hidden border border-[#806f47]/20">
                          <div
                            className={`h-full ${st.color} rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(100, Math.round((st.val / st.max) * 100))}%` }}
                          />
                        </div>
                        <span className="w-7 text-right text-slate-200 font-bold">{st.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={labelCls + ' mb-0'}>Passives (default + potential)</label>
                  <button type="button" onClick={addPassive} className="text-emerald-400 text-[9px]">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.passives.map((p, idx) => (
                    <div key={idx} className="border border-[#806f47]/20 rounded p-2 space-y-1">
                      <div className="flex gap-1 items-center">
                        <input
                          className={inputCls}
                          value={p.id}
                          onFocus={onFieldFocus}
                          onBlur={onFieldBlur}
                          onChange={(e) => updatePassive(idx, { id: e.target.value })}
                          placeholder="id"
                        />
                        <input
                          className={inputCls}
                          value={p.name}
                          onFocus={onFieldFocus}
                          onBlur={onFieldBlur}
                          onChange={(e) => updatePassive(idx, { name: e.target.value })}
                          placeholder="name"
                        />
                        <label className="flex items-center gap-1 text-[9px] text-slate-400 shrink-0">
                          <input
                            type="checkbox"
                            checked={!!p.isDefault}
                            onChange={(e) => updatePassive(idx, { isDefault: e.target.checked }, true)}
                          />
                          Default
                        </label>
                      </div>
                      <textarea
                        className={inputCls}
                        rows={2}
                        value={p.description}
                        onFocus={onFieldFocus}
                        onBlur={onFieldBlur}
                        onChange={(e) => updatePassive(idx, { description: e.target.value })}
                        placeholder="Description"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className={labelCls}>World skill name</label>
                  <input
                    className={inputCls}
                    value={form.worldSkillName}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('worldSkillName', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>World skill description</label>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={form.worldSkillDescription}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('worldSkillDescription', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Flavor</label>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={form.flavor}
                    onFocus={onFieldFocus}
                    onBlur={onFieldBlur}
                    onChange={(e) => f('flavor', e.target.value)}
                  />
                </div>
              </div>

              {/* Loot Drop Tables Section (Phase 8 Track B4) */}
              <div className="p-2.5 rounded border border-amber-500/30 bg-[#050b14]/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#cbb26a] uppercase tracking-wider">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Loot Drop Tables</span>
                  </div>
                  <button
                    type="button"
                    onClick={addLootRef}
                    className="flex items-center gap-1 text-[9px] text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Add Loot Table</span>
                  </button>
                </div>

                {(!form.lootTableRefs || form.lootTableRefs.length === 0) ? (
                  <p className="text-[10px] text-slate-500 italic py-1">No loot tables attached to this creature.</p>
                ) : (
                  <div className="space-y-1.5">
                    {form.lootTableRefs.map((ref, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-black/50/40 border border-[#806f47]/20 rounded p-1.5 text-[11px]">
                        <select
                          value={ref.label || 'normal'}
                          onChange={(e) => updateLootRef(idx, { label: e.target.value })}
                          className="bg-[#111a2a] border border-[#806f47]/30 rounded px-1.5 py-1 text-[10px] text-amber-300 font-bold outline-none cursor-pointer"
                        >
                          <option value="normal">Normal</option>
                          <option value="rare">Rare Drop</option>
                          <option value="boss">Boss Drop</option>
                          <option value="gather">Gather</option>
                        </select>

                        {lootTables.length > 0 ? (
                          <RegistryCombobox
                            value={ref.tableId}
                            onChange={(val) => updateLootRef(idx, { tableId: val })}
                            options={lootTables.map(t => ({ value: t.id, label: `${t.name} (${t.id})` }))}
                            className="flex-1"
                          />
                        ) : (
                          <input
                            type="text"
                            value={ref.tableId}
                            onChange={(e) => updateLootRef(idx, { tableId: e.target.value })}
                            placeholder="table_id"
                            className="flex-1 bg-[#111a2a] border border-[#806f47]/30 rounded px-2 py-1 text-[10px] text-slate-200 outline-none"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenLootTable(ref.tableId)}
                          className="flex items-center gap-1 text-[9px] text-amber-400 hover:text-amber-300 transition-colors bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded cursor-pointer shrink-0"
                          title="Open in Loot Manager"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>View Loot →</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeLootRef(idx)}
                          className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer shrink-0"
                          title="Remove table reference"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Abilities Section */}
              <div className="p-2.5 rounded border border-fuchsia-500/30 bg-[#050b14]/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider">
                    <Wand2 className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Creature Abilities</span>
                  </div>
                  <button
                    type="button"
                    onClick={addAbilitySlot}
                    className="flex items-center gap-1 text-[9px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors bg-fuchsia-950/40 border border-fuchsia-800/40 px-2 py-0.5 rounded cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Add Ability</span>
                  </button>
                </div>

                {(!form.abilities || form.abilities.length === 0) ? (
                  <p className="text-[10px] text-slate-500 italic py-1">No abilities attached to this creature. (Consider adding elements to get suggestions in Ability Studio)</p>
                ) : (
                  <div className="space-y-1.5">
                    {form.abilities.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-black/50/40 border border-fuchsia-900/40 rounded p-1.5 text-[11px]">
                        {abilitiesList.length > 0 ? (
                          <RegistryCombobox
                            value={slot.abilitySlug}
                            onChange={(val) => updateAbilitySlot(idx, { abilitySlug: val })}
                            options={abilitiesList.map(a => ({ value: a.slug, label: `${a.name} (${a.slug})` }))}
                            className="flex-1"
                          />
                        ) : (
                          <input
                            type="text"
                            value={slot.abilitySlug}
                            onChange={(e) => updateAbilitySlot(idx, { abilitySlug: e.target.value })}
                            placeholder="ability_slug"
                            className="flex-1 bg-[#111a2a] border border-fuchsia-900/40 rounded px-2 py-1 text-[10px] text-slate-200 outline-none"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => { useEditorStore.getState().openPanel('abilities'); }}
                          className="flex items-center gap-1 text-[9px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors bg-fuchsia-950/40 border border-fuchsia-800/40 px-2 py-1 rounded cursor-pointer shrink-0"
                          title="Open in Ability Studio"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>View Ability →</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeAbilitySlot(idx)}
                          className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer shrink-0"
                          title="Remove ability"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-2 rounded border border-[#806f47]/30 bg-[#050b14]/60 space-y-2">
                <div className="text-[10px] font-bold text-[#cbb26a] uppercase tracking-wider">Shiny variant</div>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="flex items-center gap-1 text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.shinyEnabled !== false}
                      onChange={(e) => {
                        const serapht = { ...form, shinyEnabled: e.target.checked };
                        commitStructural(serapht);
                        setForm(serapht);
                      }}
                    />{' '}
                    Shinies enabled
                  </label>
                  <label className="flex items-center gap-1 text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.shinyUseGlobalChance !== false}
                      onChange={(e) => {
                        const serapht = { ...form, shinyUseGlobalChance: e.target.checked };
                        commitStructural(serapht);
                        setForm(serapht);
                      }}
                    />{' '}
                    Sync global chance
                  </label>
                </div>
                {form.shinyUseGlobalChance === false && (
                  <div>
                    <label className={labelCls}>Own shiny chance %</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      className={inputCls}
                      value={form.shinyChancePercent ?? 0.5}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('shinyChancePercent', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
                <p className="text-[10px] text-slate-500">
                  Optional shiny images — leave empty to use the default look. Tag <code className="text-[#cbb26a]">shiny</code> is applied on roll.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className={labelCls}>Shiny overworld (optional)</label>
                    <input
                      className={inputCls}
                      value={form.shinySpriteOverworld || ''}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('shinySpriteOverworld', e.target.value || null)}
                      placeholder="defaults to overworld sprite"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Shiny battle (optional)</label>
                    <input
                      className={inputCls}
                      value={form.shinySpriteBattle || ''}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('shinySpriteBattle', e.target.value || null)}
                      placeholder="defaults to battle sprite"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Shiny back (optional)</label>
                    <input
                      className={inputCls}
                      value={form.shinySpriteBack || ''}
                      onFocus={onFieldFocus}
                      onBlur={onFieldBlur}
                      onChange={(e) => f('shinySpriteBack', e.target.value || null)}
                      placeholder="defaults to back sprite"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <label className="flex items-center gap-1 text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isStarter}
                    onChange={(e) => {
                      const serapht = { ...form, isStarter: e.target.checked };
                      commitStructural(serapht);
                      setForm(serapht);
                    }}
                  />{' '}
                  Starter
                </label>
                <label className="flex items-center gap-1 text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isWildSpawn}
                    onChange={(e) => {
                      const serapht = { ...form, isWildSpawn: e.target.checked };
                      commitStructural(serapht);
                      setForm(serapht);
                    }}
                  />{' '}
                  Wild spawn
                </label>
                <label className="flex items-center gap-1 text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => {
                      const serapht = { ...form, isActive: e.target.checked };
                      commitStructural(serapht);
                      setForm(serapht);
                    }}
                  />{' '}
                  Active
                </label>
                <div className="flex-1" />
                <button
                  disabled={loading}
                  onClick={() => void handleSave()}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded flex items-center gap-1"
                >
                  <Save size={12} /> {loading ? 'Saving…' : 'Save Creature'}
                </button>
              </div>
            </>
          )}
          {!isNew && !form.slug && (
            <div className="mt-10 text-center text-slate-500">Select a creature or click New / Seed.</div>
          )}
      </div>
    </CatalogEditorShell>
  );
}
