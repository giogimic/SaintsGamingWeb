/**
 * Studio author overlays — viewport markers for gates / NPC spawns.
 * Editor-only meshes; never serialized (see shouldExportEditorOverlays).
 */

export type AuthorOverlayGate = {
  id?: string;
  position: { x: number; y: number };
  targetMapId?: string;
  spawnPoint?: { x: number; y: number };
};

export type AuthorOverlayNpc = {
  id?: string;
  x: number;
  y: number;
  name?: string;
};

export type AuthorOverlaysInput = {
  /** Gate tile markers (amber). */
  gates?: AuthorOverlayGate[] | null;
  /** Optional separate gate list for destination spawn pins (when gates markers are off). */
  spawnSourceGates?: AuthorOverlayGate[] | null;
  npcs?: AuthorOverlayNpc[] | null;
  /** Destination spawn pins derived from gate.spawnPoint (same-map preview). */
  showGateSpawns?: boolean;
  monsterSpawners?: AuthorOverlayNpc[] | null;
};

/** World Y for author markers — above paint (~0.03), below logic planes (0.5). */
export const AUTHOR_OVERLAY_Y = 0.32;

export function authorOverlayGateMarkers(
  gates: AuthorOverlayGate[] | null | undefined
): Array<{ key: string; x: number; y: number; kind: "gate" }> {
  if (!gates?.length) return [];
  return gates
    .filter(
      (g) =>
        g?.position &&
        Number.isFinite(g.position.x) &&
        Number.isFinite(g.position.y)
    )
    .map((g) => ({
      key: g.id || `gate_${g.position.x}_${g.position.y}`,
      x: g.position.x,
      y: g.position.y,
      kind: "gate" as const,
    }));
}

export function authorOverlayNpcMarkers(
  npcs: AuthorOverlayNpc[] | null | undefined
): Array<{ key: string; x: number; y: number; kind: "npc" }> {
  if (!npcs?.length) return [];
  return npcs
    .filter((n) => n && Number.isFinite(n.x) && Number.isFinite(n.y))
    .map((n) => ({
      key: n.id || `npc_${n.x}_${n.y}`,
      x: n.x,
      y: n.y,
      kind: "npc" as const,
    }));
}

export function authorOverlayMonsterSpawnerMarkers(
  spawners: AuthorOverlayNpc[] | null | undefined
): Array<{ key: string; x: number; y: number; kind: "monster_spawner" }> {
  if (!spawners?.length) return [];
  return spawners
    .filter((n) => n && Number.isFinite(n.x) && Number.isFinite(n.y))
    .map((n) => ({
      key: n.id || `ms_${n.x}_${n.y}`,
      x: n.x,
      y: n.y,
      kind: "monster_spawner" as const,
    }));
}

/** Spawn pins at each gate's destination spawn (author preview on current map). */
export function authorOverlaySpawnMarkers(
  gates: AuthorOverlayGate[] | null | undefined
): Array<{ key: string; x: number; y: number; kind: "spawn" }> {
  if (!gates?.length) return [];
  const out: Array<{ key: string; x: number; y: number; kind: "spawn" }> = [];
  for (const g of gates) {
    const sp = g?.spawnPoint;
    if (!sp || !Number.isFinite(sp.x) || !Number.isFinite(sp.y)) continue;
    const gateId = g.id || `gate_${g.position?.x}_${g.position?.y}`;
    out.push({
      key: `spawn_${gateId}_${sp.x}_${sp.y}`,
      x: sp.x,
      y: sp.y,
      kind: "spawn",
    });
  }
  return out;
}
