'use server';

import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from './game-admin';
import {
  ClassDefData,
  DEFAULT_GAME_CONFIG_SLUG,
  DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT,
  FALLBACK_CLASS_DEFS,
} from '@/shared/game/classCatalog';
import { classDataToDb, classRowToData } from '@/shared/game/classDefMap';

export type ClassDefRow = ClassDefData & { id?: string };

async function ensureDefaultGameConfig() {
  let config = await prisma.gameConfig.findUnique({ where: { slug: DEFAULT_GAME_CONFIG_SLUG } });
  if (!config) {
    config = await prisma.gameConfig.create({
      data: {
        slug: DEFAULT_GAME_CONFIG_SLUG,
        name: 'Saints Gaming',
        description: 'Default Saints MMO config',
        isActive: true,
        globalShinyChancePercent: DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT,
        baseStats: JSON.stringify({ hp: 100, atk: 50, def: 45, spd: 50, ratk: 45, rdef: 45 }),
      },
    });
  }
  return config;
}

/** Public: playable classes for character creator. */
export async function getPlayableClasses() {
  try {
    const config = await ensureDefaultGameConfig();
    const rows = await prisma.characterClass.findMany({
      where: { gameId: config.id, isPlayable: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) {
      return { success: true, data: FALLBACK_CLASS_DEFS.filter((c) => c.isPlayable), source: 'fallback' as const };
    }
    return { success: true, data: rows.map(classRowToData), source: 'db' as const };
  } catch (err) {
    console.error('[getPlayableClasses]', err);
    return {
      success: true,
      data: FALLBACK_CLASS_DEFS.filter((c) => c.isPlayable),
      source: 'fallback' as const,
    };
  }
}

export async function getAllCharacterClasses() {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', data: [] as ClassDefData[] };

  try {
    const config = await ensureDefaultGameConfig();
    const rows = await prisma.characterClass.findMany({
      where: { gameId: config.id },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) {
      return { success: true, data: FALLBACK_CLASS_DEFS };
    }
    return { success: true, data: rows.map(classRowToData) };
  } catch (err) {
    console.error('[getAllCharacterClasses]', err);
    return { success: false, error: 'Failed to fetch', data: FALLBACK_CLASS_DEFS };
  }
}

export async function upsertCharacterClass(data: ClassDefData) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  if (!data.slug || !data.name || !data.classId) {
    return { success: false, error: 'Slug, name, and classId are required.' };
  }

  try {
    const config = await ensureDefaultGameConfig();
    const payload = classDataToDb(data, config.id);
    const row = await prisma.characterClass.upsert({
      where: { gameId_slug: { gameId: config.id, slug: data.slug } },
      create: payload,
      update: payload,
    });
    revalidatePath('/lobby');
    revalidatePath('/studio');
    return { success: true, data: classRowToData(row) };
  } catch (err: any) {
    console.error('[upsertCharacterClass]', err);
    return { success: false, error: err.message || 'Failed to save' };
  }
}

export async function deleteCharacterClass(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };
  try {
    const config = await ensureDefaultGameConfig();
    await prisma.characterClass.delete({
      where: { gameId_slug: { gameId: config.id, slug } },
    });
    revalidatePath('/studio');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Delete failed' };
  }
}

export async function toggleCharacterClassPlayable(slug: string, isPlayable: boolean) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };
  try {
    const config = await ensureDefaultGameConfig();
    await prisma.characterClass.update({
      where: { gameId_slug: { gameId: config.id, slug } },
      data: { isPlayable },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Toggle failed' };
  }
}

export async function seedDefaultCharacterClasses() {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', created: 0 };

  let created = 0;
  try {
    const config = await ensureDefaultGameConfig();
    for (const def of FALLBACK_CLASS_DEFS) {
      const existing = await prisma.characterClass.findUnique({
        where: { gameId_slug: { gameId: config.id, slug: def.slug } },
      });
      if (existing) continue;
      await prisma.characterClass.create({ data: classDataToDb(def, config.id) });
      created++;
    }
    revalidatePath('/studio');
    return { success: true, created };
  } catch (err: any) {
    console.error('[seedDefaultCharacterClasses]', err);
    return { success: false, error: err.message || 'Seed failed', created };
  }
}

export async function importCharacterClassesJson(json: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', count: 0 };

  try {
    const parsed = JSON.parse(json);
    const list: ClassDefData[] = Array.isArray(parsed) ? parsed : [parsed];
    const config = await ensureDefaultGameConfig();
    let count = 0;
    for (const item of list) {
      if (!item.slug || !item.name) continue;
      await prisma.characterClass.upsert({
        where: { gameId_slug: { gameId: config.id, slug: item.slug } },
        create: classDataToDb(item, config.id),
        update: classDataToDb(item, config.id),
      });
      count++;
    }
    revalidatePath('/studio');
    return { success: true, count };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON', count: 0 };
  }
}

export async function getGlobalShinyChance() {
  try {
    const config = await prisma.gameConfig.findUnique({
      where: { slug: DEFAULT_GAME_CONFIG_SLUG },
      select: { globalShinyChancePercent: true },
    });
    return {
      success: true,
      percent: config?.globalShinyChancePercent ?? DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT,
    };
  } catch {
    return { success: true, percent: DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT };
  }
}

export async function setGlobalShinyChance(percent: number) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  try {
    await ensureDefaultGameConfig();
    await prisma.gameConfig.update({
      where: { slug: DEFAULT_GAME_CONFIG_SLUG },
      data: { globalShinyChancePercent: clamped },
    });
    revalidatePath('/studio');
    return { success: true, percent: clamped };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save' };
  }
}
