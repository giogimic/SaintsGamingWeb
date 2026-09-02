/**
 * Normalize WorldMap.gatesData into the position-array shape used by WorldSimulation.
 *
 * Supported stored shapes:
 * - Array: [{ position:{x,y}, targetMapId, targetSpawn|spawnPoint }]
 * - Record by tile id: { "3": { targetMapId, spawnPoint } } (legacy maps.ts)
 * - Record by "x,y": { "10,5": { targetMapId, targetSpawn } }
 */

export type GateSpawn = { x: number; y: number };

export type NormalizedGate = {
  id?: string;
  position: GateSpawn;
  width: number;
  height: number;
  targetMapId: string;
  targetSpawn: GateSpawn;
  /** Alias retained for older callers */
  spawnPoint: GateSpawn;
  category?: string;
  name?: string;
  targetGateId?: string;
  bidirectional?: boolean;
  disabled?: boolean;
};

function asSpawn(raw: unknown, fallback: GateSpawn = { x: 6, y: 2 }): GateSpawn {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ...fallback };
  return { x, y };
}

export function resolveGateSpawn(gate: {
  targetSpawn?: unknown;
  spawnPoint?: unknown;
}): GateSpawn {
  return asSpawn(gate.targetSpawn ?? gate.spawnPoint);
}

/** Convert any gates payload into a position-keyed array for movement/warps. */
export function normalizeGatesToArray(gates: unknown): NormalizedGate[] {
  if (!gates) return [];

  if (Array.isArray(gates)) {
    const out: NormalizedGate[] = [];
    for (const g of gates) {
      if (!g || typeof g !== "object") continue;
      const row = g as Record<string, unknown>;
      const targetMapId = String(row.targetMapId || row.targetMap || "");
      if (!targetMapId) continue;

      let position: GateSpawn | null = null;
      if (row.position && typeof row.position === "object") {
        position = asSpawn(row.position, { x: 0, y: 0 });
      } else if (typeof row.x === "number" && typeof row.y === "number") {
        position = { x: row.x, y: row.y };
      }
      if (!position) continue;

      const width = Math.max(1, Number(row.width) || 1);
      const height = Math.max(1, Number(row.height) || 1);
      const spawn = resolveGateSpawn(row as { targetSpawn?: unknown; spawnPoint?: unknown });
      out.push({
        id: String(row.id || `gate_${position.x}_${position.y}`),
        position,
        width,
        height,
        targetMapId,
        targetSpawn: spawn,
        spawnPoint: spawn,
        category: typeof row.category === 'string' ? row.category : 'MAP',
        name: typeof row.name === 'string' ? row.name : undefined,
        targetGateId: typeof row.targetGateId === 'string' ? row.targetGateId : undefined,
        bidirectional: row.bidirectional !== false,
        disabled: Boolean(row.disabled),
      });
    }
    return out;
  }

  if (typeof gates === "object") {
    const out: NormalizedGate[] = [];
    for (const [key, value] of Object.entries(gates as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const targetMapId = String(row.targetMapId || row.targetMap || "");
      if (!targetMapId) continue;

      let position: GateSpawn | null = null;
      if (row.position && typeof row.position === "object") {
        position = asSpawn(row.position, { x: 0, y: 0 });
      } else if (typeof row.x === "number" && typeof row.y === "number") {
        position = { x: Number(row.x), y: Number(row.y) };
      } else if (key.includes(",")) {
        const [xs, ys] = key.split(",");
        const x = Number(xs);
        const y = Number(ys);
        if (Number.isFinite(x) && Number.isFinite(y)) position = { x, y };
      }
      // Bare numeric keys (legacy tile-id gates) have no coordinates — skip for array warps
      if (!position) continue;

      const width = Math.max(1, Number(row.width) || 1);
      const height = Math.max(1, Number(row.height) || 1);
      const spawn = resolveGateSpawn(row as { targetSpawn?: unknown; spawnPoint?: unknown });
      out.push({
        id: String(row.id || `gate_${position.x}_${position.y}`),
        position,
        width,
        height,
        targetMapId,
        targetSpawn: spawn,
        spawnPoint: spawn,
        category: typeof row.category === 'string' ? row.category : 'MAP',
        name: typeof row.name === 'string' ? row.name : undefined,
        targetGateId: typeof row.targetGateId === 'string' ? row.targetGateId : undefined,
        bidirectional: row.bidirectional !== false,
        disabled: Boolean(row.disabled),
      });
    }
    return out;
  }

  return [];
}

/** Filter to only active (non-disabled) gates. */
export function filterActiveGates(gates: unknown): NormalizedGate[] {
  return normalizeGatesToArray(gates).filter((g) => !g.disabled);
}

/** Check if a specific normalized gate is active. */
export function isGateActive(gate: NormalizedGate): boolean {
  return !gate.disabled;
}

/** Unique target map ids for navigator / preload. */
export function listGateTargets(gates: unknown, onlyActive: boolean = false): string[] {
  const ids = new Set<string>();
  const list = onlyActive ? filterActiveGates(gates) : normalizeGatesToArray(gates);
  for (const g of list) ids.add(g.targetMapId);
  if (!onlyActive && gates && typeof gates === "object" && !Array.isArray(gates)) {
    for (const value of Object.values(gates as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const id = String((value as any).targetMapId || "");
      if (id) ids.add(id);
    }
  }
  return Array.from(ids);
}

