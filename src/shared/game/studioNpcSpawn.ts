/**
 * Studio NPC live-spawn helpers (Populate → place without rejoin).
 */

import type { EntityInstanceV1 } from './entities/types';

export type StudioNpcSpawnPayload = {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite?: string;
};

export function buildStudioSpawnNpcEmit(
  mapId: string,
  npc: StudioNpcSpawnPayload
): { mapId: string; npc: StudioNpcSpawnPayload } | null {
  const id = String(mapId || "").trim();
  if (!id || !npc?.id) return null;
  return {
    mapId: id,
    npc: {
      id: String(npc.id),
      name: String(npc.name || npc.id),
      x: Number(npc.x) || 0,
      y: Number(npc.y) || 0,
      sprite: npc.sprite ? String(npc.sprite) : undefined,
    },
  };
}

export function appendNpcToMapDoc(
  live: { entities?: unknown[] } | null | undefined,
  npc: EntityInstanceV1
): boolean {
  if (!live) return false;
  const list = Array.isArray(live.entities) ? [...live.entities] : [];
  if (list.some((n: any) => n && n.id === npc.id)) return false;
  list.push(npc);
  live.entities = list;
  return true;
}

export function removeNpcFromMapDoc(
  live: { entities?: unknown[] } | null | undefined,
  npcId: string
): boolean {
  if (!live || !Array.isArray(live.entities) || !npcId) return false;
  const next = live.entities.filter((n: any) => !n || n.id !== npcId);
  if (next.length === live.entities.length) return false;
  live.entities = next;
  return true;
}

export function upsertNpcInMapDoc(
  live: { entities?: unknown[] } | null | undefined,
  npc: EntityInstanceV1
): boolean {
  if (!live || !npc?.id) return false;
  const list = Array.isArray(live.entities) ? [...live.entities] : [];
  const idx = list.findIndex((n: any) => n && n.id === npc.id);
  if (idx >= 0) list[idx] = { ...(list[idx] as object), ...npc };
  else list.push(npc);
  live.entities = list;
  return true;
}

export function buildStudioDespawnNpcEmit(
  mapId: string,
  npcId: string
): { mapId: string; npcId: string } | null {
  const m = String(mapId || "").trim();
  const id = String(npcId || "").trim();
  if (!m || !id) return null;
  return { mapId: m, npcId: id };
}
