'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllStarterHeroes, upsertStarterHero, deleteStarterHero,
  toggleStarterHeroActive, StarterHeroData
} from '@/app/actions/game/starter-heroes';
import { fetchAllMaps } from '@/app/actions/admin/game-admin';
import { getAllCharacterClasses } from '@/app/actions/game/character-classes';
import { useEditorStore } from '../editor-store';
import {
  Plus, Trash2, Save, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle,
  FileJson, Copy, Check, Users, ImageIcon, ChevronLeft, Swords, Map as MapIcon, Package, UserCircle
} from 'lucide-react';
import { WorldModelSelector, WorldModelValue } from '../components/WorldModelSelector';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { cn } from '@/shared/lib/utils';

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

const inputCls = "w-full bg-[#050b14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all placeholder:text-slate-700";
const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

export function ArchetypeEditorWorkspace() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  
  // Data State
  const [heroes, setHeroes] = useState<any[]>([]);
  const [classList, setClassList] = useState<{slug: string, name: string, classId: string}[]>([]);
  const [mapList, setMapList] = useState<{id: string, name: string}[]>([]);
  
  // View State
  const [viewState, setViewState] = useState<'gallery' | 'edit'>('gallery');

  // Form State
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<StarterHeroData>({ ...EMPTY_HERO, gameId: activeGameId });
  const [isNew, setIsNew] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
    setViewState('edit');
  };

  const handleNew = () => {
    setSelected(null);
    setForm({ ...EMPTY_HERO, gameId: activeGameId, sortOrder: heroes.length + 1 });
    setIsNew(true);
    setViewState('edit');
  };

  const handleBack = () => {
    setViewState('gallery');
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
      if (selected?.slug === slug) { setSelected(null); setIsNew(false); setViewState('gallery'); }
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

  const getWorldModel = (): WorldModelValue => {
    try {
      const parsed = JSON.parse(form.visualData || '{}');
      if (parsed.worldModel) return parsed.worldModel;
    } catch {}
    return { type: '2D Sprite', assetId: form.assetProfileId || '' };
  };

  const handleWorldModelChange = (val: WorldModelValue) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(form.visualData || '{}');
      if (Array.isArray(parsed)) parsed = {}; // Migrate legacy array
    } catch {}
    parsed.worldModel = val;
    setForm(prev => ({
      ...prev,
      visualData: JSON.stringify(parsed),
      assetProfileId: val.assetId // Sync for legacy compat
    }));
  };

  const f = (key: keyof StarterHeroData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Validation checks
  const isSpriteValid = Boolean(form.assetProfileId || form.assetBundleId);
  const isSlugValid = Boolean(form.slug && /^[a-z0-9_]+$/.test(form.slug));
  let isJsonValid = true;
  try { JSON.parse(form.startingInventory); } catch { isJsonValid = false; }

  // ─── GALLERY VIEW ─────────────────────────────────────────────────────────
  if (viewState === 'gallery') {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#050b14] relative">
        {/* Gallery Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20 shrink-0">
          <div>
            <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-violet-400">Archetypes</h2>
            <p className="text-xs text-slate-400 mt-1">Manage starting characters available for players to choose from.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <button onClick={handleNew} className="px-5 py-2.5 rounded-lg bg-pink-600/90 hover:bg-pink-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(219,39,119,0.3)] transition-all">
              <Plus size={16} strokeWidth={3} /> Create Archetype
            </button>
          </div>
        </div>

        {/* Status Overlay */}
        {status && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
             <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-xl border ${status.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : 'bg-red-950/90 border-red-500/30 text-red-300'} backdrop-blur-md`}>
                {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {status.msg}
             </div>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-5 pb-20">
          {heroes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <Users size={48} className="opacity-20" />
              <p className="text-sm font-bold">No archetypes defined yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {heroes.map((hero) => (
                <div
                  key={hero.slug}
                  onClick={() => handleSelectHero(hero)}
                  className={cn(
                    "group relative bg-[#0a101b]/80 border rounded-2xl p-5 cursor-pointer overflow-hidden backdrop-blur-xl transition-all duration-300 flex flex-col",
                    hero.isActive ? "border-slate-800 hover:border-pink-500/50 hover:shadow-[0_8px_30px_rgba(219,39,119,0.1)] hover:-translate-y-1" : "border-slate-900 opacity-60 hover:opacity-100"
                  )}
                >
                  {/* Action Overlay */}
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleToggle(hero); }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-slate-300 hover:text-white backdrop-blur-md transition-colors"
                      title={hero.isActive ? 'Hide Archetype' : 'Show Archetype'}
                    >
                      {hero.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleDelete(hero.slug); }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-red-950/80 text-red-400 hover:text-red-300 backdrop-blur-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Character Preview */}
                  <div className="flex justify-center items-center h-28 mb-4 relative z-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent rounded-xl" />
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
                        size={48}
                        scale={1.8}
                      />
                    ) : (
                      <Users size={32} className="text-slate-700" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="text-center flex-1 flex flex-col">
                    <h3 className="text-sm font-black text-white truncate mb-1">{hero.name}</h3>
                    <div className="text-[10px] text-pink-400/80 font-mono uppercase tracking-widest truncate mb-2">{hero.classId}</div>
                    
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed flex-1 italic">
                      "{hero.flavor || 'No flavor text provided.'}"
                    </p>

                    <div className="mt-4 flex justify-center">
                      <span
                        className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: hero.tagColor, backgroundColor: `${hero.tagColor}15`, border: `1px solid ${hero.tagColor}40` }}
                      >
                        {hero.tag || 'Starter'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white">{isNew ? 'Create Archetype' : form.name}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">{isNew ? 'Drafting a new hero template' : `Editing archetype profile: ${form.slug}`}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Validation Markers */}
          <div className="hidden lg:flex items-center gap-3 mr-4">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isSlugValid ? 'text-emerald-400/80' : 'text-red-400'}`}>
               {isSlugValid ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>} Slug
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isSpriteValid ? 'text-emerald-400/80' : 'text-red-400'}`}>
               {isSpriteValid ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>} Visuals
            </div>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isJsonValid ? 'text-emerald-400/80' : 'text-red-400'}`}>
               {isJsonValid ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>} Loadout
            </div>
          </div>

          {!isNew && (
            <button
              onClick={handleDuplicate}
              className="px-3 py-2 rounded-lg text-xs font-bold text-violet-300 hover:bg-violet-500/10 border border-violet-500/30 flex items-center gap-1.5 transition-all"
            >
              <Copy size={14} /> Clone
            </button>
          )}
          <button
            onClick={handleCopyFormJson}
            className="px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <FileJson size={14} />} {copied ? 'Copied' : 'JSON'}
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={loading || !isSpriteValid || !isSlugValid || !isJsonValid}
            className="px-6 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(219,39,119,0.3)] disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save Archetype'}
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Identity & Visuals (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Box 1: Core Identity */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-pink-500/10 pb-3">
                <UserCircle className="text-pink-400/80" size={16} />
                <h3 className="text-xs font-black text-pink-400/80 uppercase tracking-widest">Core Identity</h3>
              </div>

              <div>
                <label className={labelCls}>Display Name *</label>
                <input value={form.name} onChange={e => f('name', e.target.value)} className={inputCls} placeholder="e.g. Beast Master" />
              </div>

              <div>
                <label className={labelCls}>System Slug *</label>
                <input
                  value={form.slug}
                  onChange={e => f('slug', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className={inputCls}
                  placeholder="e.g. beast_master"
                  disabled={!isNew}
                  style={{ opacity: isNew ? 1 : 0.6 }}
                />
                {!isNew && <p className="text-[9px] text-slate-500 mt-1">Slugs cannot be changed after creation.</p>}
              </div>

              <div>
                <label className={labelCls}>Flavor Text</label>
                <textarea
                  value={form.flavor}
                  onChange={e => f('flavor', e.target.value)}
                  className={cn(inputCls, "resize-none h-20")}
                  placeholder="A short lore-friendly description."
                  maxLength={120}
                />
                <p className="text-[9px] text-slate-500 mt-1 text-right">{form.flavor.length}/120</p>
              </div>
            </div>

            {/* Box 2: Visual Representation */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-pink-500/10 pb-3">
                <ImageIcon className="text-pink-400/80" size={16} />
                <h3 className="text-xs font-black text-pink-400/80 uppercase tracking-widest">Visual Model</h3>
              </div>
              <WorldModelSelector
                value={getWorldModel()}
                onChange={handleWorldModelChange}
                label="Overworld & UI Representation"
              />
            </div>
            
          </div>

          {/* RIGHT COLUMN: Gameplay & Mechanics (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Box 3: Gameplay Settings */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-violet-500/10 pb-3">
                <Swords className="text-violet-400/80" size={16} />
                <h3 className="text-xs font-black text-violet-400/80 uppercase tracking-widest">Combat & Mechanics</h3>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Combat Class */}
                <div className="col-span-2">
                  <label className={labelCls}>Combat Class (Skill Tree)</label>
                  {classList.length === 0 ? (
                    <p className="text-[10px] text-amber-500">No classes found in registry.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {classList.map(cls => {
                        const isActive = form.classId === cls.classId;
                        return (
                          <button
                            key={cls.slug}
                            onClick={() => f('classId', cls.classId)}
                            className="flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer"
                            style={{
                              background: isActive ? `rgba(139,92,246,0.15)` : 'rgba(255,255,255,0.02)',
                              border: isActive ? `1px solid rgba(139,92,246,0.5)` : '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            <span className="text-xs font-black" style={{ color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>{cls.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className={labelCls}>Difficulty Tag Label</label>
                  <input value={form.tag} onChange={e => f('tag', e.target.value)} className={inputCls} placeholder="e.g. Advanced" />
                </div>
                <div>
                  <label className={labelCls}>Tag Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={form.tagColor} onChange={e => f('tagColor', e.target.value)} className="h-9 w-12 rounded cursor-pointer border border-slate-800 bg-black" />
                    <div className="flex-1 rounded flex items-center justify-center text-xs font-bold uppercase tracking-wider" style={{ background: `${form.tagColor}15`, color: form.tagColor, border: `1px solid ${form.tagColor}40` }}>
                      {form.tag || 'Preview'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 4: Environment & Loadout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
                <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-3">
                  <MapIcon className="text-emerald-400/80" size={16} />
                  <h3 className="text-xs font-black text-emerald-400/80 uppercase tracking-widest">Spawn Rules</h3>
                </div>

                <div>
                  <label className={labelCls}>Initial Map</label>
                  <select value={form.startingMap} onChange={e => f('startingMap', e.target.value)} className={inputCls}>
                    {mapList.length === 0 && <option value="DEMO_SANDBOX">DEMO_SANDBOX (Fallback)</option>}
                    {mapList.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Spawn X</label>
                    <input type="number" value={form.startingX} onChange={e => f('startingX', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Spawn Y</label>
                    <input type="number" value={form.startingY} onChange={e => f('startingY', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                </div>
                
                <div className="pt-2 border-t border-white/5">
                   <label className={labelCls}>Catalog Visibility</label>
                   <button
                      onClick={() => f('isActive', !form.isActive)}
                      className="w-full flex justify-between items-center px-4 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: form.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        border: form.isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                        color: form.isActive ? '#6ee7b7' : '#fca5a5',
                      }}
                    >
                      <span>{form.isActive ? 'Players can select this' : 'Hidden from character creator'}</span>
                      {form.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                </div>
              </div>

              <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg flex flex-col">
                <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-3">
                  <Package className="text-emerald-400/80" size={16} />
                  <h3 className="text-xs font-black text-emerald-400/80 uppercase tracking-widest">Initial Loadout</h3>
                </div>
                <div className="flex-1 flex flex-col">
                   <label className={labelCls}>Inventory Specification (JSON)</label>
                   <textarea
                     value={form.startingInventory}
                     onChange={e => f('startingInventory', e.target.value)}
                     className={cn(inputCls, "flex-1 resize-none font-mono text-[10px]")}
                     placeholder='{"item_id": quantity}'
                   />
                   <p className="text-[9px] text-slate-500 mt-2">
                     Standard items granted immediately upon spawning for the first time. Format: <code className="text-slate-400">{"{\"patch_kit\": 5}"}</code>
                   </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
