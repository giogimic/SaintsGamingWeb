import type { CompilerContext } from './types';
import type { WorldConnection } from '../world-resolver';

/**
 * ConnectionCompiler
 * 
 * Rules:
 * 1. Canonical Entry Points are the sole source of truth.
 * 2. NEVER derive or invent destination coordinates.
 * 3. If a canonical destination does not exist, publish fails.
 */
export async function compileConnections(ctx: CompilerContext): Promise<void> {
  const mapEntryPoints = new Map<string, Set<string>>();
  
  // 1. Gather all Entry Points from the maps in this release
  for (const map of ctx.manifest.maps) {
    if (!mapEntryPoints.has(map.id)) {
      mapEntryPoints.set(map.id, new Set());
    }
    
    // Parse Entities for Warp components (which act as entry points)
    try {
      const entities = JSON.parse(map.entitiesData);
      for (const ent of entities) {
        if (ent.type === 'trigger' && ent.components?.warp) {
          mapEntryPoints.get(map.id)!.add(ent.id);
        }
      }
    } catch(e) {}
    
    // Parse legacy gatesData for entry points
    try {
      const parsedGates = JSON.parse(map.gatesData);
      const gatesList = Array.isArray(parsedGates) ? parsedGates : (parsedGates.gates ? parsedGates.gates : Object.values(parsedGates));
      for (const [idx, g] of Object.entries(gatesList)) {
        const gate = g as any;
        if (gate && gate.targetMapId && typeof gate.targetMapId === 'string') {
          const gateId = gate.id || `legacy_gate_${idx}`;
          mapEntryPoints.get(map.id)!.add(gateId);
        }
      }
    } catch(e) {}
  }

  // 2. Build and Validate the Connections Graph
  for (const map of ctx.manifest.maps) {
    const processWarp = (entId: string, warp: any) => {
      // External World Connection
      if (warp.targetWorldReleaseId || warp.targetWorldProjectId) {
        if (!warp.targetWorldProjectId || !warp.targetWorldReleaseId || !warp.targetEntryPointId) {
          ctx.errors.push(`External gate ${entId} in map ${map.id} is missing required fields.`);
          return;
        }
        ctx.manifest.connections.push({
          connectionId: `${map.id}_${entId}_${warp.targetWorldProjectId}_${warp.targetEntryPointId}`,
          sourceMapId: map.id,
          sourceGateId: entId,
          type: 'external',
          targetWorldProjectId: warp.targetWorldProjectId,
          targetWorldReleaseId: warp.targetWorldReleaseId,
          targetEntryPointId: warp.targetEntryPointId,
          destinationName: "External World",
          description: "Travel to another realm",
          icon: "external-link"
        } as WorldConnection);
        return;
      }
      
      // Internal Map Connection
      if (!warp.targetMapId) {
        ctx.errors.push(`Internal gate ${entId} in map ${map.id} is missing targetMapId.`);
        return;
      }
      
      const targetEntryPointId = warp.targetEntryPointId;
      if (!targetEntryPointId) {
        ctx.errors.push(`Internal gate ${entId} in map ${map.id} is missing targetEntryPointId.`);
        return;
      }
      
      // VALIDATION: Does the target map exist in this release?
      if (!ctx.mapsIncluded.has(warp.targetMapId)) {
        ctx.errors.push(`Graph Validation Error: Gate ${entId} in map ${map.id} points to missing internal map '${warp.targetMapId}'.`);
        return;
      }
      
      // VALIDATION: Does the canonical Entry Point exist?
      const targetEntryPoints = mapEntryPoints.get(warp.targetMapId);
      if (!targetEntryPoints?.has(targetEntryPointId)) {
        ctx.errors.push(`Graph Validation Error: Gate ${entId} in map ${map.id} points to invalid Entry Point '${targetEntryPointId}' on map ${warp.targetMapId}.`);
        return;
      }

      const targetMap = ctx.manifest.maps.find(m => m.id === warp.targetMapId);

      ctx.manifest.connections.push({
        connectionId: `${map.id}_${entId}_${warp.targetMapId}_${targetEntryPointId}`,
        sourceMapId: map.id,
        sourceGateId: entId,
        type: 'internal',
        targetMapReleaseId: warp.targetMapId,
        targetEntryPointId: targetEntryPointId,
        destinationName: targetMap?.name || warp.targetMapId,
        description: `Travel to ${targetMap?.name || warp.targetMapId}`,
        icon: "globe"
      } as WorldConnection);
    };

    // Extract warps from Entities
    try {
      const entities = JSON.parse(map.entitiesData);
      for (const ent of entities) {
        if (ent.type === 'trigger' && ent.components?.warp) {
          processWarp(ent.id, ent.components.warp);
        }
      }
    } catch(e) {}

    // Extract warps from legacy Gates
    try {
      const parsedGates = JSON.parse(map.gatesData);
      const gatesList = Array.isArray(parsedGates) ? parsedGates : (parsedGates.gates ? parsedGates.gates : Object.values(parsedGates));
      for (const [idx, g] of Object.entries(gatesList)) {
        const gate = g as any;
        if (gate && gate.targetMapId && typeof gate.targetMapId === 'string') {
          const gateId = gate.id || `legacy_gate_${idx}`;
          processWarp(gateId, gate);
        }
      }
    } catch(e) {}
  }
}
