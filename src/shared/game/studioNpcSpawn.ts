/**
 * Studio NPC live-spawn helpers (Populate → place without rejoin).
 */

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
  live: { npcs?: unknown[] } | null | undefined,
  npc: StudioNpcSpawnPayload
): boolean {
  if (!live) return false;
  const list = Array.isArray(live.npcs) ? [...live.npcs] : [];
  if (list.some((n: any) => n && n.id === npc.id)) return false;
  list.push(npc);
  live.npcs = list;
  return true;
}
