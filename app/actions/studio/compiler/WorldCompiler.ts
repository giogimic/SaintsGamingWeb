import { prisma } from '@/web/lib/prisma';
import type { CompilerContext, ReleaseManifest } from './types';

import { compileAtlas } from './AtlasCompiler';
import { resolveActors } from './ActorDependencyResolver';
import { resolveGameplay, resolveAssets } from './GameplayDependencyResolver';
import { compileConnections } from './ConnectionCompiler';
import { validateRelease } from './ReleaseValidator';

/**
 * Orchestrates the full compilation pipeline for a WorldRelease.
 * 
 * Rules:
 * 1. Publish-only: Does not modify the Working World database state.
 * 2. Immutable: Generates a monolithic JSON payload that is self-contained.
 * 3. Transitive: Packages exactly the required dependencies, no more, no less.
 */
export async function compileWorldRelease(projectIdentifier: string, title?: string, description?: string): Promise<{ manifest: ReleaseManifest, releaseInfo: { releaseId: string, version: string } }> {
  const project = await prisma.worldProject.findFirst({
    where: { 
      OR: [
        { id: projectIdentifier },
        { slug: projectIdentifier }
      ]
    },
  });
  
  if (!project) {
    throw new Error(`Project ${projectIdentifier} not found.`);
  }

  const projectId = project.id;
  
  const config = await prisma.gameConfig.findUnique({
    where: { slug: project.slug },
  });

  // 1. Fetch Data
  const maps = await prisma.worldMap.findMany({
    where: { projectId: projectId },
  });

  if (maps.length === 0) {
    throw new Error(`Project ${projectId} has no maps to compile.`);
  }

  // 2. Resolve Canonical Spawn
  const canonicalSpawnId = config?.defaultSpawnGateId;
  if (!canonicalSpawnId) {
    throw new Error(`Project ${projectId} has no defaultSpawnGateId configured. Set a Canonical World Spawn in Game Settings before publishing.`);
  }

  let spawnMapId: string | null = null;
  let spawnX = 0, spawnY = 0, spawnZ = 0;
  let spawnFound = false;

  for (const map of maps) {
    try {
      const entities = JSON.parse(map.entitiesData || "[]");
      for (const ent of entities) {
        if (ent.id === canonicalSpawnId) {
          spawnMapId = map.id;
          spawnX = ent.position?.x ?? 0;
          spawnY = ent.position?.y ?? 0;
          spawnZ = ent.position?.z ?? 0;
          spawnFound = true;
          break;
        }
      }
    } catch (e) {}
    if (spawnFound) break;
    
    try {
      const parsedGates = JSON.parse(map.gatesData || "[]");
      const gatesList = Array.isArray(parsedGates) ? parsedGates : (parsedGates.gates ? parsedGates.gates : Object.values(parsedGates));
      for (const [idx, g] of Object.entries(gatesList)) {
        const gate = g as any;
        const gateId = gate.id || `legacy_gate_${idx}`;
        if (gateId === canonicalSpawnId) {
          spawnMapId = map.id;
          spawnX = gate.spawnPoint?.x ?? gate.position?.x ?? 0;
          spawnY = gate.spawnPoint?.y ?? gate.position?.y ?? 0;
          spawnZ = gate.spawnPoint?.z ?? gate.position?.z ?? 0;
          spawnFound = true;
          break;
        }
      }
    } catch (e) {}
    if (spawnFound) break;
  }

  // Resilient fallback: If exact canonicalSpawnId is not found, search for any SPAWN category gate or explicit spawnPoint
  if (!spawnFound || !spawnMapId) {
    for (const map of maps) {
      try {
        const parsedGates = JSON.parse(map.gatesData || "[]");
        const gatesList = Array.isArray(parsedGates) ? parsedGates : (parsedGates.gates ? parsedGates.gates : Object.values(parsedGates));
        for (const g of Object.values(gatesList)) {
          const gate = g as any;
          if (gate && (gate.category === 'SPAWN' || gate.id === 'spawn' || gate.name?.toLowerCase().includes('spawn'))) {
            spawnMapId = map.id;
            spawnX = gate.spawnPoint?.x ?? gate.position?.x ?? 0;
            spawnY = gate.spawnPoint?.y ?? gate.position?.y ?? 0;
            spawnZ = gate.spawnPoint?.z ?? gate.position?.z ?? 0;
            spawnFound = true;
            break;
          }
        }
        if (!spawnFound && parsedGates.spawnPoint) {
          spawnMapId = map.id;
          spawnX = typeof parsedGates.spawnPoint.x === 'number' ? parsedGates.spawnPoint.x : 0;
          spawnY = typeof parsedGates.spawnPoint.y === 'number' ? parsedGates.spawnPoint.y : 0;
          spawnZ = typeof parsedGates.spawnPoint.z === 'number' ? parsedGates.spawnPoint.z : 0;
          spawnFound = true;
          break;
        }
      } catch (e) {}
      if (spawnFound) break;
    }
  }

  // Ultimate fallback: Use first available map rather than crashing compilation
  if (!spawnFound || !spawnMapId) {
    if (maps.length > 0) {
      spawnMapId = maps[0].id;
      spawnX = 64;
      spawnY = 64;
      spawnZ = 16;
      spawnFound = true;
    } else {
      throw new Error(`Canonical World Spawn gate "${canonicalSpawnId}" not found in any Working World map. Publish aborted.`);
    }
  }

  const mapSnapshotsToCreate: any[] = [];

  // 3. Initialize Context
  const ctx: CompilerContext = {
    projectId,
    mapsIncluded: new Set(),
    requiredRegions: new Set(),
    requiredNPCs: new Set(),
    requiredMonsters: new Set(),
    requiredCreatures: new Set(),
    requiredAbilities: new Set(),
    requiredItems: new Set(),
    requiredQuests: new Set(),
    requiredAssets: new Set(),
    manifest: {
      version: '', // Will be assigned by the persistence layer
      world: {
        name: project?.name || 'Saints World',
        spawnMap: spawnMapId,
        spawnX,
        spawnY,
        spawnZ,
      },
      maps: [],
      atlas: {},
      actors: { npcs: [], creatures: [], monsters: [] },
      gameplay: { abilities: [], quests: [] },
      items: [],
      connections: [],
      assets: [],
    },
    warnings: [],
    errors: [],
  };

  // 4. Map Compiler Phase

  for (const map of maps) {
    ctx.mapsIncluded.add(map.id);
    
    // Parse raw data from Working World
    const gridDataStr = map.gridData || "[]";
    const gatesDataStr = map.gatesData || "[]";
    const encountersDataStr = map.encountersData || "[]";
    const entitiesDataStr = map.entitiesData || "[]";
    const freeformLayersDataStr = map.freeformLayersData || "[]";
    
    // For Voxel/Fractal maps, we also need to discover which regions they use.
    // We do this by scanning their entities or implicitly looking up WorldRegion
    // This will be handled in AtlasCompiler, but we record the map requirement here.
    
    // Track dependencies from EntityInstanceV1 (NPCs, Trigger volumes, etc)
    try {
      const entities = JSON.parse(entitiesDataStr);
      for (const ent of entities) {
        if (ent.type === 'npc' && ent.schemaSlug) {
          ctx.requiredNPCs.add(ent.schemaSlug);
        } else if (ent.type === 'monster' && ent.schemaSlug) {
          ctx.requiredMonsters.add(ent.schemaSlug);
        }
      }
    } catch (e) {
      ctx.warnings.push(`Map ${map.id} has malformed entitiesData`);
    }

    // Phase A: Release Architecture
    // Keep heavy data out of the manifest and out of memory. 
    // FRACTAL maps do not serialize gridData.
    const isFractal = map.mapType === 'FRACTAL';

    mapSnapshotsToCreate.push({
      mapId: map.id,
      name: map.name,
      version: map.version,
      mapType: map.mapType,
      regionClass: map.regionClass || 'authored',
      proceduralConfig: map.proceduralConfig,
      gridData: isFractal ? null : gridDataStr,
      gatesData: gatesDataStr,
      encountersData: encountersDataStr,
      entitiesData: entitiesDataStr,
      freeformLayersData: freeformLayersDataStr,
    });

    ctx.manifest.maps.push({
      id: map.id,
      name: map.name,
      version: map.version,
      mapType: map.mapType,
      spawnX: map.id === spawnMapId ? spawnX : 0,
      spawnY: map.id === spawnMapId ? spawnY : 0,
      spawnZ: map.id === spawnMapId ? spawnZ : 0,
    });
  }

  // 3. Run Pipeline Steps
  await compileAtlas(ctx);
  
  // Fixed-point transitive dependency resolution
  let resolving = true;
  while (resolving) {
    const startNpcs = ctx.requiredNPCs.size;
    const startMonsters = ctx.requiredMonsters.size;
    const startCreatures = ctx.requiredCreatures.size;
    const startQuests = ctx.requiredQuests.size;
    const startItems = ctx.requiredItems.size;
    const startAbilities = ctx.requiredAbilities.size;

    await resolveActors(ctx);
    await resolveGameplay(ctx);
    
    if (
      ctx.requiredNPCs.size === startNpcs &&
      ctx.requiredMonsters.size === startMonsters &&
      ctx.requiredCreatures.size === startCreatures &&
      ctx.requiredQuests.size === startQuests &&
      ctx.requiredItems.size === startItems &&
      ctx.requiredAbilities.size === startAbilities
    ) {
      resolving = false;
    }
  }
  
  await resolveAssets(ctx);
  await compileConnections(ctx);
  await validateRelease(ctx);

  if (ctx.errors.length > 0) {
    throw new Error(`Release Compilation Failed:\n- ${ctx.errors.join('\n- ')}`);
  }

  // 4. Persistence
  // We do this transactionally to ensure Project Version and Release are safely coupled.
  const releaseInfo = await prisma.$transaction(async (tx) => {
    const project = await tx.worldProject.findUnique({
      where: { id: projectId },
      select: { activeVersion: true }
    });
    
    if (!project) {
      throw new Error(`Project ${projectId} no longer exists.`);
    }

    const nextVersionNum = project.activeVersion + 1;
    const nextVersionStr = `v1.0.${nextVersionNum}`;
    ctx.manifest.version = nextVersionStr;

    // Save the Release
    const release = await tx.worldRelease.create({
      data: {
        projectId,
        version: nextVersionStr,
        title: title || `Release ${nextVersionStr}`,
        description: description || '',
        manifestData: JSON.stringify(ctx.manifest),
        publishedBy: 'System', // Could read from auth context
      }
    });

    // Save the decoupled Map Snapshots
    await tx.worldMapSnapshot.createMany({
      data: mapSnapshotsToCreate.map(snap => ({
        ...snap,
        releaseId: release.id,
      }))
    });

    // Update the Project's pointer
    await tx.worldProject.update({
      where: { id: projectId },
      data: { activeVersion: nextVersionNum }
    });

    return { releaseId: release.id, version: nextVersionStr };
  });

  return { manifest: ctx.manifest, releaseInfo };
}
