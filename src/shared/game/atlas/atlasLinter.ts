/**
 * Saints Gaming — World Atlas Connectivity & Gate Linter (Bible 24)
 * Automated validator ensuring world gate integrity, target bounds, collision safety, and reciprocal links.
 */

import { AtlasGridData } from './spatialAtlas';
import { GateData } from '../types/map';

export interface MapDataSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  grid?: number[][]; // Row x Col logic grid
  gates?: Record<string, GateData> | GateData[];
}

export type LintSeverity = 'error' | 'warning';

export interface AtlasLintIssue {
  severity: LintSeverity;
  sourceMapId: string;
  code:
    | 'MISSING_TARGET_MAP'
    | 'OUT_OF_BOUNDS_SPAWN'
    | 'SOLID_SPAWN_TRAP'
    | 'ONE_WAY_GATE'
    | 'DUPLICATE_ATLAS_SLOT';
  message: string;
  details?: Record<string, unknown>;
}

export interface AtlasLintReport {
  valid: boolean;
  errors: AtlasLintIssue[];
  warnings: AtlasLintIssue[];
}

/**
 * Validates connectivity across a collection of world maps and Atlas grid nodes.
 */
export function lintWorldAtlasConnectivity(
  maps: MapDataSummary[],
  atlas?: AtlasGridData,
  solidTileIds: Set<number> = new Set([1])
): AtlasLintReport {
  const errors: AtlasLintIssue[] = [];
  const warnings: AtlasLintIssue[] = [];
  const mapMap = new Map<string, MapDataSummary>(maps.map((m) => [m.id, m]));

  // 1. Atlas Grid Duplicate Slot Check
  if (atlas?.nodes) {
    const occupiedSlots = new Map<string, string>();
    for (const node of atlas.nodes) {
      const key = `${node.gridX}_${node.gridY}`;
      if (occupiedSlots.has(key)) {
        errors.push({
          severity: 'error',
          sourceMapId: node.mapId,
          code: 'DUPLICATE_ATLAS_SLOT',
          message: `Map '${node.mapId}' overlaps slot (${node.gridX}, ${node.gridY}) already claimed by '${occupiedSlots.get(key)}'.`,
        });
      } else {
        occupiedSlots.set(key, node.mapId);
      }
    }
  }

  // 2. Gate Validations across all maps
  for (const map of maps) {
    const rawGates = map.gates;
    if (!rawGates) continue;

    const gateEntries: GateData[] = Array.isArray(rawGates)
      ? rawGates
      : Object.values(rawGates);

    for (const gate of gateEntries) {
      const targetMapId = gate.targetMapId;
      if (!targetMapId) continue;

      const targetMap = mapMap.get(targetMapId);

      // Check A: Target Map Existence
      if (!targetMap) {
        errors.push({
          severity: 'error',
          sourceMapId: map.id,
          code: 'MISSING_TARGET_MAP',
          message: `Gate in map '${map.id}' targets non-existent map '${targetMapId}'.`,
          details: { targetMapId },
        });
        continue;
      }

      // Check B: Target Spawn Bounds Check
      const spawn = gate.spawnPoint;
      if (spawn) {
        if (
          spawn.x < 0 ||
          spawn.x >= targetMap.width ||
          spawn.y < 0 ||
          spawn.y >= targetMap.height
        ) {
          errors.push({
            severity: 'error',
            sourceMapId: map.id,
            code: 'OUT_OF_BOUNDS_SPAWN',
            message: `Gate spawn target (${spawn.x}, ${spawn.y}) exceeds '${targetMap.id}' bounds (${targetMap.width}x${targetMap.height}).`,
            details: { spawn, bounds: { width: targetMap.width, height: targetMap.height } },
          });
        }

        // Check C: Solid Collision Spawn Trap Check
        if (targetMap.grid && targetMap.grid[spawn.y] && targetMap.grid[spawn.y][spawn.x] !== undefined) {
          const tileId = targetMap.grid[spawn.y][spawn.x];
          if (solidTileIds.has(tileId)) {
            errors.push({
              severity: 'error',
              sourceMapId: map.id,
              code: 'SOLID_SPAWN_TRAP',
              message: `Gate in map '${map.id}' spawns player onto solid collision tile (${spawn.x}, ${spawn.y}) in '${targetMap.id}'.`,
              details: { spawn, tileId },
            });
          }
        }
      }

      // Check D: Reciprocal Return Gate (Warning)
      if (targetMap.gates) {
        const targetGates: GateData[] = Array.isArray(targetMap.gates)
          ? targetMap.gates
          : Object.values(targetMap.gates);

        const hasReturn = targetGates.some((g) => g.targetMapId === map.id);
        if (!hasReturn) {
          warnings.push({
            severity: 'warning',
            sourceMapId: map.id,
            code: 'ONE_WAY_GATE',
            message: `Map '${map.id}' has a gate to '${targetMap.id}', but '${targetMap.id}' has no return gate back.`,
            details: { targetMapId },
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
