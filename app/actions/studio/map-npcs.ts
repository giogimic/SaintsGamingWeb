'use server';

import type { EntityInstanceV1 } from '@/shared/game/entities/types';
import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from '../admin/game-admin';
import { invalidateDialogueCache } from '@/server/dialogueCache';
import { toBaseMapId } from '@/shared/net/mapIds';
import { notifyGoMapSynced, notifyGoDialogueSynced } from '@/server/goMmoNotify';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'npc';
}

function defaultDialogueTree(npcName: string, greeting: string, questSlug?: string) {
  const options: Array<Record<string, string>> = [];
  if (questSlug) {
    options.push({
      label: 'I can help.',
      nextNode: 'accepted',
      action: 'ACCEPT_QUEST',
      questSlug,
    });
  }
  options.push({ label: 'Goodbye.', nextNode: 'exit' });
  return {
    node_start: {
      text: greeting || `Hello, traveler. I am ${npcName}.`,
      options,
    },
    accepted: {
      text: 'Thank you. Complete the task, then speak with me again.',
      options: [{ label: 'On my way.', nextNode: 'exit' }],
    },
  };
}

/** Append an NPC to WorldMap.entitiesData (+ GameMap mirror) and seed a dialogue tree. */
export async function placeMapNpc(opts: {
  mapId: string;
  name: string;
  sprite: string;
  x: number;
  y: number;
  greeting?: string;
  questSlug?: string;
}) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const mapId = toBaseMapId(opts.mapId);
  if (!mapId) return { success: false, error: 'Map id required' };

  try {
    const world = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!world) return { success: false, error: `Map not found: ${mapId}` };

    let npcs: EntityInstanceV1[] = [];
    try {
      npcs = JSON.parse(world.entitiesData || '[]');
    } catch {
      npcs = [];
    }

    const base = slugify(opts.name);
    let id = `npc_${base}`;
    let n = 2;
    while (npcs.some((p) => p.id === id)) {
      id = `npc_${base}_${n++}`;
    }

    const sprite = opts.sprite
      .replace(/^\/game-assets\/npc\//, '')
      .replace(/\.png$/, '');

    const npc: EntityInstanceV1 = {
      schemaVersion: 1,
      id,
      archetype: 'npc',
      components: {
        identity: { name: opts.name, slug: base },
        transform: { x: opts.x, y: opts.y, facing: 'S' },
        appearance: { assetProfileId: sprite },
        dialogue: opts.greeting ? { dialogueKey: opts.greeting } : undefined,
      },
    };
    npcs.push(npc);

    await prisma.worldMap.update({
      where: { id: mapId },
      data: {
        entitiesData: JSON.stringify(npcs),
        version: { increment: 1 },
      },
    });

    await prisma.gameMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        name: world.name,
        width: 24,
        height: 24,
        tilesetData: world.gridData,
        gates: world.gatesData,
        npcs: JSON.stringify(npcs),
        encounters: world.encountersData,
      },
      update: { npcs: JSON.stringify(npcs) },
    });

    // Create or update NpcDef
    const defComponents = {
      identity: { name: opts.name, slug: base },
      appearance: { assetProfileId: sprite },
      dialogue: opts.greeting ? { dialogueKey: opts.greeting } : undefined,
    };
    
    await prisma.npcDef.upsert({
      where: { slug: base },
      create: {
        slug: base,
        name: opts.name,
        componentsData: JSON.stringify(defComponents)
      },
      update: { }
    });

    const tree = defaultDialogueTree(opts.name, opts.greeting || '', opts.questSlug);
    await prisma.npcDialogueTree.upsert({
      where: { npcId: base },
      create: { npcId: base, name: opts.name, data: JSON.stringify(tree) },
      update: { name: opts.name, data: JSON.stringify(tree) },
    });

    invalidateDialogueCache(base);
    revalidatePath('/lobby');
    void notifyGoMapSynced({ id: mapId });
    void notifyGoDialogueSynced();

    return { success: true, npc, count: npcs.length };
  } catch (err: any) {
    console.error('[placeMapNpc]', err);
    return { success: false, error: err.message || 'Failed to place NPC' };
  }
}

export async function listMapNpcs(mapId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const id = toBaseMapId(mapId);
  if (!id) return { success: false, error: 'Map id required' };

  try {
    const world = await prisma.worldMap.findUnique({ where: { id } });
    if (!world) return { success: false, error: `Map not found: ${id}` };
    
    let npcs: EntityInstanceV1[] = [];
    try {
      npcs = JSON.parse(world.entitiesData || '[]');
    } catch {
      npcs = [];
    }
    return { success: true, data: npcs };
  } catch (err: any) {
    console.error('[listMapNpcs]', err);
    return { success: false, error: err.message || 'Failed to list map npcs' };
  }
}

export async function updateMapNpc(opts: {
  mapId: string;
  npcId: string;
  name?: string;
  sprite?: string;
  x?: number;
  y?: number;
  greeting?: string;
  questSlug?: string;
}) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const mapId = toBaseMapId(opts.mapId);
  const npcId = String(opts.npcId || '');
  if (!mapId || !npcId) return { success: false, error: 'Map id and npc id required' };

  try {
    const world = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!world) return { success: false, error: `Map not found: ${mapId}` };
    
    let npcs: EntityInstanceV1[] = [];
    try {
      npcs = JSON.parse(world.entitiesData || '[]');
    } catch {
      npcs = [];
    }

    const idx = npcs.findIndex((p) => p.id === npcId);
    if (idx < 0) return { success: false, error: `NPC not found: ${npcId}` };

    const prev = npcs[idx];
    const next: EntityInstanceV1 = { ...prev };
    if (!next.components) next.components = {};
    if (!next.components.identity) next.components.identity = { name: "Unknown", slug: "unknown" };
    if (!next.components.transform) next.components.transform = { x: 0, y: 0, facing: 'S' };
    if (!next.components.appearance) next.components.appearance = { assetProfileId: "heroine" };

    if (opts.name !== undefined) next.components.identity.name = opts.name;
    if (opts.x !== undefined) next.components.transform.x = opts.x;
    if (opts.y !== undefined) next.components.transform.y = opts.y;
    
    let sprite = prev.components?.appearance?.assetProfileId || 'heroine';
    if (opts.sprite !== undefined) {
      sprite = opts.sprite.replace(/^\/game-assets\/npc\//, '').replace(/\.png$/, '');
      next.components.appearance.assetProfileId = sprite;
    }

    if (opts.greeting !== undefined) {
      if (!next.components.dialogue) next.components.dialogue = {};
      next.components.dialogue.dialogueKey = opts.greeting;
    }

    npcs[idx] = next;

    await prisma.worldMap.update({
      where: { id: mapId },
      data: {
        entitiesData: JSON.stringify(npcs),
        version: { increment: 1 },
      },
    });

    await prisma.gameMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        name: world.name,
        width: 24,
        height: 24,
        tilesetData: world.gridData,
        gates: world.gatesData,
        npcs: JSON.stringify(npcs),
        encounters: world.encountersData,
      },
      update: { npcs: JSON.stringify(npcs) },
    });

    const defSlug = next.components.identity.slug || 'unknown';
    const defComponents = {
      identity: { name: next.components.identity.name, slug: defSlug },
      appearance: { assetProfileId: sprite },
      dialogue: opts.greeting ? { dialogueKey: opts.greeting } : undefined,
    };

    await prisma.npcDef.upsert({
      where: { slug: defSlug },
      create: {
        slug: defSlug,
        name: next.components.identity.name,
        componentsData: JSON.stringify(defComponents)
      },
      update: {
        name: next.components.identity.name,
        componentsData: JSON.stringify(defComponents)
      }
    });

    if (opts.greeting !== undefined || opts.questSlug !== undefined) {
      const tree = defaultDialogueTree(
        next.components.identity.name,
        opts.greeting ?? next.components.dialogue?.dialogueKey ?? '',
        opts.questSlug
      );
      await prisma.npcDialogueTree.upsert({
        where: { npcId: defSlug },
        create: { npcId: defSlug, name: next.components.identity.name, data: JSON.stringify(tree) },
        update: { name: next.components.identity.name, data: JSON.stringify(tree) },
      });
      invalidateDialogueCache(defSlug);
      void notifyGoDialogueSynced();
    }

    revalidatePath('/lobby');
    void notifyGoMapSynced({ id: mapId });
    return { success: true, npc: next, count: npcs.length };
  } catch (err: any) {
    console.error('[updateMapNpc]', err);
    return { success: false, error: err.message || 'Failed to update NPC' };
  }
}

/** Remove an NPC from the map document */
export async function deleteMapNpc(opts: { mapId: string; npcId: string }) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };
  const mapId = toBaseMapId(opts.mapId);
  const npcId = String(opts.npcId || '');
  if (!mapId || !npcId) return { success: false, error: 'Map id and npc id required' };

  try {
    const world = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!world) return { success: false, error: `Map not found: ${mapId}` };
    let npcs: EntityInstanceV1[] = [];
    try {
      npcs = JSON.parse(world.entitiesData || '[]');
    } catch {
      npcs = [];
    }
    const next = npcs.filter((p) => p.id !== npcId);
    if (next.length === npcs.length) {
      return { success: false, error: `NPC not found: ${npcId}` };
    }

    await prisma.worldMap.update({
      where: { id: mapId },
      data: {
        entitiesData: JSON.stringify(next),
        version: { increment: 1 },
      },
    });

    await prisma.gameMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        name: world.name,
        width: 24,
        height: 24,
        tilesetData: world.gridData,
        gates: world.gatesData,
        npcs: JSON.stringify(next),
        encounters: world.encountersData,
      },
      update: { npcs: JSON.stringify(next) },
    });

    // We no longer delete dialogue trees when deleting an instance, as they belong to the NpcDef
    revalidatePath('/lobby');
    void notifyGoMapSynced({ id: mapId });
    return { success: true, npcId, count: next.length };
  } catch (err: any) {
    console.error('[deleteMapNpc]', err);
    return { success: false, error: err.message || 'Failed to delete NPC' };
  }
}
