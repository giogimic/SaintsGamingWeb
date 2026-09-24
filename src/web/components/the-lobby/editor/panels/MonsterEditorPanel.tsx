'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllCreatureDefs,
  upsertCreatureDef,
  deleteCreatureDef,
} from '@/app/actions/game/creature-defs';
import { CreatureDefData, emptyCreatureDef } from '@/shared/game/creatureCatalog';
import { Plus, Save, Trash2, RefreshCw, Skull, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { WorldModelSelector, WorldModelValue } from '../components/WorldModelSelector';

export function MonsterEditorPanel() {
  const activeGameId = useEditorStore((state) => state.activeGameId);
  const [monsters, setMonsters] = useState<CreatureDefData[]>([]);
  const [selected, setSelected] = useState<CreatureDefData | null>(null);
  const [form, setForm] = useState<CreatureDefData>({ ...emptyCreatureDef(), isWildSpawn: true });
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    const res = await getAllCreatureDefs(activeGameId);
    if (res.success && res.data) {
      // Filter out capturable creatures; assume non-capturable wild spawns are Monsters
      setMonsters(res.data.filter((c: any) => c.isWildSpawn && c.tag === 'Monster'));
    }
  };

  useEffect(() => {
    void load();
  }, [activeGameId]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSelect = (m: CreatureDefData) => {
    setSelected(m);
    setForm(m);
    setIsNew(false);
  };

  const handleNew = () => {
    setSelected(null);
    setForm({ ...emptyCreatureDef(), gameId: activeGameId, isWildSpawn: true, tag: 'Monster', name: 'New Monster' });
    setIsNew(true);
  };

  const f = (key: keyof CreatureDefData, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.slug || !form.name) return showStatus('error', 'Slug and Name required.');
    setLoading(true);
    const res = await upsertCreatureDef({ ...form, gameId: activeGameId, isWildSpawn: true, tag: 'Monster' });
    setLoading(false);
    if (res.success) {
      showStatus('success', 'Monster saved.');
      await load();
      setIsNew(false);
    } else {
      showStatus('error', res.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected || !confirm(`Delete monster ${selected.slug}?`)) return;
    setLoading(true);
    const res = await deleteCreatureDef(selected.slug);
    setLoading(false);
    if (res.success) {
      showStatus('success', 'Monster deleted.');
      setSelected(null);
      await load();
    }
  };

  const getWorldModel = (): WorldModelValue => {
    try {
      const parsed = JSON.parse(form.spriteOverworld || '{}');
      if (parsed.worldModel) return parsed.worldModel;
    } catch {}
    return { type: '2D Sprite', assetId: form.spriteOverworld || '' };
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

  const inputCls = "w-full bg-[#050b14] border border-rose-900/50 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-rose-500 transition-colors";
  const labelCls = "block text-[9px] font-black text-rose-500/80 uppercase tracking-[0.15em] mb-1 mt-3";

  const filteredMonsters = monsters.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.slug.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative h-full min-h-0">
      <CatalogEditorShell
        title="Monster Studio"
        items={filteredMonsters}
        activeId={selected?.slug || null}
        getItemId={(m) => m.slug}
        getItemName={(m) => m.name}
        isDirty={() => isNew}
        search={search}
        onSearchChange={setSearch}
        onSelect={(slug) => { const m = monsters.find(x => x.slug === slug); if (m) handleSelect(m); }}
        onCreateNew={handleNew}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={loading}
        validationError={status?.type === 'error' ? status.msg : null}
      >
        {status?.type === 'success' && (
          <div className="mb-2 flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-emerald-900/40 text-emerald-200">
            <CheckCircle2 size={12} />
            {status.msg}
          </div>
        )}

        {(selected || isNew) ? (
          <div className="flex flex-col h-full overflow-hidden">

            <div className="flex-1 overflow-y-auto space-y-2 p-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Name</label>
                  <input value={form.name} onChange={e => f('name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Slug</label>
                  <input value={form.slug} onChange={e => f('slug', e.target.value.toLowerCase())} disabled={!isNew} className={inputCls} style={{opacity: isNew ? 1 : 0.5}} />
                </div>
              </div>
              
              <WorldModelSelector
                value={getWorldModel()}
                onChange={handleWorldModelChange}
                label="Monster World Model"
              />

              <div className="mt-4 p-3 bg-black/40 border border-rose-900/30 rounded-lg">
                <div className="text-[10px] font-black uppercase text-rose-500/70 mb-2 pb-1 border-b border-rose-900/30">
                  Combat Base Stats
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'baseHp', label: 'Base HP' },
                    { key: 'physicalPower', label: 'Physical Pwr' },
                    { key: 'physicalDefense', label: 'Physical Def' },
                    { key: 'abilityPower', label: 'Ability Pwr' },
                    { key: 'abilityDefense', label: 'Ability Def' },
                    { key: 'combatTempo', label: 'Speed / Tempo' },
                  ].map((stat) => (
                    <div key={stat.key}>
                      <label className="text-[8px] text-slate-500 uppercase">{stat.label}</label>
                      <input 
                        type="number" 
                        value={form[stat.key as keyof CreatureDefData] as number} 
                        onChange={e => f(stat.key as keyof CreatureDefData, Number(e.target.value))} 
                        className={inputCls} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Skull size={48} className="opacity-20 mb-4" />
            <p className="text-[10px] uppercase tracking-widest font-mono">Select a monster</p>
          </div>
        )}
      </CatalogEditorShell>
    </div>
  );
}
