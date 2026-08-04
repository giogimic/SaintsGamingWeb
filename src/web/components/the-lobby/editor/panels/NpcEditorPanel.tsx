'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { placeMapNpc } from '@/app/actions/map-npcs';
import { UserPlus, Save, Loader2 } from 'lucide-react';
import {
  defaultEntityProps,
  fieldsForCategory,
  getEntitySchema,
} from '@/shared/game/entitySchemas';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { SchemaFieldRenderer } from '../components/SchemaFieldRenderer';

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

export const NpcEditorPanel: React.FC = () => {
  const showToast = useGameStore((state) => state.showToast);
  const currentMapId = useGameStore((state) => state.currentMapId);

  const schema = useMemo(() => getEntitySchema('npc'), []);
  const [entityProps, setEntityProps] = useState<Record<string, unknown>>(() => ({
    ...defaultEntityProps('npc'),
    displayName: 'Keeper Alex',
    spriteId: 'heroine',
  }));
  const [npcDialogue, setNpcDialogue] = useState('Welcome to the animist grounds, Tamer!');
  const [questSlug, setQuestSlug] = useState('');
  const [saving, setSaving] = useState(false);

  const clickedTile = useEditorStore((state) => state.clickedTile);
  const [spawnX, setSpawnX] = useState(10);
  const [spawnY, setSpawnY] = useState(10);

  React.useEffect(() => {
    if (clickedTile) {
      setSpawnX(clickedTile.c);
      setSpawnY(clickedTile.r);
    }
  }, [clickedTile]);

  const onFieldChange = (key: string, value: unknown) => {
    setEntityProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddNpc = async () => {
    const mapId = (currentMapId || '').split('#')[0];
    if (!mapId) {
      showToast('No active map — enter a world first.');
      return;
    }
    const npcName = String(entityProps.displayName || 'Villager');
    const npcSprite = normalizeSpriteKey(String(entityProps.spriteId || 'adventurer'));
    setSaving(true);
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
    if (res.success) {
      showToast(`Saved ${npcName} on ${mapId} (${res.count} NPCs). Rejoin map to spawn.`);
    } else {
      showToast(res.error || 'Failed to save NPC');
    }
  };

  const schemaFields = [
    ...fieldsForCategory(schema, 'General'),
    ...fieldsForCategory(schema, 'Appearance'),
  ].filter((f) => f.key !== 'id' && f.key !== 'tags');

  return (
    <CatalogEditorShell
      title="NPC Catalog"
      blurb={`Schema-driven place tool · map ${currentMapId || '—'} · WorldMap.npcsData`}
      toolbar={
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <UserPlus className="h-3.5 w-3.5 text-[#cbb26a]" />
          Click a tile, fill props, Save
        </span>
      }
    >
      <div className="space-y-3">
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

        <div className="space-y-2 rounded border border-slate-800 bg-black/30 p-2">
          <label className="block space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Greeting
            </span>
            <textarea
              value={npcDialogue}
              onChange={(e) => setNpcDialogue(e.target.value)}
              placeholder="Greeting line"
              className="custom-scrollbar h-20 w-full resize-none rounded-md border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100 outline-none focus:border-[#cbb26a]/60"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quest slug
            </span>
            <input
              type="text"
              value={questSlug}
              onChange={(e) => setQuestSlug(e.target.value)}
              placeholder="Optional questSlug (ACCEPT_QUEST)"
              className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-slate-100 outline-none focus:border-[#cbb26a]/60"
            />
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-slate-400">X</label>
              <input
                type="number"
                value={spawnX}
                onChange={(e) => setSpawnX(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-slate-400">Y</label>
              <input
                type="number"
                value={spawnY}
                onChange={(e) => setSpawnY(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1.5 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleAddNpc()}
          disabled={saving}
          className="flex w-full items-center justify-center gap-1 rounded bg-[#806f47]/80 py-1.5 font-bold text-[#050b14] hover:bg-[#806f47] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save NPC to Map
        </button>
        <p className="text-[9px] text-slate-600">
          Internal id preview: {slugifyNpcId(String(entityProps.displayName || 'villager'))}
        </p>
      </div>
    </CatalogEditorShell>
  );
};
