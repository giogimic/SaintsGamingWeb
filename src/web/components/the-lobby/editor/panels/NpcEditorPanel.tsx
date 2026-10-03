'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Plus, Trash2, Save, RefreshCw, Eye, EyeOff, CheckCircle2, AlertCircle,
  FileJson, Copy, Check, ChevronLeft, Cuboid, ShoppingBag, Shield, Award,
  MessageSquare, Landmark, HeartHandshake, Swords, UserCheck, Sparkles, Filter, Search, Globe
} from 'lucide-react';
import { WorldModelSelector, WorldModelValue } from '../components/WorldModelSelector';
import { ModelWardrobeEditor } from '../components/ModelWardrobeEditor';
import { parseModelWardrobeItems, type ModelWardrobeItem } from '@/shared/game/modelWardrobe';
import { ArchetypeModelPreview3D } from '../hero-studio/ArchetypeModelPreview3D';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { listNpcDefs, upsertNpcDef, deleteNpcDef } from '@/app/actions/studio/npc-def';
import { ComponentMap } from '@/shared/game/entities/types';
import { useEditorStore } from '../editor-store';
import { cn } from '@/shared/lib/utils';
import { createNpcVisualSnapshot, parseNpcVisualSnapshot } from '@/shared/game/npcVisualSnapshot';

export interface NpcDefState {
  slug: string;
  name: string;
  description?: string;
  componentsData: Partial<ComponentMap> & {
    behavior?: {
      dialogueId?: string;
      prompt?: string;
      spawnType?: 'stationary' | 'patrol' | 'wander';
      patrolRadius?: number;
    };
    trainerParty?: string;
    faction?: string;
    title?: string;
  };
}

const EMPTY_NPC: NpcDefState = {
  slug: '',
  name: '',
  description: '',
  componentsData: {
    identity: { slug: '', name: '' },
    appearance: { assetProfileId: '3D Model', assetId: '', scale: 1 },
    capabilities: {
      shopkeeper: false,
      banker: false,
      questGiver: false,
      mercenary: false,
      companion: false,
      trainer: false,
    },
    behavior: {
      dialogueId: '',
      prompt: 'Talk',
      spawnType: 'stationary',
    },
    trainerParty: '[]',
    faction: 'Friendly',
  },
};

const inputCls = "w-full bg-[#050b14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-slate-700";
const labelCls = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

type NpcCapabilityKey = 'shopkeeper' | 'banker' | 'questGiver' | 'mercenary' | 'companion' | 'trainer';

const CAPABILITY_CONFIGS: { key: NpcCapabilityKey; label: string; desc: string; icon: any; color: string }[] = [
  { key: 'shopkeeper', label: 'Shopkeeper', desc: 'Sells items, equipment, and consumables', icon: ShoppingBag, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { key: 'questGiver', label: 'Quest Giver', desc: 'Provides quests and storyline progression', icon: Award, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  { key: 'trainer', label: 'Creature Trainer', desc: 'Challenges players with a creature party', icon: Swords, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { key: 'mercenary', label: 'Mercenary', desc: 'Combat follower for hire in world exploration', icon: Shield, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { key: 'companion', label: 'Companion', desc: 'Passive aesthetic companion / follower', icon: HeartHandshake, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { key: 'banker', label: 'Banker', desc: 'Access to persistent player vault and stash', icon: Landmark, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
];

export function NpcEditorPanel() {
  const activeGameId = useEditorStore((s) => s.activeGameId) || 'saints';

  // Data State
  const [npcs, setNpcs] = useState<any[]>([]);
  const [viewState, setViewState] = useState<'gallery' | 'edit'>('gallery');

  // Form State
  const [selected, setSelected] = useState<NpcDefState | null>(null);
  const [form, setForm] = useState<NpcDefState>({ ...EMPTY_NPC });
  const [isNew, setIsNew] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | NpcCapabilityKey>('ALL');
  const [copied, setCopied] = useState(false);
  const [visualSourceSlug, setVisualSourceSlug] = useState('');
  const [previewNpcSlug, setPreviewNpcSlug] = useState<string | null>(null);
  const visualImportRef = useRef<HTMLInputElement>(null);

  const fetchNpcs = useCallback(async () => {
    setLoading(true);
    const res = await listNpcDefs(activeGameId);
    if (res.success && res.data) {
      setNpcs(res.data);
    } else {
      showStatus('error', 'Failed to load NPCs.');
    }
    setLoading(false);
  }, [activeGameId]);

  useEffect(() => {
    void fetchNpcs();
  }, [fetchNpcs]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSelectNpc = (n: any) => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(n.componentsData || '{}');
    } catch {}

    const npcState: NpcDefState = {
      slug: n.slug,
      name: n.name,
      description: n.description || '',
      componentsData: {
        ...EMPTY_NPC.componentsData,
        ...parsed,
      },
    };
    setSelected(npcState);
    setForm(npcState);
    setIsNew(false);
    setViewState('edit');
  };

  const handleNew = () => {
    const freshSlug = `npc_${Math.floor(Date.now() / 1000)}`;
    const newNpc: NpcDefState = {
      ...EMPTY_NPC,
      slug: freshSlug,
      name: 'New NPC',
      componentsData: {
        ...EMPTY_NPC.componentsData,
        identity: { slug: freshSlug, name: 'New NPC' },
        behavior: { dialogueId: freshSlug, prompt: 'Talk', spawnType: 'stationary' },
      },
    };
    setSelected(null);
    setForm(newNpc);
    setIsNew(true);
    setViewState('edit');
  };

  const handleBack = () => {
    setViewState('gallery');
  };

  const setComponent = (key: keyof ComponentMap, val: any) => {
    setForm((prev) => ({
      ...prev,
      componentsData: {
        ...prev.componentsData,
        [key]: {
          ...((prev.componentsData as any)[key] || {}),
          ...val,
        },
      },
    }));
  };

  const toggleCapability = (cap: NpcCapabilityKey, val: boolean) => {
    setForm((prev) => ({
      ...prev,
      componentsData: {
        ...prev.componentsData,
        capabilities: {
          ...(prev.componentsData.capabilities || {}),
          [cap]: val,
        },
      },
    }));
  };

  const getCap = (cap: NpcCapabilityKey): boolean => {
    return Boolean(form.componentsData.capabilities?.[cap]);
  };

  const handleSave = async () => {
    if (!form.slug || !form.name) {
      showStatus('error', 'Slug and Name are required.');
      return;
    }

    setLoading(true);

    const finalComponentsData = {
      ...form.componentsData,
      identity: {
        ...(form.componentsData.identity || {}),
        slug: form.slug,
        name: form.name,
        title: form.componentsData.title || '',
      },
      behavior: {
        ...(form.componentsData.behavior || {}),
        dialogueId: form.componentsData.behavior?.dialogueId || form.slug,
      },
    };

    const payload = {
      slug: form.slug,
      name: form.name,
      description: form.description || '',
      componentsData: JSON.stringify(finalComponentsData),
    };

    const res = await upsertNpcDef(activeGameId, payload);
    setLoading(false);

    if (res.success) {
      showStatus('success', `${form.name} saved successfully!`);
      setIsNew(false);
      await fetchNpcs();
    } else {
      showStatus('error', res.error || 'Failed to save NPC.');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Permanently delete NPC "${slug}"?`)) return;
    const res = await deleteNpcDef(slug);
    if (res.success) {
      showStatus('success', 'NPC deleted.');
      if (selected?.slug === slug) {
        setSelected(null);
        setIsNew(false);
        setViewState('gallery');
      }
      await fetchNpcs();
    } else {
      showStatus('error', res.error || 'Delete failed.');
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
    showStatus('success', 'Cloned NPC into new draft. Make changes and Save.');
  };

  const handleCopyFormJson = () => {
    navigator.clipboard.writeText(JSON.stringify(form, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // World Model representation helpers
  const getWorldModel = (): WorldModelValue => {
    const app = form.componentsData.appearance;
    if (app) {
      return {
        ...app,
        type: (app.type || app.assetProfileId || '3D Model') as WorldModelValue['type'],
        assetId: app.assetId || '',
      } as WorldModelValue;
    }
    return { type: '3D Model', assetId: '', scale: 1 };
  };

  const handleWorldModelChange = (val: WorldModelValue) => {
    setComponent('appearance', {
      ...val,
      assetProfileId: val.type,
      scale: val.scale ?? 0.8,
    });
  };

  const getModularAttachments = (): ModelWardrobeItem[] => {
    return ((form.componentsData.appearance?.modularAttachments || []) as ModelWardrobeItem[]);
  };

  const handleModularAttachmentsChange = (items: ModelWardrobeItem[]) => {
    setComponent('appearance', { modularAttachments: items });
  };

  const applyVisualSnapshot = (value: unknown) => {
    try {
      const appearance = parseNpcVisualSnapshot(value);
      setForm((prev) => ({ ...prev, componentsData: { ...prev.componentsData, appearance } }));
      showStatus('success', 'Visual configuration copied. Save to apply it to this NPC.');
    } catch (error) {
      showStatus('error', error instanceof Error ? error.message : 'Unable to load this visual configuration.');
    }
  };

  const handleCopyVisual = () => {
    const source = npcs.find((npc) => npc.slug === visualSourceSlug);
    if (!source) return;
    try {
      applyVisualSnapshot({ appearance: JSON.parse(source.componentsData || '{}').appearance });
    } catch {
      showStatus('error', 'This NPC has no readable visual configuration.');
    }
  };

  const handleExportVisual = () => {
    try {
      const snapshot = createNpcVisualSnapshot(form.name || 'NPC Visual', form.componentsData.appearance!);
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
      const download = document.createElement('a');
      download.href = url;
      download.download = `${form.slug || 'npc'}-visual.json`;
      download.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showStatus('error', error instanceof Error ? error.message : 'Select a base model before exporting.');
    }
  };

  const handleImportVisual = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      applyVisualSnapshot(await file.text());
    } catch {
      showStatus('error', 'Unable to read the selected visual snapshot.');
    }
  };

  // Live validation markers
  const isSlugValid = Boolean(form.slug && /^[a-z0-9_]+$/.test(form.slug));
  const isVisualValid = Boolean(form.componentsData.appearance?.assetId);
  const activeCapCount = Object.values(form.componentsData.capabilities || {}).filter(Boolean).length;

  const filteredNpcs = npcs.filter((n) => {
    const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase()) || n.slug.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (roleFilter === 'ALL') return true;
    try {
      const parsed = JSON.parse(n.componentsData || '{}');
      return Boolean(parsed.capabilities?.[roleFilter]);
    } catch {
      return false;
    }
  });

  // ─── GALLERY VIEW ──────────────────────────────────────────────────────────
  if (viewState === 'gallery') {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#050b14] relative">
        {/* Gallery Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/20 shrink-0">
          <div>
            <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-400 flex items-center gap-2">
              <Globe className="text-amber-400" size={20} />
              NPC Registry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Merchants, quest givers, trainers, companions, and world citizens.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchNpcs()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-amber-400' : ''} />
            </button>
            <button
              onClick={handleNew}
              className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={3} /> Create NPC
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Filter Chips */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-[#07111c]/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search NPCs by name, slug, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#050b14] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border",
                roleFilter === 'ALL'
                  ? "bg-amber-600/30 border-amber-500 text-amber-300"
                  : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              All NPCs ({npcs.length})
            </button>
            {CAPABILITY_CONFIGS.map((cap) => (
              <button
                key={cap.key}
                onClick={() => setRoleFilter(cap.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border flex items-center gap-1.5",
                  roleFilter === cap.key
                    ? "bg-amber-600/30 border-amber-500 text-amber-300"
                    : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <span>{cap.label}</span>
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
          {filteredNpcs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 my-16">
              <Globe size={48} className="opacity-20" />
              <p className="text-sm font-bold">No NPCs found matching your search.</p>
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow"
              >
                + Create NPC Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {filteredNpcs.map((npc) => {
                let parsed: any = {};
                try { parsed = JSON.parse(npc.componentsData || '{}'); } catch {}
                const is3D = parsed.appearance?.assetProfileId === '3D Model' || !parsed.appearance?.assetProfileId;
                const activeCaps = Object.entries(parsed.capabilities || {}).filter(([_, v]) => Boolean(v)).map(([k]) => k);
                const title = parsed.identity?.title || parsed.title;

                return (
                  <div
                    key={npc.slug}
                    onClick={() => handleSelectNpc(npc)}
                    className="group relative bg-[#0a101b]/80 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer overflow-hidden backdrop-blur-xl transition-all duration-300 flex flex-col hover:shadow-[0_8px_30px_rgba(245,158,11,0.1)] hover:-translate-y-1"
                  >
                    {/* Delete action overlay */}
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(npc.slug); }}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-red-950/80 text-red-400 hover:text-red-300 backdrop-blur-md transition-colors"
                        title="Delete NPC"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Visual Preview */}
                    <div className="flex justify-center items-center h-28 mb-4 relative z-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent rounded-xl" />
                      {is3D ? (
                        previewNpcSlug === npc.slug ? (
                          <div className="w-full relative z-10" onClick={(event) => event.stopPropagation()}>
                            <ArchetypeModelPreview3D worldModel={{ ...parsed.appearance, type: '3D Model', assetId: parsed.appearance?.assetId || '' }} modularAttachments={parseModelWardrobeItems(parsed.appearance).filter((item) => item.defaultVisible !== false) as WorldModelValue[]} className="h-28" />
                          </div>
                        ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 z-10">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            <Cuboid size={24} />
                          </div>
                          <button type="button" onClick={(event) => { event.stopPropagation(); setPreviewNpcSlug(npc.slug); }} className="text-[10px] font-semibold text-primary hover:underline">Preview model</button>
                        </div>
                        )
                      ) : (
                        <CharacterSpritePreview
                          assetProfileId={parsed.appearance?.assetId || 'adventurer'}
                          size={48}
                          scale={1.8}
                        />
                      )}
                    </div>

                    {/* NPC Info */}
                    <div className="text-center flex-1 flex flex-col">
                      <h3 className="text-sm font-black text-white truncate mb-0.5 group-hover:text-amber-300 transition-colors">
                        {npc.name}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-mono truncate mb-2">
                        {title || npc.slug}
                      </div>

                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed flex-1 italic mb-3">
                        "{npc.description || parsed.behavior?.prompt || 'World NPC'}"
                      </p>

                      {/* Role Chips */}
                      <div className="flex flex-wrap justify-center gap-1 mt-auto">
                        {activeCaps.length > 0 ? (
                          activeCaps.slice(0, 3).map((cap) => (
                            <span
                              key={cap}
                              className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 capitalize"
                            >
                              {cap}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-slate-800 text-slate-400">
                            Citizen
                          </span>
                        )}
                        {activeCaps.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-800 text-slate-400">
                            +{activeCaps.length - 3}
                          </span>
                        )}
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
            title="Back to NPC List"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white">{isNew ? 'Create NPC' : form.name}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isNew ? 'Drafting a new NPC actor template' : `Editing NPC actor definition: ${form.slug}`}
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
            <div className={`flex items-center gap-1.5 text-[10px] font-bold text-amber-400/80`}>
              <CheckCircle2 size={12} /> {activeCapCount} Active Roles
            </div>
          </div>

          {!isNew && (
            <button
              onClick={handleDuplicate}
              className="px-3 py-2 rounded-lg text-xs font-bold text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
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
            disabled={loading || !isSlugValid || !form.name}
            className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer"
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save NPC'}
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
          {/* LEFT COLUMN: Identity & Capabilities (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Box 1: Core Identity */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
                <Globe className="text-amber-400/80" size={16} />
                <h3 className="text-xs font-black text-amber-400/80 uppercase tracking-widest">NPC Identity</h3>
              </div>

              <div>
                <label className={labelCls}>NPC Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Master Blacksmith Cedric"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>System Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    className={inputCls}
                    placeholder="e.g. npc_blacksmith_cedric"
                    disabled={!isNew}
                    style={{ opacity: isNew ? 1 : 0.6 }}
                  />
                </div>
                <div>
                  <label className={labelCls}>Subtitle / Title</label>
                  <input
                    value={form.componentsData.title || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, componentsData: { ...prev.componentsData, title: e.target.value } }))}
                    className={inputCls}
                    placeholder="e.g. Arms & Armor Merchant"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Lore & Description</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className={cn(inputCls, "resize-none h-20")}
                  placeholder="Cedric has worked the anvil in Riverbend for thirty winters..."
                  maxLength={180}
                />
              </div>
            </div>

            {/* Box 2: Roles & Capabilities */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-5 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-between border-b border-amber-500/10 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="text-amber-400/80" size={16} />
                  <h3 className="text-xs font-black text-amber-400/80 uppercase tracking-widest">Roles & Capabilities</h3>
                </div>
                <span className="text-[10px] font-mono text-amber-400">
                  {activeCapCount} enabled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAPABILITY_CONFIGS.map((cap) => {
                  const Icon = cap.icon;
                  const isActive = getCap(cap.key);
                  return (
                    <button
                      key={cap.key}
                      type="button"
                      onClick={() => toggleCapability(cap.key, !isActive)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                        isActive
                          ? "bg-amber-500/15 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                          : "bg-black/30 border-slate-800/80 hover:border-slate-700 text-slate-400"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg border", isActive ? cap.color : "bg-black/40 border-slate-800 text-slate-500")}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs font-bold mb-0.5", isActive ? "text-amber-200" : "text-slate-300")}>
                          {cap.label}
                        </div>
                        <div className="text-[9.5px] text-slate-400 leading-tight">
                          {cap.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Conditional Configuration for Trainer */}
              {getCap('trainer') && (
                <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2 animate-in fade-in">
                  <label className={labelCls}>Trainer Party (Creature Slugs JSON)</label>
                  <input
                    value={form.componentsData.trainerParty || '[]'}
                    onChange={(e) => setForm((prev) => ({ ...prev, componentsData: { ...prev.componentsData, trainerParty: e.target.value } }))}
                    className={inputCls}
                    placeholder='e.g. ["creature_fennec", "creature_cinder_pup"]'
                  />
                  <p className="text-[9.5px] text-purple-300/70">
                    Defines the creatures this trainer summons during a turn-based creature battle.
                  </p>
                </div>
              )}
            </div>

            {/* Box 3: Dialogue & Interaction */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
                <MessageSquare className="text-amber-400/80" size={16} />
                <h3 className="text-xs font-black text-amber-400/80 uppercase tracking-widest">Dialogue & Interaction</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Dialogue Tree ID</label>
                  <input
                    value={form.componentsData.behavior?.dialogueId || ''}
                    onChange={(e) => setComponent('behavior', { dialogueId: e.target.value })}
                    className={inputCls}
                    placeholder={form.slug || 'e.g. cedric_greet'}
                  />
                </div>
                <div>
                  <label className={labelCls}>Interaction Prompt</label>
                  <input
                    value={form.componentsData.behavior?.prompt || 'Talk'}
                    onChange={(e) => setComponent('behavior', { prompt: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Talk, Trade, Inspect"
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Movement / Patrol Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'stationary', label: 'Stationary' },
                    { id: 'wander', label: 'Wander Area' },
                    { id: 'patrol', label: 'Patrol Path' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setComponent('behavior', { spawnType: mode.id })}
                      className={cn(
                        "py-2 rounded-lg border text-xs font-bold transition cursor-pointer",
                        form.componentsData.behavior?.spawnType === mode.id
                          ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                          : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
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
                <h3 className="text-xs font-black text-cyan-400/80 uppercase tracking-widest">3D Model & Visuals</h3>
              </div>

              <div className="space-y-2 rounded-xl border border-border/50 bg-black/20 p-3">
                <p className="text-xs font-semibold text-foreground">Reuse a visual configuration</p>
                <p className="text-[11px] text-muted-foreground">Copy a saved NPC's body, outfit, materials, and animations, or keep a visual snapshot for other NPCs.</p>
                <div className="flex gap-2">
                  <select value={visualSourceSlug} onChange={(event) => setVisualSourceSlug(event.target.value)} className={inputCls} aria-label="NPC to copy visuals from">
                    <option value="">Choose a saved NPC...</option>
                    {npcs.filter((npc) => npc.slug !== form.slug).map((npc) => <option key={npc.slug} value={npc.slug}>{npc.name}</option>)}
                  </select>
                  <button type="button" onClick={handleCopyVisual} disabled={!visualSourceSlug} className="shrink-0 rounded-lg border border-primary/40 px-3 text-xs font-semibold text-primary disabled:opacity-40">Copy visuals</button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleExportVisual} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-foreground hover:border-primary/50">Export visual</button>
                  <button type="button" onClick={() => visualImportRef.current?.click()} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs text-foreground hover:border-primary/50">Import visual</button>
                  <input ref={visualImportRef} type="file" accept=".json,application/json" onChange={handleImportVisual} className="hidden" aria-label="Import NPC visual snapshot" />
                </div>
              </div>

              {/* Live 3D Canvas Preview */}
              {getWorldModel().type === '3D Model' && (getWorldModel().assetId || getWorldModel().modelUrl) && (
                <div className="pb-2">
                  <ArchetypeModelPreview3D
                    worldModel={getWorldModel()}
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
                label="NPC World Model"
                modelRole="npc"
                allowSocketConfig={true}
                assetPickerFilterType=""
                assetPickerCategoryFilter="ALL"
              />

              {getWorldModel().type === '3D Model' && (
                <ModelWardrobeEditor
                  worldModel={getWorldModel()}
                  modelAssetId={getWorldModel().assetId}
                  value={getModularAttachments()}
                  onChange={handleModularAttachmentsChange}
                  title="NPC Wardrobe & Equipped Gear"
                />
              )}
            </div>

            {/* Box 5: Faction & Studio Deployment */}
            <div className="bg-[#0a101b]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
                <Shield className="text-amber-400/80" size={16} />
                <h3 className="text-xs font-black text-amber-400/80 uppercase tracking-widest">Faction & Status</h3>
              </div>

              <div>
                <label className={labelCls}>Faction / Alliance</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Friendly', 'Neutral', 'Guild'].map((faction) => (
                    <button
                      key={faction}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, componentsData: { ...prev.componentsData, faction } }))}
                      className={cn(
                        "py-2 rounded-lg border text-xs font-bold transition cursor-pointer",
                        (form.componentsData.faction || 'Friendly') === faction
                          ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                          : "bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {faction}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Active in World Studio</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Ready to Place</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
