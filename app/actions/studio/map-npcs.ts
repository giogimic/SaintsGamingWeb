'use server';

import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from '../admin/game-admin';
import { invalidateDialogueCache } from '@/server/dialogueCache';
import { toBaseMapId } from '@/shared/net/mapIds';

export type MapNpcData = {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
  direction?: string;
  dialogue?: string[];
};

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

/** Append an NPC to WorldMap.npcsData (+ GameMap mirror) and seed a dialogue tree. */
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

    let npcs: MapNpcData[] = [];
    try {
      npcs = JSON.parse(world.npcsData || '[]');
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

    const npc: MapNpcData = {
      id,
      name: opts.name,
      x: opts.x,
      y: opts.y,
      sprite,
      direction: 'down',
      dialogue: opts.greeting ? [opts.greeting] : undefined,
    };
    npcs.push(npc);

    await prisma.worldMap.update({
      where: { id: mapId },
      data: {
        npcsData: JSON.stringify(npcs),
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

    const tree = defaultDialogueTree(opts.name, opts.greeting || '', opts.questSlug);
    await prisma.npcDialogueTree.upsert({
      where: { npcId: id },
      create: {
        npcId: id,
        name: opts.name,
        data: JSON.stringify(tree),
      },
      update: {
        name: opts.name,
        data: JSON.stringify(tree),
      },
    });
    revalidatePath('/lobby');
    invalidateDialogueCache(id);
    return { success: true, npc, count: npcs.length };
  } catch (err: any) {
    console.error('[placeMapNpc]', err);
    return { success: false, error: err.message || 'Failed to place NPC' };
  }
}

export async function listMapNpcs(mapId: string) {
  try {
    const world = await prisma.worldMap.findUnique({
      where: { id: toBaseMapId(mapId) },
      select: { npcsData: true },
    });
    if (!world) return { success: false, data: [] as MapNpcData[] };
    return { success: true, data: JSON.parse(world.npcsData || '[]') as MapNpcData[] };
  } catch {
    return { success: false, data: [] as MapNpcData[] };
  }
}

async function writeNpcs(mapId: string, worldName: string, worldGrid: string | null | undefined, worldGates: string, worldEncounters: string, npcs: MapNpcData[]) {
  const safeGrid = worldGrid || "[]";
  await prisma.worldMap.update({
    where: { id: mapId },
    data: {
      npcsData: JSON.stringify(npcs),
      version: { increment: 1 },
    },
  });
  await prisma.gameMap.upsert({
    where: { id: mapId },
    create: {
      id: mapId,
      name: worldName,
      width: 24,
      height: 24,
      tilesetData: safeGrid,
      gates: worldGates,
      npcs: JSON.stringify(npcs),
      encounters: worldEncounters,
    },
    update: { npcs: JSON.stringify(npcs) },
  });
}

/** Update an existing NPC placement (position / name / sprite / greeting). */
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
    let npcs: MapNpcData[] = [];
    try {
      npcs = JSON.parse(world.npcsData || '[]');
    } catch {
      npcs = [];
    }
    const idx = npcs.findIndex((p) => p.id === npcId);
    if (idx < 0) return { success: false, error: `NPC not found: ${npcId}` };

    const prev = npcs[idx]!;
    const sprite = opts.sprite
      ? opts.sprite.replace(/^\/game-assets\/npc\//, '').replace(/\.png$/, '')
      : prev.sprite;
    const next: MapNpcData = {
      ...prev,
      name: opts.name ?? prev.name,
      sprite,
      x: opts.x ?? prev.x,
      y: opts.y ?? prev.y,
      dialogue:
        opts.greeting !== undefined
          ? opts.greeting
            ? [opts.greeting]
            : undefined
          : prev.dialogue,
    };
    npcs[idx] = next;

    await writeNpcs(
      mapId,
      world.name,
      world.gridData,
      world.gatesData,
      world.encountersData,
      npcs
    );

    if (opts.greeting !== undefined || opts.questSlug !== undefined) {
      const tree = defaultDialogueTree(
        next.name,
        opts.greeting ?? next.dialogue?.[0] ?? '',
        opts.questSlug
      );
      await prisma.npcDialogueTree.upsert({
        where: { npcId },
        create: { npcId, name: next.name, data: JSON.stringify(tree) },
        update: { name: next.name, data: JSON.stringify(tree) },
      });
      invalidateDialogueCache(npcId);
    }
    revalidatePath('/lobby');
    return { success: true, npc: next, count: npcs.length };
  } catch (err: any) {
    console.error('[updateMapNpc]', err);
    return { success: false, error: err.message || 'Failed to update NPC' };
  }
}

/** Remove an NPC from the map document (+ optional dialogue tree). */
export async function deleteMapNpc(opts: { mapId: string; npcId: string }) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };
  const mapId = toBaseMapId(opts.mapId);
  const npcId = String(opts.npcId || '');
  if (!mapId || !npcId) return { success: false, error: 'Map id and npc id required' };

  try {
    const world = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!world) return { success: false, error: `Map not found: ${mapId}` };
    let npcs: MapNpcData[] = [];
    try {
      npcs = JSON.parse(world.npcsData || '[]');
    } catch {
      npcs = [];
    }
    const next = npcs.filter((p) => p.id !== npcId);
    if (next.length === npcs.length) {
      return { success: false, error: `NPC not found: ${npcId}` };
    }

    await writeNpcs(
      mapId,
      world.name,
      world.gridData,
      world.gatesData,
      world.encountersData,
      next
    );

    try {
      await prisma.npcDialogueTree.delete({ where: { npcId } });
    } catch {
      /* tree may not exist */
    }
    invalidateDialogueCache(npcId);
    revalidatePath('/lobby');
    return { success: true, npcId, count: next.length };
  } catch (err: any) {
    console.error('[deleteMapNpc]', err);
    return { success: false, error: err.message || 'Failed to delete NPC' };
  }
}
