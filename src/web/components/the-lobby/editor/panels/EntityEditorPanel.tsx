'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteMapNpc,
  listMapNpcs,
  placeMapNpc,
  updateMapNpc,
  type MapNpcData,
} from '@/app/actions/studio/map-npcs';
import { UserPlus, Save, Loader2, Trash2, RefreshCw, MessageSquare, ScrollText, ExternalLink, Plus, Users } from 'lucide-react';
import { listQuestTemplates } from '@/app/actions/game/quest-templates';
import {
  defaultEntityProps,
  fieldsForCategory,
  getEntitySchema,
} from '@/shared/game/entitySchemas';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { SchemaFieldRenderer } from '../components/SchemaFieldRenderer';
import { toBaseMapId } from '@/shared/net/mapIds';
import {
  appendNpcToMapDoc,
  buildStudioDespawnNpcEmit,
  buildStudioSpawnNpcEmit,
  removeNpcFromMapDoc,
  upsertNpcInMapDoc,
} from '@/shared/game/studioNpcSpawn';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';

function slugifyNpcId(name: string): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'villager';
  return base.startsWith('npc_') ? base : `npc_${base}`;
}

/** Prefer bare sprite keys (WorldManager + resolveEntitySpriteUrl). */
function normalizeSpriteKey(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) return 'adventurer';
  const m = raw.match(/\/game-assets\/npc\/([^/]+?)(?:\.png)?(?:$|\?)/i);
  if (m?.[1]) return m[1].replace(/-ow$/i, '');
  return raw.replace(/^\/+/, '').replace(/\.png$/i, '').replace(/^game-assets\/npc\//i, '');
}

export const EntityEditorPanel: React.FC = () => {
  const showToast = useGameStore((state) => state.showToast);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const mapId = toBaseMapId((currentMapId || '').split('#')[0] || '');

  const [kind, setKind] = useState<'npc' | 'chest' | 'door' | 'decoration' | 'resource_node'>('npc');
  const schema = useMemo(() => getEntitySchema(kind as any), [kind]);

  const [entityProps, setEntityProps] = useState<Record<string, unknown>>(() => ({
    ...defaultEntityProps(kind as any),
    displayName: 'New Entity',
    assetProfileId: 'chest',
  }));
  const [npcDialogue, setNpcDialogue] = useState('Welcome to the animist grounds, Saint!');
  const [questSlug, setQuestSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<MapNpcData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clickedTile = useEditorStore((state) => state.clickedTile);
  const activeGameId = useEditorStore((state) => state.activeGameId);
  const [spawnX, setSpawnX] = useState(10);
  const [spawnY, setSpawnY] = useState(10);
  const [availableQuests, setAvailableQuests] = useState<Array<{ slug: string; title: string }>>([]);

  useEffect(() => {
    void (async () => {
      const res = await listQuestTemplates(activeGameId);
      if (res.success && res.data) {
        setAvailableQuests((res.data as any[]).map((q) => ({ slug: q.slug, title: q.title })));
      }
    })();
  }, [activeGameId]);

  const handleOpenDialogueTree = () => {
    const npcName = String(entityProps.displayName || 'Villager');
    const npcId = selectedId || slugifyNpcId(npcName);
    useEditorStore.getState().openPanel('dialogue');
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('studio_focus_dialogue', {
          detail: { npcId, npcName },
        })
      );
    }, 50);
    showToast(`Opened Dialogue Editor for ${npcName}`);
  };

  const handleOpenQuest = (targetSlug?: string) => {
    const npcName = String(entityProps.displayName || 'Villager');
    const npcId = selectedId || slugifyNpcId(npcName);
    const slug = targetSlug || questSlug.trim() || `quest_${slugifyNpcId(npcName).replace(/^npc_/, '')}`;
    if (!questSlug) {
      setQuestSlug(slug);
    }
    useEditorStore.getState().openPanel('quest');
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('studio_focus_quest', {
          detail: { questSlug: slug, npcId, npcName },
        })
      );
    }, 50);
    showToast(`Opened Quest Editor for ${slug}`);
  };

  const reloadList = useCallback(async () => {
    if (!mapId) {
      setList([]);
      return;
    }
    const res = await listMapNpcs(mapId);
    if (res.success) setList(res.data);
  }, [mapId]);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  useEffect(() => {
    if (clickedTile && !selectedId) {
      setSpawnX(clickedTile.c);
      setSpawnY(clickedTile.r);
    } else if (clickedTile && selectedId) {
      setSpawnX(clickedTile.c);
      setSpawnY(clickedTile.r);
    }
  }, [clickedTile, selectedId]);

  useEffect(() => {
    const handleSpritePicked = (e: Event) => {
      const customEv = e as CustomEvent<{ key: string; source: string }>;
      if (customEv.detail?.key) {
        setEntityProps((prev) => ({ ...prev, assetProfileId: customEv.detail.key }));
        showToast(`Assigned sprite: ${customEv.detail.key}`);
      }
    };
    window.addEventListener('studio_sprite_picked', handleSpritePicked);
    return () => window.removeEventListener('studio_sprite_picked', handleSpritePicked);
  }, [showToast]);

  const handleSelect = useCallback((npc: MapNpcData) => {
    setSelectedId(npc.id);
    setEntityProps((prev) => ({
      ...prev,
      displayName: npc.name,
      assetProfileId: npc.sprite || 'adventurer',
    }));
    setSpawnX(npc.x);
    setSpawnY(npc.y);
    setNpcDialogue(npc.dialogue?.[0] || '');
  }, []);

  // Listen for context menu smart actions
  useEffect(() => {
    const handleSelectNpc = (e: Event) => {
      const customEv = e as CustomEvent<{ npcId: string }>;
      if (customEv.detail?.npcId) {
        const found = list.find((n) => n.id === customEv.detail.npcId);
        if (found) {
          handleSelect(found);
        } else {
          void listMapNpcs(mapId).then((res) => {
            if (res.success && res.data) {
              setList(res.data);
              const foundAgain = res.data.find((n: any) => n.id === customEv.detail.npcId);
              if (foundAgain) {
                handleSelect(foundAgain);
              }
            }
          });
        }
      }
    };

    const handleOutsideDelete = async (e: Event) => {
      const customEv = e as CustomEvent<{ npcId: string; name: string }>;
      if (customEv.detail?.npcId) {
        if (!confirm(`Delete ${customEv.detail.name || customEv.detail.npcId} from ${mapId}?`)) return;
        setSaving(true);
        const res = await deleteMapNpc({ mapId, npcId: customEv.detail.npcId });
        setSaving(false);
        if (res.success) {
          removeNpcFromMapDoc(useGameStore.getState().activeMapData, customEv.detail.npcId);
          const despawn = buildStudioDespawnNpcEmit(mapId, customEv.detail.npcId);
          if (despawn) {
            useGameStore.getState().emitSocketEvent?.('studio_despawn_npc', despawn);
          }
          useEditorStore.getState().markMapDirty();
          showToast(`Deleted ${customEv.detail.npcId} — live despawn.`);
          if (selectedId === customEv.detail.npcId) {
            handleNew();
          }
          await reloadList();
        } else {
          showToast(res.error || 'Failed to delete NPC');
        }
      }
    };

    window.addEventListener('studio_select_npc', handleSelectNpc);
    window.addEventListener('studio_delete_npc_context', handleOutsideDelete);
    return () => {
      window.removeEventListener('studio_select_npc', handleSelectNpc);
      window.removeEventListener('studio_delete_npc_context', handleOutsideDelete);
    };
  }, [list, mapId, handleSelect, selectedId, showToast, reloadList]);

  const onFieldChange = (key: string, value: unknown) => {
    setEntityProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleNew = () => {
    setSelectedId(null);
    setEntityProps({
      ...defaultEntityProps(kind as any),
      displayName: 'New ' + kind,
      assetProfileId: kind === 'npc' ? 'heroine' : 'chest',
    });
    setNpcDialogue('Welcome to the animist grounds, Saint!');
    setQuestSlug('');
  };

  const liveResync = (npc: MapNpcData, mode: 'spawn' | 'replace') => {
    const live = useGameStore.getState().activeMapData;
    if (mode === 'replace') {
      const despawn = buildStudioDespawnNpcEmit(mapId, npc.id);
      if (despawn) {
        useGameStore.getState().emitSocketEvent?.('studio_despawn_npc', despawn);
      }
      upsertNpcInMapDoc(live, npc);
    } else {
      appendNpcToMapDoc(live, npc);
    }
    const payload = buildStudioSpawnNpcEmit(mapId, {
      id: npc.id,
      name: npc.name,
      x: npc.x,
      y: npc.y,
      sprite: npc.sprite,
    });
    if (payload) {
      useGameStore.getState().emitSocketEvent?.('studio_spawn_npc', payload);
    }
  };

  const handleSave = async () => {
    if (!mapId) {
      showToast('No active map — enter a world first.');
      return;
    }
    const npcName = String(entityProps.displayName || 'Villager');
    const npcSprite = normalizeSpriteKey(String(entityProps.assetProfileId || 'adventurer'));
    setSaving(true);

    if (selectedId) {
      const res = await updateMapNpc({
        mapId,
        npcId: selectedId,
        name: npcName,
        sprite: npcSprite,
        x: spawnX,
        y: spawnY,
        greeting: npcDialogue,
        questSlug: questSlug.trim() || undefined,
      });
      setSaving(false);
      if (res.success && res.npc) {
        liveResync(res.npc, 'replace');
        useEditorStore.getState().markMapDirty();
        showToast(`Updated ${npcName} — live resync.`);
        await reloadList();
      } else {
        showToast(res.error || 'Failed to update NPC');
      }
      return;
    }

    const res = await placeMapNpc({
      mapId,
      name: npcName,
      sprite: npcSprite,
      x: spawnX,
      y: spawnY,
      greeting: npcDialogue,
      questSlug: questSlug.trim() || undefined,
    });
    setSaving(false);
    if (res.success && res.npc) {
      liveResync(res.npc, 'spawn');
      setSelectedId(res.npc.id);
      useEditorStore.getState().markMapDirty();
      showToast(`Placed ${npcName} on ${mapId} (${res.count} NPCs) — live spawn.`);
      await reloadList();
    } else {
      showToast(res.error || 'Failed to save NPC');
    }
  };

  const handleDelete = async () => {
    if (!mapId || !selectedId) return;
    if (!confirm(`Delete ${selectedId} from ${mapId}?`)) return;
    setSaving(true);
    const res = await deleteMapNpc({ mapId, npcId: selectedId });
    setSaving(false);
    if (res.success) {
      removeNpcFromMapDoc(useGameStore.getState().activeMapData, selectedId);
      const despawn = buildStudioDespawnNpcEmit(mapId, selectedId);
      if (despawn) {
        useGameStore.getState().emitSocketEvent?.('studio_despawn_npc', despawn);
      }
      useEditorStore.getState().markMapDirty();
      showToast(`Deleted ${selectedId} — live despawn.`);
      handleNew();
      await reloadList();
    } else {
      showToast(res.error || 'Failed to delete NPC');
    }
  };

  const schemaFields = [
    ...fieldsForCategory(schema, 'General'),
    ...fieldsForCategory(schema, 'Appearance'),
  ].filter((f) => f.key !== 'id' && f.key !== 'tags');

  return (
    <CatalogEditorShell
      title="Entity Catalog"
      blurb={`Place / edit / delete · map ${currentMapId || '—'} · WorldMap.npcsData`}
      dirty={!!selectedId}
      toolbar={
        <div className="flex gap-1">
          <button type="button" onClick={() => void reloadList()} className="rounded p-1.5 text-slate-400 hover:bg-white/5" title="Refresh list">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleNew} className="rounded p-1.5 text-emerald-400 hover:bg-white/5" title="New NPC">
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      }
      list={
        <div className="space-y-1">
          {list.length === 0 && (
            <p className="p-2 text-[10px] text-slate-500">No NPCs on this map yet.</p>
          )}
          {list.map((npc) => (
            <button
              key={npc.id}
              type="button"
              onClick={() => handleSelect(npc)}
              className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors flex items-center gap-2 cursor-pointer ${
                selectedId === npc.id
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-100 shadow-sm'
                  : 'border-[#806f47]/20/80 hover:border-[#806f47]/30 text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="w-7 h-7 rounded-md bg-black/50/20 border border-[#806f47]/30/80 flex items-center justify-center shrink-0 overflow-hidden text-amber-400">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-[11px] font-bold text-slate-100">{npc.name}</div>
                <div className="truncate text-[9px] text-slate-500 font-mono">
                  {npc.id} · ({npc.x},{npc.y})
                </div>
              </div>
            </button>
          ))}
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4 text-[11px]">
        <div className="space-y-1.5">
          <label className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Entity Kind</label>
          <select 
            value={kind} 
            onChange={(e) => setKind(e.target.value as any)}
            className="w-full bg-[#050b14] border border-[#806f47]/30 rounded px-2 py-1.5 text-slate-200"
          >
            <option value="npc">NPC / Character</option>
            <option value="chest">Treasure Chest</option>
            <option value="door">Door / Gate</option>
            <option value="resource_node">Harvest Node</option>
            <option value="decoration">Prop / Decoration</option>
          </select>
        </div>

        <div className="space-y-2 rounded border border-[#806f47]/30 bg-[#0b1320]/60 p-2">
          {schemaFields.map((field) => (
            <SchemaFieldRenderer
              key={field.key}
              field={field}
              value={entityProps[field.key]}
              onChange={onFieldChange}
            />
          ))}
        </div>

        {kind === 'npc' && (
          <div className="space-y-3 rounded border border-[#806f47]/20 bg-black/50/30 p-2.5">
            {/* Dialogue / Greeting Hook */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Greeting Line
                </span>
                <button
                  type="button"
                  onClick={handleOpenDialogueTree}
                  className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded cursor-pointer"
                  title="Open full branch dialogue tree editor for this NPC"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Edit Dialogue Tree →</span>
                </button>
              </div>
              <textarea
                value={npcDialogue}
                onChange={(e) => setNpcDialogue(e.target.value)}
                placeholder="Greeting line"
                className="custom-scrollbar h-16 w-full resize-none rounded-md border border-[#806f47]/30 bg-black/50/40 px-2 py-1.5 font-mono text-[11px] text-slate-100 outline-none focus:border-[#cbb26a]/60"
              />
            </div>

            {/* Quest Hook */}
            <div className="space-y-1.5 border-t border-[#806f47]/20/80 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quest Hook
                </span>
                <div className="flex items-center gap-1.5">
                  {questSlug ? (
                    <button
                      type="button"
                      onClick={() => handleOpenQuest(questSlug)}
                      className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded cursor-pointer"
                      title="Jump directly to this quest in the Quest Editor"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Jump to Quest →</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenQuest()}
                      className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded cursor-pointer"
                      title="Create a new quest assigned to this NPC"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create Quest for NPC →</span>
                    </button>
                  )}
                </div>
              </div>

              {availableQuests.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={questSlug}
                    onChange={(e) => setQuestSlug(e.target.value)}
                    className="flex-1 rounded-md border border-[#806f47]/30 bg-black/50/40 px-2 py-1 font-mono text-[10px] text-slate-200 outline-none focus:border-[#cbb26a]/60 cursor-pointer"
                  >
                    <option value="">-- Pick from Existing Quests --</option>
                    {availableQuests.map((q) => (
                      <option key={q.slug} value={q.slug}>
                        {q.title} ({q.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                type="text"
                value={questSlug}
                onChange={(e) => setQuestSlug(e.target.value)}
                placeholder="Or type questSlug manually (ACCEPT_QUEST)"
                className="w-full rounded-md border border-[#806f47]/30 bg-black/50/40 px-2 py-1.5 font-mono text-[11px] text-slate-100 outline-none focus:border-[#cbb26a]/60"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-slate-400">X</label>
            <input
              type="number"
              value={spawnX}
              onChange={(e) => setSpawnX(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-md border border-[#806f47]/30 bg-black/50/40 px-2 py-1.5 font-mono text-[11px]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-slate-400">Y</label>
            <input
              type="number"
              value={spawnY}
              onChange={(e) => setSpawnY(parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-md border border-[#806f47]/30 bg-black/50/40 px-2 py-1.5 font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-[#806f47]/80 py-1.5 font-bold text-[#050b14] hover:bg-[#806f47] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {selectedId ? 'Update Entity' : 'Save Entity to Map'}
          </button>
          {selectedId && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={saving}
              className="rounded border border-red-800/50 px-3 py-1.5 text-red-300 hover:bg-red-900/30 disabled:opacity-50"
              title="Delete Entity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-[9px] text-slate-600">
          {selectedId
            ? `Editing ${selectedId}`
            : `Internal id preview: ${slugifyNpcId(String(entityProps.displayName || 'villager'))}`}
        </p>
      </div>
    </CatalogEditorShell>
  );
};
