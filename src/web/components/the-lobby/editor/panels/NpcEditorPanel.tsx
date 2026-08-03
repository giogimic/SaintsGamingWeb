'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { placeMapNpc } from '@/app/actions/map-npcs';
import { UserPlus, Save, Loader2 } from 'lucide-react';

function slugifyNpcId(name: string): string {
  const base = name
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

  const [npcName, setNpcName] = useState('Keeper Alex');
  const [npcSprite, setNpcSprite] = useState('heroine');
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

  const handleAddNpc = async () => {
    const mapId = (currentMapId || '').split('#')[0];
    if (!mapId) {
      showToast('No active map — enter a world first.');
      return;
    }
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

  return (
    <div className="space-y-4 text-xs font-mono">
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded p-2 text-[#e2d5b3]/90 text-[10px] leading-relaxed">
        Persists to <code className="text-[#cbb26a]">WorldMap.npcsData</code> + dialogue tree.
        Rejoin the map (or restart shard) to see the spawn. Map:{' '}
        <span className="text-[#cbb26a]">{currentMapId || '—'}</span>
      </div>
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <UserPlus className="w-3.5 h-3.5" /> Place NPC
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={npcName}
            onChange={(e) => setNpcName(e.target.value)}
            placeholder="NPC Name"
            className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1"
          />
          <input
            type="text"
            value={npcSprite}
            onChange={(e) => setNpcSprite(e.target.value)}
            placeholder="Sprite key (e.g. heroine, professor)"
            className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1"
          />
          <textarea
            value={npcDialogue}
            onChange={(e) => setNpcDialogue(e.target.value)}
            placeholder="Greeting line"
            className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 h-20 resize-none custom-scrollbar"
          />
          <input
            type="text"
            value={questSlug}
            onChange={(e) => setQuestSlug(e.target.value)}
            placeholder="Optional questSlug (ACCEPT_QUEST)"
            className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-slate-400">X</label>
              <input
                type="number"
                value={spawnX}
                onChange={(e) => setSpawnX(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-slate-400">Y</label>
              <input
                type="number"
                value={spawnY}
                onChange={(e) => setSpawnY(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1"
              />
            </div>
          </div>

          <button
            onClick={() => void handleAddNpc()}
            disabled={saving}
            className="w-full py-1.5 bg-[#806f47]/80 hover:bg-[#806f47] text-[#050b14] rounded font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save NPC to Map
          </button>
        </div>
      </div>
    </div>
  );
};
