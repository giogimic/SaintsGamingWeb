'use server';

import { prisma } from '@/web/lib/prisma';
import type { EntityInstanceV1 } from '@/shared/game/entities/types';
import { CANONICAL_ABILITIES } from '@/shared/game/combat/abilityRegistry';

export interface WorldReleaseManifest {
  version: string;
  maps: {
    id: string;
    name: string;
    version: number;
    gridData: string | null;
    gatesData: string;
    encountersData: string;
    entitiesData: string;
    freeformLayersData: string | null;
    mapType: string;
    spawnX: number;
    spawnY: number;
    spawnZ: number;
  }[];
  atlas: Record<string, string>; // e.g. "mapId_regionX_regionZ" -> "checksum"
  actors: {
    npcs: {
      slug: string;
      name: string;
      worldModel: string;
      dialogueTree: any | null; // will be parsed DialogueNode tree
      capabilities: any;
    }[];
    creatures: any[];
    monsters: any[];
  };
  gameplay: {
    abilities: any[];
    quests: any[];
  };
  items: any[];
  connections: WorldConnection[];
}

export interface WorldConnection {
  connectionId: string;
  sourceMapId: string;
  sourceGateId: string;
  type: 'internal' | 'external';
  
  // Presentation
  destinationName: string;
  description: string;
  icon: string;
  
  // Internal
  targetMapReleaseId?: string;
  targetEntryPointId?: string;
  
  // External
  targetWorldProjectId?: string;
  targetWorldReleaseId?: string;
}

export async function resolveWorldDependencies(projectId: string): Promise<WorldReleaseManifest> {
  const project = await prisma.worldProject.findUnique({
    where: { id: projectId },
    include: { maps: true },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const manifest: WorldReleaseManifest = {
    version: `v1.0.${project.activeVersion}`,
    maps: [],
    atlas: {},
    actors: { npcs: [], creatures: [], monsters: [] },
    gameplay: { abilities: [], quests: [] },
    items: [],
    connections: [],
  };

  class DependencyCollector {
    npcs = new Set<string>();
    creatures = new Set<string>();
    quests = new Set<string>();
    items = new Set<string>();
    abilities = new Set<string>();
  }
  const collector = new DependencyCollector();
  const projectMapIds = new Set(project.maps.map(m => m.id));
  const mapEntryPoints = new Map<string, Set<string>>();

  for (const map of project.maps) {
    // 1. Gather Map Data
    let spawnX = 0, spawnY = 0, spawnZ = 16;
    try {
      if (map.gatesData) {
        const gates = JSON.parse(map.gatesData);
        if (gates.spawnPoint) {
          spawnX = gates.spawnPoint.x;
          spawnY = gates.spawnPoint.y;
          spawnZ = gates.spawnPoint.z;
        } else if (gates.gates) {
          const spawnGate = gates.gates.find((g: any) => g.id === 'spawn' || g.category === 'SPAWN');
          if (spawnGate) {
            spawnX = spawnGate.position.x;
            spawnY = spawnGate.position.y;
            spawnZ = spawnGate.position.z;
          }
        }
      }
    } catch (e) {}

    manifest.maps.push({
      id: map.id,
      name: map.name,
      version: map.version,
      gridData: map.gridData,
      gatesData: map.gatesData,
      encountersData: map.encountersData,
      entitiesData: map.entitiesData,
      freeformLayersData: map.freeformLayersData,
      mapType: map.mapType,
      spawnX, spawnY, spawnZ
    });

    // 2. Gather Atlas Artifacts
    const regions = await prisma.worldRegion.findMany({
      where: { mapId: map.id, artifactChecksum: { not: null } },
    });
    for (const r of regions) {
      if (r.artifactChecksum) {
        manifest.atlas[`${r.mapId}_${r.regionX}_${r.regionZ}`] = r.artifactChecksum;
      }
    }

    // 3. Gather Actors (NPCs & Creatures) from entitiesData and parse Gates
    let entities: EntityInstanceV1[] = [];
    try {
      entities = JSON.parse(map.entitiesData || '[]');
    } catch (e) {}

    for (const ent of entities) {
      if (ent.archetype === 'npc' && ent.components?.identity?.slug) {
        collector.npcs.add(ent.components.identity.slug);
      }
      
      if (ent.archetype === 'warp' && ent.components?.warp) {
        const warp = ent.components.warp;
        
        // Register this gate as a valid entry point for this map
        if (!mapEntryPoints.has(map.id)) mapEntryPoints.set(map.id, new Set(['default']));
        mapEntryPoints.get(map.id)!.add(ent.id);

        // Is it internal or external?
        if (warp.targetWorldReleaseId || warp.targetWorldProjectId) {
          if (!warp.targetWorldProjectId || !warp.targetWorldReleaseId || !warp.targetEntryPointId) {
            throw new Error(`External gate ${ent.id} in map ${map.id} is missing required fields (targetWorldProjectId, targetWorldReleaseId, targetEntryPointId).`);
          }
          manifest.connections.push({
            sourceMapId: map.id,
            sourceGateId: ent.id,
            type: 'external',
            targetWorldProjectId: warp.targetWorldProjectId,
            targetWorldReleaseId: warp.targetWorldReleaseId,
            targetEntryPointId: warp.targetEntryPointId
          } as WorldConnection);
        } else {
          // Internal connection (validation happens in pass 2)
          if (!warp.targetMapId) {
            throw new Error(`Internal gate ${ent.id} in map ${map.id} is missing targetMapId.`);
          }
          const entryPoint = warp.targetEntryPointId || 'default';
          manifest.connections.push({
            sourceMapId: map.id,
            sourceGateId: ent.id,
            type: 'internal',
            targetMapReleaseId: warp.targetMapId,
            targetEntryPointId: entryPoint
          } as WorldConnection);
        }
      }
    }
    
    // Parse legacy gatesData
    try {
      if (map.gatesData) {
        const parsedGates = JSON.parse(map.gatesData);
        // Assuming legacy gates are an object/array, we'll try to extract targetMapId
        // Legacy gates in Saints map editor were often stored in a dictionary of index -> GateData
        const gatesList = Array.isArray(parsedGates) ? parsedGates : (parsedGates.gates ? parsedGates.gates : Object.values(parsedGates));
        for (const [idx, g] of Object.entries(gatesList)) {
          const gate = g as any;
          if (gate && gate.targetMapId && typeof gate.targetMapId === 'string') {
            const gateId = gate.id || `legacy_gate_${idx}`;
            if (!mapEntryPoints.has(map.id)) mapEntryPoints.set(map.id, new Set(['default']));
            mapEntryPoints.get(map.id)!.add(gateId);

            manifest.connections.push({
              sourceMapId: map.id,
              sourceGateId: gateId,
              type: 'internal',
              targetMapReleaseId: gate.targetMapId,
              targetEntryPointId: gate.targetEntryPointId || 'default'
            } as WorldConnection);
          }
        }
      }
    } catch(e) {}

    // 4. Gather Creatures and Items from encountersData
    try {
      const encounters = JSON.parse(map.encountersData || '[]');
      for (const enc of encounters) {
        if (enc.species) {
          collector.creatures.add(enc.species);
        }
        if (enc.drops && Array.isArray(enc.drops)) {
          for (const drop of enc.drops) {
            if (drop.itemSlug) collector.items.add(drop.itemSlug);
          }
        }
      }
    } catch (e) {}
    
    // Explicitly freeze procedural config for Atlas map generation
    if (map.proceduralConfig) {
      const targetMap = manifest.maps.find(m => m.id === map.id);
      if (targetMap) {
        (targetMap as any).proceduralConfig = map.proceduralConfig;
      }
    }
  }

  // 5. Validate the Connection Graph and Populate Presentation Data
  for (const conn of manifest.connections) {
    conn.connectionId = `${conn.sourceMapId}_${conn.sourceGateId}_${conn.targetMapReleaseId}_${conn.targetEntryPointId || 'default'}`;
    if (conn.type === 'internal') {
      if (!conn.targetMapReleaseId) throw new Error(`Missing targetMapReleaseId for internal connection ${conn.sourceGateId}`);
      if (!projectMapIds.has(conn.targetMapReleaseId)) {
        throw new Error(`Graph Validation Error: Gate ${conn.sourceGateId} in map ${conn.sourceMapId} points to missing internal map ${conn.targetMapReleaseId}.`);
      }
      const entryPoints = mapEntryPoints.get(conn.targetMapReleaseId);
      if (!conn.targetEntryPointId || !entryPoints?.has(conn.targetEntryPointId)) {
        throw new Error(`Graph Validation Error: Gate ${conn.sourceGateId} in map ${conn.sourceMapId} points to invalid Entry Point '${conn.targetEntryPointId}' on map ${conn.targetMapReleaseId}.`);
      }
      
      const targetMap = project.maps.find((m: any) => m.id === conn.targetMapReleaseId);
      if (targetMap) {
        conn.destinationName = targetMap.name || conn.targetMapReleaseId;
        conn.description = targetMap.description || `Travel to ${conn.destinationName}`;
        conn.icon = "globe"; 
      }
    } else {
      conn.destinationName = "External World";
      conn.description = "Travel to another realm";
      conn.icon = "external-link";
    }
  }

  // Recursive Dependency Resolution
  const resolved = {
    npcs: new Map<string, any>(),
    creatures: new Map<string, any>(),
    quests: new Map<string, any>(),
    items: new Map<string, any>()
  };

  let keepResolving = true;
  while (keepResolving) {
    keepResolving = false;

    // Resolve NPCs
    const pendingNpcs = Array.from(collector.npcs).filter(slug => !resolved.npcs.has(slug));
    if (pendingNpcs.length > 0) {
      keepResolving = true;
      const npcs = await prisma.npcDef.findMany({ where: { slug: { in: pendingNpcs } } });
      
      const dialogueIds = new Set<string>();
      npcs.forEach(npc => {
        try {
          const parsed = JSON.parse(npc.componentsData || '{}');
          if (parsed.behavior?.dialogueId) dialogueIds.add(parsed.behavior.dialogueId);
          else dialogueIds.add(npc.slug);
        } catch (e) { dialogueIds.add(npc.slug); }
      });

      const dialogues = await prisma.npcDialogueTree.findMany({ where: { npcId: { in: Array.from(dialogueIds) } } });
      const dialogueMap = new Map(dialogues.map(d => [d.npcId, d.data]));

      for (const slug of pendingNpcs) {
        const npcDef = npcs.find(n => n.slug === slug);
        if (!npcDef) throw new Error(`Graph Validation Error: NPC references missing NpcDef slug '${slug}'`);

        let parsedComponents: any = {};
        try { parsedComponents = JSON.parse(npcDef.componentsData || '{}'); } catch (e) {}

        let dialogueTree = null;
        const dId = parsedComponents.behavior?.dialogueId || npcDef.slug;
        if (dialogueMap.has(dId)) {
          try {
            dialogueTree = JSON.parse(dialogueMap.get(dId)!);
            // Scan dialogue for quests
            const scanDialogue = (node: any) => {
              if (node.choices) {
                for (const choice of node.choices) {
                  if (choice.questSlug) collector.quests.add(choice.questSlug);
                }
              }
              if (node.options) {
                for (const opt of node.options) {
                  if (opt.questSlug) collector.quests.add(opt.questSlug);
                }
              }
            };
            if (dialogueTree.nodes) {
              Object.values(dialogueTree.nodes).forEach(scanDialogue);
            }
          } catch (e) {}
        }

        // Scan NPC shop inventory for items
        if (parsedComponents.capabilities?.shopkeeper && parsedComponents.capabilities?.shopInventory) {
          try {
            for (const item of parsedComponents.capabilities.shopInventory) {
              if (item.slug) collector.items.add(item.slug);
            }
          } catch(e) {}
        }

        resolved.npcs.set(slug, {
          slug: npcDef.slug,
          name: npcDef.name,
          worldModel: parsedComponents.appearance?.templateId || parsedComponents.appearance?.spriteId || 'unknown',
          dialogueTree,
          capabilities: parsedComponents.capabilities || {}
        });
      }
    }

    // Resolve Quests
    const pendingQuests = Array.from(collector.quests).filter(slug => !resolved.quests.has(slug));
    if (pendingQuests.length > 0) {
      keepResolving = true;
      const quests = await prisma.questTemplate.findMany({ 
        where: { slug: { in: pendingQuests } },
        include: { objectives: true }
      });
      for (const slug of pendingQuests) {
        const quest = quests.find(q => q.slug === slug);
        if (!quest) throw new Error(`Graph Validation Error: Missing Quest slug '${slug}'`);
        
        // Scan for item rewards
        try {
          const rewards = JSON.parse(quest.rewards || '[]');
          for (const r of rewards) {
            if (r.type === 'ITEM' && r.itemSlug) collector.items.add(r.itemSlug);
          }
        } catch(e) {}
        
        resolved.quests.set(slug, quest);
      }
    }

    // Resolve Creatures
    const pendingCreatures = Array.from(collector.creatures).filter(slug => !resolved.creatures.has(slug));
    if (pendingCreatures.length > 0) {
      keepResolving = true;
      const creatures = await prisma.creatureDef.findMany({ where: { slug: { in: pendingCreatures } } });
      for (const slug of pendingCreatures) {
        const c = creatures.find(cr => cr.slug === slug);
        if (!c) throw new Error(`Graph Validation Error: Missing Creature slug '${slug}'`);
        
        try {
          const abilities = JSON.parse(c.abilitiesJson || '[]');
          for (const ab of abilities) {
            if (ab.abilitySlug) collector.abilities.add(ab.abilitySlug);
          }
        } catch(e) {}
        
        try {
          const evolutions = JSON.parse(c.evolutionsJson || '[]');
          for (const ev of evolutions) {
            if (ev.targetSlug) collector.creatures.add(ev.targetSlug);
          }
        } catch(e) {}
        
        resolved.creatures.set(slug, c);
      }
    }

    // Resolve Items
    const pendingItems = Array.from(collector.items).filter(slug => !resolved.items.has(slug));
    if (pendingItems.length > 0) {
      keepResolving = true;
      const items = await prisma.itemTemplate.findMany({ where: { slug: { in: pendingItems } } });
      for (const slug of pendingItems) {
        const it = items.find(i => i.slug === slug);
        if (!it) throw new Error(`Graph Validation Error: Missing Item slug '${slug}'`);
        // Items might have abilities or classes, but for now they are terminal
        resolved.items.set(slug, it);
      }
    }
  }

  // Populate Manifest
  for (const npc of resolved.npcs.values()) manifest.actors.npcs.push(npc);
  for (const q of resolved.quests.values()) manifest.gameplay.quests.push(q);
  for (const i of resolved.items.values()) manifest.items.push(i);
  
  for (const c of resolved.creatures.values()) {
    if (c.isWildSpawn) manifest.actors.monsters.push(c);
    else manifest.actors.creatures.push(c);
  }

  for (const slug of collector.abilities) {
    if (CANONICAL_ABILITIES[slug]) {
      manifest.gameplay.abilities.push(CANONICAL_ABILITIES[slug]);
    }
  }

  // Classes are global game rules, so they are not included in the map release manifest.

  // In the future: resolve Assets recursively here

  return manifest;
}

