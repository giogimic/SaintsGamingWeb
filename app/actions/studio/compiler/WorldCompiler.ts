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
export async function compileWorldRelease(projectId: string): Promise<{ manifest: ReleaseManifest, releaseInfo: { releaseId: string, version: string } }> {
  const project = await prisma.worldProject.findUnique({
    where: { id: projectId },
  });
  
  const config = await prisma.gameConfig.findUnique({
    where: { slug: projectId },
  });

  const spawnMap = 'DEMO_SANDBOX';

  // 1. Initialize Context
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
        spawnMap: spawnMap,
        spawnX: 14, // these will be extracted from gates or defaults
        spawnY: 15,
        spawnZ: 16,
      },
      maps: [],
      atlas: {},
      actors: { npcs: [], creatures: [], monsters: [] },
      gameplay: { abilities: [], quests: [] },
      items: [],
      connections: [],
    },
    warnings: [],
    errors: [],
  };

  // 2. Map Compiler Phase
  const maps = await prisma.worldMap.findMany({
    where: { gameId: projectId },
  });

  if (maps.length === 0) {
    throw new Error(`Project ${projectId} has no maps to compile.`);
  }

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

    ctx.manifest.maps.push({
      id: map.id,
      name: map.name,
      version: map.version,
      gridData: gridDataStr,
      gatesData: gatesDataStr,
      encountersData: encountersDataStr,
      entitiesData: entitiesDataStr,
      freeformLayersData: freeformLayersDataStr,
      tileLayersData: null,
      tilesetsData: null,
      mapType: map.mapType,
      spawnX: 0, // Fallback, will be replaced if we find a canonical spawn point
      spawnY: 0,
      spawnZ: 0,
    });
  }

  // 3. Run Pipeline Steps
  await compileAtlas(ctx);
  
  // Since ActorResolver might add new creature dependencies through evolutions,
  // we could loop, but for now we'll do a simple two-pass or assume the resolver handles it.
  // We'll call resolveActors twice to ensure 1-level deep evolution dependencies are caught.
  await resolveActors(ctx);
  await resolveActors(ctx);
  
  await resolveGameplay(ctx);
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
        manifestData: JSON.stringify(ctx.manifest),
        publishedBy: 'System', // Could read from auth context
      }
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
