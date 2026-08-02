'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAllCreatureDefs,
  upsertCreatureDef,
  deleteCreatureDef,
  toggleCreatureDefActive,
  seedDefaultCreatureDefs,
  importCreatureDefsJson,
} from '@/app/actions/creature-defs';
import {
  CREATURE_ELEMENT_TYPES,
  CREATURE_ASSET_OPTIONS,
  CreatureDefData,
  CreaturePassive,
  emptyCreatureDef,
  creatureAssetUrl,
  FALLBACK_CREATURE_DEFS,
} from '@/shared/game/creatureCatalog';
import {
  Plus, Trash2, Save, RefreshCw, Eye, EyeOff, Database, FileJson, PawPrint, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useEditorStore } from '../editor-store';

const inputCls =
  'w-full bg-[#050b14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-emerald-700 transition-colors';
const labelCls = 'block text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1';

export function CreatureDefEditorPanel() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const [list, setList] = useState<CreatureDefData[]>([]);
  const [form, setForm] = useState<CreatureDefData>({ ...emptyCreatureDef(), gameId: activeGameId });
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [assetFilter, setAssetFilter] = useState('');

  const load = useCallback(async () => {
    const res = await getAllCreatureDefs(activeGameId);
    if (res.success) setList(res.data);
  }, [activeGameId]);

  useEffect(() => {
    void load();
    setForm({ ...emptyCreatureDef(), gameId: activeGameId });
    setIsNew(false);
  }, [load, activeGameId]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const f = <K extends keyof CreatureDefData>(key: K, value: CreatureDefData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSelect = (c: CreatureDefData) => {
    setForm({ ...c });
    setIsNew(false);
  };

  const handleNew = () => {
    setForm({ ...emptyCreatureDef(), gameId: activeGameId, sortOrder: list.length + 1 });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.name || !form.spriteOverworld) {
      showStatus('error', 'Slug, name, and overworld sprite required.');
      return;
    }
    setLoading(true);
    const res = await upsertCreatureDef({ ...form, gameId: form.gameId ?? activeGameId });
    setLoading(false);
    if (res.success) {
      showStatus('success', `${form.name} saved.`);
      setIsNew(false);
      await load();
    } else {
      showStatus('error', res.error || 'Save failed');
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    const res = await seedDefaultCreatureDefs();
    setLoading(false);
    if (res.success) {
      showStatus('success', `Seeded ${res.created} creatures.`);
      await load();
    } else showStatus('error', res.error || 'Seed failed');
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete ${slug}?`)) return;
    const res = await deleteCreatureDef(slug);
    if (res.success) {
      showStatus('success', 'Deleted.');
      await load();
      if (form.slug === slug) {
        setForm(emptyCreatureDef());
        setIsNew(false);
      }
    } else showStatus('error', res.error || 'Delete failed');
  };

  const updatePassive = (idx: number, patch: Partial<CreaturePassive>) => {
    const passives = form.passives.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    if (patch.isDefault) {
      for (let i = 0; i < passives.length; i++) passives[i].isDefault = i === idx;
    }
    f('passives', passives);
  };

  const addPassive = () => {
    f('passives', [
      ...form.passives,
      {
        id: `passive_${form.passives.length + 1}`,
        name: 'New Passive',
        description: '',
        isDefault: form.passives.length === 0,
      },
    ]);
  };

  const assets = CREATURE_ASSET_OPTIONS.filter(
    (a) => !assetFilter || a.key.includes(assetFilter.toLowerCase()) || a.label.toLowerCase().includes(assetFilter.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-[#050b14] font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <PawPrint className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-black text-emerald-300 uppercase tracking-wider text-[11px]">Creature Catalog</span>
          <span className="text-[9px] text-emerald-500/80">{list.length} defs</span>
        </div>
        <div className="flex gap-1">
          <button onClick={handleSeed} className="px-2 py-1 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-300 flex items-center gap-1" title="Seed defaults">
            <Database size={10} /> Seed
          </button>
          <button onClick={() => setShowJson((v) => !v)} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1">
            <FileJson size={10} /> JSON
          </button>
          <button onClick={handleNew} className="px-2 py-1 rounded bg-emerald-700 text-white flex items-center gap-1">
            <Plus size={10} /> New
          </button>
          <button onClick={() => void load()} className="p-1 rounded border border-slate-700 text-slate-400">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {status && (
        <div className={`px-3 py-1.5 text-[10px] flex items-center gap-1 ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {status.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {status.msg}
        </div>
      )}

      {showJson && (
        <div className="p-3 border-b border-slate-800 space-y-2">
          <textarea
            className={`${inputCls} h-24`}
            placeholder="Paste CreatureDef JSON array…"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <button
            className="px-3 py-1.5 bg-emerald-700 text-white rounded font-bold"
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
            className="ml-2 px-3 py-1.5 border border-slate-600 text-slate-300 rounded"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(FALLBACK_CREATURE_DEFS, null, 2));
              showStatus('success', 'Copied seed JSON');
            }}
          >
            Copy seed JSON
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="w-40 border-r border-slate-800 overflow-y-auto shrink-0">
          {list.map((c) => (
            <div
              key={c.slug}
              onClick={() => handleSelect(c)}
              className={`p-2 cursor-pointer border-b border-slate-900 hover:bg-emerald-950/30 ${form.slug === c.slug ? 'bg-emerald-950/50' : ''}`}
            >
              <div className="flex items-center gap-2">
                <img src={creatureAssetUrl(c.spriteOverworld)} alt="" className="w-8 h-8 object-contain pixelated bg-black/40 rounded" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-200 truncate">{c.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">
                    {c.typePrimary}
                    {c.typeSecondary !== 'None' ? `/${c.typeSecondary}` : ''}
                    {c.isStarter ? ' · S' : ''}
                    {c.isWildSpawn ? ' · W' : ''}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleCreatureDefActive(c.slug, !c.isActive).then(load);
                  }}
                  className="text-slate-500 hover:text-emerald-400"
                >
                  {c.isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(c.slug);
                  }}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="p-3 text-slate-500 text-[10px]">No DB rows — Seed or use fallback in gameplay.</div>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {(isNew || form.slug) && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Profile (gameId)</label>
                  <input
                    className={inputCls + ' mb-2'}
                    value={form.gameId ?? ''}
                    onChange={(e) => f('gameId', e.target.value || null)}
                    placeholder="tuxemon / custom_1 / empty=shared"
                  />
                  <label className={labelCls}>Slug</label>
                  <input className={inputCls} value={form.slug} disabled={!isNew} onChange={(e) => f('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
                </div>
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={form.name} onChange={(e) => f('name', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Type Primary</label>
                  <select className={inputCls} value={form.typePrimary} onChange={(e) => f('typePrimary', e.target.value)}>
                    {CREATURE_ELEMENT_TYPES.filter((t) => t !== 'None').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Type Secondary</label>
                  <select className={inputCls} value={form.typeSecondary} onChange={(e) => f('typeSecondary', e.target.value)}>
                    {CREATURE_ELEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Overworld / card sprite</label>
                <input className={inputCls + ' mb-1'} value={form.spriteOverworld} onChange={(e) => f('spriteOverworld', e.target.value)} />
                <label className={labelCls}>Battle sprite</label>
                <input className={inputCls + ' mb-1'} value={form.spriteBattle || ''} onChange={(e) => f('spriteBattle', e.target.value)} />
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
                      onClick={() => {
                        if (a.kind === 'overworld') f('spriteOverworld', a.key);
                        else f('spriteBattle', a.key);
                      }}
                      className="border border-slate-800 rounded p-1 hover:border-emerald-600 bg-black/40"
                      title={a.label}
                    >
                      <img src={creatureAssetUrl(a.key)} alt={a.key} className="w-full h-10 object-contain pixelated" />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <img src={creatureAssetUrl(form.spriteOverworld)} className="w-16 h-16 object-contain bg-black/50 rounded border border-slate-800" alt="ow" />
                  <img src={creatureAssetUrl(form.spriteBattle || form.spriteOverworld)} className="w-16 h-16 object-contain bg-black/50 rounded border border-slate-800" alt="bt" />
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
                        onChange={(e) => f(key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={labelCls + ' mb-0'}>Passives (default + potential)</label>
                  <button onClick={addPassive} className="text-emerald-400 text-[9px]">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.passives.map((p, idx) => (
                    <div key={idx} className="border border-slate-800 rounded p-2 space-y-1">
                      <div className="flex gap-1 items-center">
                        <input className={inputCls} value={p.id} onChange={(e) => updatePassive(idx, { id: e.target.value })} placeholder="id" />
                        <input className={inputCls} value={p.name} onChange={(e) => updatePassive(idx, { name: e.target.value })} placeholder="name" />
                        <label className="flex items-center gap-1 text-[9px] text-slate-400 shrink-0">
                          <input type="checkbox" checked={!!p.isDefault} onChange={(e) => updatePassive(idx, { isDefault: e.target.checked })} />
                          Default
                        </label>
                      </div>
                      <textarea
                        className={inputCls}
                        rows={2}
                        value={p.description}
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
                  <input className={inputCls} value={form.worldSkillName} onChange={(e) => f('worldSkillName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>World skill description</label>
                  <textarea className={inputCls} rows={2} value={form.worldSkillDescription} onChange={(e) => f('worldSkillDescription', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Flavor</label>
                  <textarea className={inputCls} rows={2} value={form.flavor} onChange={(e) => f('flavor', e.target.value)} />
                </div>
              </div>

              <div className="p-2 rounded border border-[#806f47]/30 bg-[#050b14]/60 space-y-2">
                <div className="text-[10px] font-bold text-[#cbb26a] uppercase tracking-wider">Shiny variant</div>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="flex items-center gap-1 text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.shinyEnabled !== false}
                      onChange={(e) => f('shinyEnabled', e.target.checked)}
                    />{' '}
                    Shinies enabled
                  </label>
                  <label className="flex items-center gap-1 text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.shinyUseGlobalChance !== false}
                      onChange={(e) => f('shinyUseGlobalChance', e.target.checked)}
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
                      onChange={(e) => f('shinySpriteOverworld', e.target.value || null)}
                      placeholder="defaults to overworld sprite"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Shiny battle (optional)</label>
                    <input
                      className={inputCls}
                      value={form.shinySpriteBattle || ''}
                      onChange={(e) => f('shinySpriteBattle', e.target.value || null)}
                      placeholder="defaults to battle sprite"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Shiny back (optional)</label>
                    <input
                      className={inputCls}
                      value={form.shinySpriteBack || ''}
                      onChange={(e) => f('shinySpriteBack', e.target.value || null)}
                      placeholder="defaults to back sprite"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <label className="flex items-center gap-1 text-slate-300">
                  <input type="checkbox" checked={form.isStarter} onChange={(e) => f('isStarter', e.target.checked)} /> Starter
                </label>
                <label className="flex items-center gap-1 text-slate-300">
                  <input type="checkbox" checked={form.isWildSpawn} onChange={(e) => f('isWildSpawn', e.target.checked)} /> Wild spawn
                </label>
                <label className="flex items-center gap-1 text-slate-300">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => f('isActive', e.target.checked)} /> Active
                </label>
                <div className="flex-1" />
                <button
                  disabled={loading}
                  onClick={() => void handleSave()}
                  className="px-4 py-2 bg-[#806f47]/50 hover:bg-[#806f47]/70 text-[#e2d5b3] font-bold rounded flex items-center gap-1"
                >
                  <Save size={12} /> {loading ? 'Saving…' : 'Save Creature'}
                </button>
              </div>
            </>
          )}
          {!isNew && !form.slug && (
            <div className="text-slate-500 text-center mt-10">Select a creature or click New / Seed.</div>
          )}
        </div>
      </div>
    </div>
  );
}
