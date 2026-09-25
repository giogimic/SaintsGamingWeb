'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Smile, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { WorldModelSelector, WorldModelValue } from '../components/WorldModelSelector';
import { listNpcDefs, upsertNpcDef, deleteNpcDef } from '@/app/actions/studio/npc-def';
import { ComponentMap } from '@/shared/game/entities/types';

interface NpcDefState {
  slug: string;
  name: string;
  componentsData: Partial<ComponentMap>;
}

export function NpcEditorPanel() {
  const [npcs, setNpcs] = useState<any[]>([]);
  const [selected, setSelected] = useState<NpcDefState | null>(null);
  const [form, setForm] = useState<NpcDefState>({ slug: '', name: 'New NPC', componentsData: {} });
  const [isNew, setIsNew] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchNpcs = async () => {
    setLoading(true);
    const res = await listNpcDefs('saints');
    if (res.success && res.data) {
      setNpcs(res.data);
    } else {
      showStatus('error', 'Failed to load NPCs.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNpcs();
  }, []);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSelect = (n: any) => {
    let parsed: Partial<ComponentMap> = {};
    try {
      parsed = JSON.parse(n.componentsData || '{}');
    } catch (e) {}

    const npcState: NpcDefState = {
      slug: n.slug,
      name: n.name,
      componentsData: parsed,
    };
    setSelected(npcState);
    setForm(npcState);
    setIsNew(false);
  };

  const handleNew = () => {
    setSelected(null);
    setForm({ slug: `npc_${Date.now()}`, name: 'New NPC', componentsData: {} });
    setIsNew(true);
  };

  const setComponent = (key: keyof ComponentMap, val: any) => {
    setForm((prev) => ({
      ...prev,
      componentsData: {
        ...prev.componentsData,
        [key]: {
          ...(prev.componentsData[key] || {}),
          ...val
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!form.slug || !form.name) return showStatus('error', 'Slug and Name required.');
    
    // Ensure identity component is updated with the slug and name
    const finalComponentsData = {
      ...form.componentsData,
      identity: {
        ...(form.componentsData.identity || {}),
        slug: form.slug,
        name: form.name
      }
    };

    const payload = {
      slug: form.slug,
      name: form.name,
      componentsData: JSON.stringify(finalComponentsData)
    };

    const res = await upsertNpcDef('saints', payload);
    if (res.success) {
      showStatus('success', 'NPC saved successfully.');
      setIsNew(false);
      fetchNpcs();
      // Keep the form updated with the latest
      handleSelect({ ...res.data, componentsData: payload.componentsData });
    } else {
      showStatus('error', res.error || 'Failed to save NPC.');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const res = await deleteNpcDef(selected.slug);
    if (res.success) {
      showStatus('success', 'NPC deleted.');
      setSelected(null);
      fetchNpcs();
    } else {
      showStatus('error', res.error || 'Failed to delete NPC.');
    }
  };

  const getWorldModel = (): WorldModelValue => {
    const app = form.componentsData.appearance;
    if (app && app.assetProfileId && app.assetId) {
      return { type: app.assetProfileId as any, assetId: app.assetId, scale: app.scale };
    }
    return { type: '2D Sprite', assetId: 'adventurer' };
  };

  const handleWorldModelChange = (val: WorldModelValue) => {
    setComponent('appearance', { assetProfileId: val.type, assetId: val.assetId, scale: val.scale });
  };

  const toggleCapability = (cap: 'shopkeeper' | 'banker' | 'questGiver' | 'mercenary' | 'companion' | 'trainer', val: boolean) => {
    setComponent('capabilities', { [cap]: val });
  };

  const inputCls = "w-full bg-[#050b14] border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-amber-500 transition-colors";
  const labelCls = "block text-[9px] font-black text-amber-500/80 uppercase tracking-[0.15em] mb-1 mt-3";

  const getCap = (cap: 'shopkeeper' | 'banker' | 'questGiver' | 'mercenary' | 'companion' | 'trainer') => {
    return form.componentsData.capabilities?.[cap] || false;
  };

  const filteredNpcs = npcs.filter(n => n.name.toLowerCase().includes(search.toLowerCase()) || n.slug.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative h-full min-h-0">
      <CatalogEditorShell
        title="NPC Studio"
        items={filteredNpcs}
        activeId={selected?.slug || null}
        getItemId={(n) => n.slug}
        getItemName={(n) => n.name}
        isDirty={() => isNew}
        search={search}
        onSearchChange={setSearch}
        onSelect={(slug) => { const n = npcs.find(x => x.slug === slug); if (n) handleSelect(n); }}
        onCreateNew={handleNew}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={false}
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
                  <label className={labelCls}>NPC Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Global Slug</label>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} disabled={!isNew} className={inputCls} style={{opacity: isNew ? 1 : 0.5}} />
                </div>
              </div>
              
              <WorldModelSelector
                value={getWorldModel()}
                onChange={handleWorldModelChange}
                label="NPC World Model"
              />

              <div className="mt-4 p-3 bg-black/40 border border-amber-900/30 rounded-lg">
                <div className="text-[10px] font-black uppercase text-amber-500/70 mb-3 pb-1 border-b border-amber-900/30">
                  Global Behaviors & Capabilities
                </div>
                
                <div className="mb-4">
                  <label className="block text-[9px] font-black text-amber-500/80 uppercase tracking-[0.15em] mb-1">Dialogue Reference ID</label>
                  <input 
                    value={(form.componentsData as any).behavior?.dialogueId || ''} 
                    onChange={e => setComponent('behavior', { dialogueId: e.target.value })} 
                    className="w-full bg-[#050b14] border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-amber-500 transition-colors"
                    placeholder="E.g. demo_welcome"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">Leaves blank to use the NPC's Global Slug as the default dialogue tree ID.</p>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={getCap('shopkeeper')} 
                      onChange={e => toggleCapability('shopkeeper', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Shopkeeper</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Can sell items to players.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={getCap('banker')} 
                      onChange={e => toggleCapability('banker', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Banker</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Provides global storage access.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={getCap('questGiver')} 
                      onChange={e => toggleCapability('questGiver', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Quest Giver</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Interacts with the Quest system.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={getCap('mercenary')} 
                      onChange={e => toggleCapability('mercenary', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Mercenary</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Combat follower for hire.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={getCap('companion')} 
                      onChange={e => toggleCapability('companion', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Companion</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Non-combat follower.</span>
                  </label>
                  <div className="pt-2 border-t border-amber-900/20">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={getCap('trainer')} 
                        onChange={e => toggleCapability('trainer', e.target.checked)} 
                        className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                      />
                      <span className="text-[11px] text-amber-100 font-bold">Trainer (Battle)</span>
                      <span className="text-[9px] text-slate-500 ml-1">— Fights the player using a party of creatures.</span>
                    </label>
                    {getCap('trainer') && (
                      <div className="mt-2 pl-6">
                        <label className="block text-[9px] font-black text-amber-500/80 uppercase tracking-[0.15em] mb-1">Trainer Party (JSON Array)</label>
                        <input 
                          value={(form.componentsData as any).trainerParty || '[]'} 
                          onChange={e => setForm(prev => ({ ...prev, componentsData: { ...prev.componentsData, trainerParty: e.target.value } }))} 
                          className="w-full bg-[#050b14] border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-amber-500 transition-colors"
                          placeholder='e.g. ["creature_goblin", "creature_wolf"]'
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Smile size={48} className="opacity-20 mb-4" />
            <p className="text-[10px] uppercase tracking-widest font-mono">Select an NPC template</p>
          </div>
        )}
      </CatalogEditorShell>
    </div>
  );
}
