'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { UserPlus, Save } from 'lucide-react';

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
  const activeMapData = useGameStore((state) => state.activeMapData);
  const setActiveMapData = useGameStore((state) => state.setActiveMapData);
  const currentMapId = useGameStore((state) => state.currentMapId);

  const [npcName, setNpcName] = useState('Keeper Alex');
  const [npcSprite, setNpcSprite] = useState('adventurer');
  const [npcDialogue, setNpcDialogue] = useState('Welcome to the animist grounds, Tamer!');

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
    if (!activeMapData) {
      showToast('Load a map in Studio before placing NPCs.');
      return;
    }

    const id = slugifyNpcId(npcName);
    const sprite = normalizeSpriteKey(npcSprite);
    const npc = {
      id,
      name: npcName.trim() || id,
      x: Number(spawnX) || 0,
      y: Number(spawnY) || 0,
      sprite,
      direction: 'down',
      dialogue: [] as string[],
    };

    const existing = Array.isArray(activeMapData.npcs) ? activeMapData.npcs : [];
    const withoutDup = existing.filter(
      (n: any) => n?.id !== id && !(n?.x === npc.x && n?.y === npc.y)
    );
    const next = {
      ...activeMapData,
      id: activeMapData.id || currentMapId,
      npcs: [...withoutDup, npc],
    };
    setActiveMapData(next);

    const text = npcDialogue.trim();
    if (text) {
      try {
        const res = await fetch('/api/npc-dialogue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            npcId: id,
            name: npc.name,
            text,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err?.error || `Dialogue save failed (${res.status})`);
        }
      } catch (e) {
        console.error('[Studio] dialogue upsert failed', e);
      }
    }

    showToast(`Placed ${npc.name} at (${npc.x}, ${npc.y}) — Save Map to persist.`);
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <UserPlus className="w-3.5 h-3.5" /> Place NPC
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Click the map to set coords, drop the NPC, then use World Builder → <span className="text-[#cbb26a]">Save Map</span>.
        </p>

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
            placeholder="Sprite key (e.g. adventurer) or /game-assets/npc/….png"
            className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1"
          />
          <textarea
            value={npcDialogue}
            onChange={(e) => setNpcDialogue(e.target.value)}
            placeholder="Opening dialogue line (optional)"
            className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 h-20 resize-none custom-scrollbar"
          />

          <div className="flex gap-2">
            <div>
              <label className="block text-[10px] text-slate-400">X</label>
              <input
                type="number"
                value={spawnX}
                onChange={(e) => setSpawnX(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1"
              />
            </div>
            <div>
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
            type="button"
            onClick={() => void handleAddNpc()}
            className="w-full py-1.5 bg-[#806f47]/80 hover:bg-[#806f47] text-white rounded font-bold flex items-center justify-center gap-1"
          >
            <Save className="w-3.5 h-3.5" /> Drop NPC in World
          </button>
        </div>
      </div>
    </div>
  );
};
