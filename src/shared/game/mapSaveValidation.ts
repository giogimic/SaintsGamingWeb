/**
 * Server-side map save guards (bible 08 §5 / 16 §9, §11).
 * Reject trapped spawns, unknown logic tile ids, and out-of-bounds NPCs.
 */

export type LogicTileMeta = { id: number; isSolid: boolean };

export type MapSaveNpc = {
  x?: number;
  y?: number;
  id?: string;
  name?: string;
};

export type MapSaveValidationInput = {
  grid: number[][];
  npcs?: MapSaveNpc[];
};

export type MapSaveValidationResult =
  | { ok: true }
  | { ok: false; error: string; details?: string[] };

const MIN_DIM = 8;
const MAX_DIM = 128;

export function validateMapSave(
  input: MapSaveValidationInput,
  logicTiles: LogicTileMeta[]
): MapSaveValidationResult {
  const details: string[] = [];
  const { grid, npcs = [] } = input;

  if (!Array.isArray(grid) || grid.length === 0) {
    return { ok: false, error: "Map grid is empty or missing." };
  }

  const height = grid.length;
  const width = Array.isArray(grid[0]) ? grid[0].length : 0;
  if (width < MIN_DIM || height < MIN_DIM || width > MAX_DIM || height > MAX_DIM) {
    return {
      ok: false,
      error: `Map size must be between ${MIN_DIM}×${MIN_DIM} and ${MAX_DIM}×${MAX_DIM} (got ${width}×${height}).`,
    };
  }

  for (let r = 0; r < height; r++) {
    if (!Array.isArray(grid[r]) || grid[r].length !== width) {
      return { ok: false, error: `Grid row ${r} has inconsistent width.` };
    }
  }

  const byId = new Map<number, LogicTileMeta>();
  for (const t of logicTiles) byId.set(t.id, t);
  if (byId.size === 0) {
    return { ok: false, error: "No MapLogicTile definitions available for validation." };
  }

  const unknownIds = new Set<number>();
  let walkableCount = 0;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const id = Number(grid[r][c]);
      if (!Number.isFinite(id)) {
        details.push(`Non-numeric tile at (${c},${r}).`);
        continue;
      }
      const meta = byId.get(id);
      if (!meta) {
        unknownIds.add(id);
        continue;
      }
      if (!meta.isSolid) walkableCount += 1;
    }
  }

  if (unknownIds.size > 0) {
    const sample = [...unknownIds].slice(0, 8).join(", ");
    return {
      ok: false,
      error: `Unknown logic tile id(s): ${sample}${unknownIds.size > 8 ? "…" : ""}. Use registered MapLogicTile ids only.`,
      details: [...unknownIds].map((id) => `unknown:${id}`),
    };
  }

  if (walkableCount === 0) {
    return {
      ok: false,
      error: "Trapped map: every cell is solid — need at least one walkable spawn tile.",
    };
  }

  for (const npc of npcs) {
    if (typeof npc.x !== "number" || typeof npc.y !== "number") continue;
    const x = Math.floor(npc.x);
    const y = Math.floor(npc.y);
    const label = npc.name || npc.id || "npc";
    if (x < 0 || y < 0 || x >= width || y >= height) {
      details.push(`NPC "${label}" at (${x},${y}) is out of bounds (${width}×${height}).`);
      continue;
    }
    const tileId = Number(grid[y][x]);
    const meta = byId.get(tileId);
    if (meta?.isSolid) {
      details.push(`NPC "${label}" sits on solid tile ${tileId} at (${x},${y}).`);
    }
  }

  if (details.length > 0) {
    return {
      ok: false,
      error: details[0],
      details,
    };
  }

  return { ok: true };
}
