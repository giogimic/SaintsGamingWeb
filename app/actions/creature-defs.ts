'use server';

import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from './game-admin';
import {
  CreatureDefData,
  FALLBACK_CREATURE_DEFS,
} from '@/shared/game/creatureCatalog';
import { creatureDataToDb, creatureRowToData } from '@/shared/game/creatureDefMap';

export type CreatureDefRow = CreatureDefData & { id?: string };

/** Shared + profile-scoped creatures for a world profile (null gameId = shared). */
function creatureScopeWhere(gameId?: string | null) {
  if (!gameId) return {};
  return {
    OR: [{ gameId: null }, { gameId: '' }, { gameId }],
  };
}

/** Public: active creatures (lab / dex / gameplay). Falls back to seed catalog. */
export async function getActiveCreatureDefs(gameId?: string) {
  try {
    const rows = await prisma.creatureDef.findMany({
      where: { isActive: true, ...creatureScopeWhere(gameId) },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) {
      return { success: true, data: FALLBACK_CREATURE_DEFS.filter((c) => c.isActive), source: 'fallback' as const };
    }
    return { success: true, data: rows.map(creatureRowToData), source: 'db' as const };
  } catch (err) {
    console.error('[getActiveCreatureDefs]', err);
    return {
      success: true,
      data: FALLBACK_CREATURE_DEFS.filter((c) => c.isActive),
      source: 'fallback' as const,
    };
  }
}

export async function getActiveStarterCreatures() {
  const res = await getActiveCreatureDefs();
  return {
    ...res,
    data: res.data.filter((c) => c.isStarter),
  };
}

/** Admin: all rows (optional world-profile scope: shared + matching gameId). */
export async function getAllCreatureDefs(gameId?: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', data: [] as CreatureDefData[] };

  try {
    const rows = await prisma.creatureDef.findMany({
      where: creatureScopeWhere(gameId),
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) {
      return { success: true, data: FALLBACK_CREATURE_DEFS };
    }
    return { success: true, data: rows.map(creatureRowToData) };
  } catch (err) {
    console.error('[getAllCreatureDefs]', err);
    return { success: false, error: 'Failed to fetch', data: FALLBACK_CREATURE_DEFS };
  }
}

export async function upsertCreatureDef(data: CreatureDefData) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  if (!data.slug || !data.name || !data.spriteOverworld) {
    return { success: false, error: 'Slug, name, and overworld sprite are required.' };
  }

  try {
    const payload = creatureDataToDb(data);
    const row = await prisma.creatureDef.upsert({
      where: { slug: data.slug },
      create: payload,
      update: payload,
    });
    revalidatePath('/lobby');
    revalidatePath('/studio');
    return { success: true, data: creatureRowToData(row) };
  } catch (err: any) {
    console.error('[upsertCreatureDef]', err);
    return { success: false, error: err.message || 'Failed to save' };
  }
}

export async function deleteCreatureDef(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.creatureDef.delete({ where: { slug } });
    revalidatePath('/studio');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Delete failed' };
  }
}

export async function toggleCreatureDefActive(slug: string, isActive: boolean) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };
  try {
    await prisma.creatureDef.update({ where: { slug }, data: { isActive } });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Toggle failed' };
  }
}

export async function seedDefaultCreatureDefs() {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', created: 0 };

  let created = 0;
  try {
    for (const def of FALLBACK_CREATURE_DEFS) {
      const existing = await prisma.creatureDef.findUnique({ where: { slug: def.slug } });
      if (existing) continue;
      await prisma.creatureDef.create({ data: creatureDataToDb(def) });
      created++;
    }
    revalidatePath('/studio');
    return { success: true, created };
  } catch (err: any) {
    console.error('[seedDefaultCreatureDefs]', err);
    return { success: false, error: err.message || 'Seed failed', created };
  }
}

export async function importCreatureDefsJson(json: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', count: 0 };

  try {
    const parsed = JSON.parse(json);
    const list: CreatureDefData[] = Array.isArray(parsed) ? parsed : [parsed];
    let count = 0;
    for (const item of list) {
      if (!item.slug || !item.name) continue;
      await prisma.creatureDef.upsert({
        where: { slug: item.slug },
        create: creatureDataToDb({
          ...FALLBACK_CREATURE_DEFS[0],
          ...item,
          shinyEnabled: item.shinyEnabled !== false,
          shinyUseGlobalChance: item.shinyUseGlobalChance !== false,
          shinyChancePercent: item.shinyChancePercent ?? 0.5,
        }),
        update: creatureDataToDb({
          ...FALLBACK_CREATURE_DEFS[0],
          ...item,
          shinyEnabled: item.shinyEnabled !== false,
          shinyUseGlobalChance: item.shinyUseGlobalChance !== false,
          shinyChancePercent: item.shinyChancePercent ?? 0.5,
        }),
      });
      count++;
    }
    revalidatePath('/studio');
    return { success: true, count };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON', count: 0 };
  }
}

/** Resolve one species for server gameplay (DB → fallback). */
export async function resolveCreatureDef(slug: string): Promise<CreatureDefData | null> {
  try {
    const row = await prisma.creatureDef.findUnique({ where: { slug } });
    if (row && row.isActive) return creatureRowToData(row);
  } catch {
    /* table may not exist yet */
  }
  return FALLBACK_CREATURE_DEFS.find((c) => c.slug === slug && c.isActive) || null;
}
