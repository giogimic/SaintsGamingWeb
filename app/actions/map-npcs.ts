'use server';

import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from './game-admin';
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

    revalidatePath('/studio');
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
      where: { id: mapId },
      select: { npcsData: true },
    });
    if (!world) return { success: false, data: [] as MapNpcData[] };
    return { success: true, data: JSON.parse(world.npcsData || '[]') as MapNpcData[] };
  } catch {
    return { success: false, data: [] as MapNpcData[] };
  }
}
