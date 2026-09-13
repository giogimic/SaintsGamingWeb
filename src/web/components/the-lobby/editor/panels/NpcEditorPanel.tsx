'use client';

import React, { useState } from 'react';
import { Plus, Save, Trash2, Smile, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { WorldModelSelector, WorldModelValue } from '../components/WorldModelSelector';

// Placeholder type until NPC global model is formalized
interface MockNpcDef {
  id: string;
  name: string;
  visualData: string; // JSON string
  isShop: boolean;
  isBank: boolean;
  isQuestGiver: boolean;
}

const DEMO_NPCS: MockNpcDef[] = [
  { id: 'npc_blacksmith', name: 'Blacksmith', visualData: '{"worldModel":{"type":"2D Sprite","assetId":"blacksmith"}}', isShop: true, isBank: false, isQuestGiver: true },
  { id: 'npc_banker', name: 'Global Banker', visualData: '{"worldModel":{"type":"3D Model","assetId":"banker_obj"}}', isShop: false, isBank: true, isQuestGiver: false },
];

export function NpcEditorPanel() {
  const [npcs, setNpcs] = useState<MockNpcDef[]>(DEMO_NPCS);
  const [selected, setSelected] = useState<MockNpcDef | null>(null);
  const [form, setForm] = useState<MockNpcDef>({ id: '', name: 'New NPC', visualData: '{}', isShop: false, isBank: false, isQuestGiver: false });
  const [isNew, setIsNew] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSelect = (n: MockNpcDef) => {
    setSelected(n);
    setForm(n);
    setIsNew(false);
  };

  const handleNew = () => {
    setSelected(null);
    setForm({ id: `npc_${Date.now()}`, name: 'New NPC', visualData: '{}', isShop: false, isBank: false, isQuestGiver: false });
    setIsNew(true);
  };

  const f = (key: keyof MockNpcDef, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!form.id || !form.name) return showStatus('error', 'ID and Name required.');
    if (isNew) {
      setNpcs([...npcs, form]);
    } else {
      setNpcs(npcs.map(n => n.id === form.id ? form : n));
    }
    showStatus('success', 'NPC saved (Local Mock).');
    setIsNew(false);
    setSelected(form);
  };

  const handleDelete = () => {
    if (!selected) return;
    setNpcs(npcs.filter(n => n.id !== selected.id));
    setSelected(null);
    showStatus('success', 'NPC deleted.');
  };

  const getWorldModel = (): WorldModelValue => {
    try {
      const parsed = JSON.parse(form.visualData || '{}');
      if (parsed.worldModel) return parsed.worldModel;
    } catch {}
    return { type: '2D Sprite', assetId: 'adventurer' };
  };

  const handleWorldModelChange = (val: WorldModelValue) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(form.visualData || '{}');
      if (typeof parsed !== 'object') parsed = {};
    } catch {}
    parsed.worldModel = val;
    f('visualData', JSON.stringify(parsed));
  };

  const inputCls = "w-full bg-[#050b14] border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-amber-500 transition-colors";
  const labelCls = "block text-[9px] font-black text-amber-500/80 uppercase tracking-[0.15em] mb-1 mt-3";

  return (
    <div className="relative h-full min-h-0">
      <CatalogEditorShell
        title="NPC Studio"
        blurb={`Catalog mode · ${npcs.length} global NPCs`}
        dirty={isNew}
        toolbar={
          <button onClick={handleNew} className="rounded p-1.5 text-emerald-400 hover:bg-white/5"><Plus size={14} /></button>
        }
        list={
          <div className="space-y-1">
            {npcs.map((n) => (
              <button
                key={n.id}
                onClick={() => handleSelect(n)}
                className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 ${selected?.id === n.id && !isNew ? 'bg-amber-500/20 border border-amber-500/50 text-amber-100' : 'hover:bg-white/5 text-slate-300'}`}
              >
                <Smile size={14} className={selected?.id === n.id ? 'text-amber-400' : 'text-slate-500'} />
                <div className="truncate text-[11px] font-bold">{n.name}</div>
              </button>
            ))}
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
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-amber-900/50 pb-2 mb-2">
              <span className="text-[11px] font-bold text-amber-300">{isNew ? 'New NPC' : `Editing ${selected?.name}`}</span>
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-3 py-1 bg-amber-600/50 text-amber-100 text-[10px] font-bold uppercase rounded hover:bg-amber-600 flex items-center gap-1">
                  <Save size={12} /> Save (Mock)
                </button>
                {selected && (
                  <button onClick={handleDelete} className="px-2 py-1 text-red-400 hover:bg-red-900/30 rounded">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 p-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>NPC Name</label>
                  <input value={form.name} onChange={e => f('name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Global ID</label>
                  <input value={form.id} onChange={e => f('id', e.target.value)} disabled={!isNew} className={inputCls} style={{opacity: isNew ? 1 : 0.5}} />
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
                
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.isShop} 
                      onChange={e => f('isShop', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Shopkeeper</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Can sell items to players.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.isBank} 
                      onChange={e => f('isBank', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Banker</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Provides global storage access.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.isQuestGiver} 
                      onChange={e => f('isQuestGiver', e.target.checked)} 
                      className="rounded bg-[#050b14] border-amber-900/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-amber-100 font-bold">Quest Giver</span>
                    <span className="text-[9px] text-slate-500 ml-1">— Interacts with the Quest system.</span>
                  </label>
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
