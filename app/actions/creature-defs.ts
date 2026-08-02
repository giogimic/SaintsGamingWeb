'use server';

import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from './game-admin';
import {
  CreatureDefData,
  CreaturePassive,
  CreatureAbilitySlot,
  FALLBACK_CREATURE_DEFS,
} from '@/shared/game/creatureCatalog';

export type CreatureDefRow = CreatureDefData & { id?: string };

function rowToData(row: any): CreatureDefData {
  let passives: CreaturePassive[] = [];
  let abilities: CreatureAbilitySlot[] = [];
  try {
    passives = JSON.parse(row.passivesJson || '[]');
  } catch {
    passives = [];
  }
  try {
    abilities = JSON.parse(row.abilitiesJson || '[]');
  } catch {
    abilities = [];
  }
  return {
    slug: row.slug,
    name: row.name,
    dexNumber: row.dexNumber,
    typePrimary: row.typePrimary,
    typeSecondary: row.typeSecondary,
    spriteOverworld: row.spriteOverworld,
    spriteBattle: row.spriteBattle,
    spriteBack: row.spriteBack,
    baseHp: row.baseHp,
    physicalPower: row.physicalPower,
    physicalDefense: row.physicalDefense,
    abilityPower: row.abilityPower,
    abilityDefense: row.abilityDefense,
    combatTempo: row.combatTempo,
    catchRate: row.catchRate,
    starterLevel: row.starterLevel,
    passives,
    worldSkillName: row.worldSkillName,
    worldSkillDescription: row.worldSkillDescription,
    abilities,
    flavor: row.flavor,
    tag: row.tag,
    tagColor: row.tagColor,
    stage: row.stage,
    isStarter: row.isStarter,
    isWildSpawn: row.isWildSpawn,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

function dataToDb(data: CreatureDefData) {
  return {
    slug: data.slug,
    name: data.name,
    dexNumber: data.dexNumber,
    typePrimary: data.typePrimary,
    typeSecondary: data.typeSecondary || 'None',
    spriteOverworld: data.spriteOverworld,
    spriteBattle: data.spriteBattle || null,
    spriteBack: data.spriteBack || null,
    baseHp: data.baseHp,
    physicalPower: data.physicalPower,
    physicalDefense: data.physicalDefense,
    abilityPower: data.abilityPower,
    abilityDefense: data.abilityDefense,
    combatTempo: data.combatTempo,
    catchRate: data.catchRate,
    starterLevel: data.starterLevel,
    passivesJson: JSON.stringify(data.passives || []),
    worldSkillName: data.worldSkillName || '',
    worldSkillDescription: data.worldSkillDescription || '',
    abilitiesJson: JSON.stringify(data.abilities || []),
    flavor: data.flavor || '',
    tag: data.tag || 'Standard',
    tagColor: data.tagColor || '#34d399',
    stage: data.stage || 'basic',
    isStarter: !!data.isStarter,
    isWildSpawn: !!data.isWildSpawn,
    isActive: data.isActive !== false,
    sortOrder: data.sortOrder || 0,
  };
}

/** Public: active creatures (lab / dex / gameplay). Falls back to seed catalog. */
export async function getActiveCreatureDefs() {
  try {
    const rows = await prisma.creatureDef.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) {
      return { success: true, data: FALLBACK_CREATURE_DEFS.filter((c) => c.isActive), source: 'fallback' as const };
    }
    return { success: true, data: rows.map(rowToData), source: 'db' as const };
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

/** Admin: all rows */
export async function getAllCreatureDefs() {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', data: [] as CreatureDefData[] };

  try {
    const rows = await prisma.creatureDef.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length === 0) {
      return { success: true, data: FALLBACK_CREATURE_DEFS };
    }
    return { success: true, data: rows.map(rowToData) };
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
    const payload = dataToDb(data);
    const row = await prisma.creatureDef.upsert({
      where: { slug: data.slug },
      create: payload,
      update: payload,
    });
    revalidatePath('/lobby');
    revalidatePath('/studio');
    return { success: true, data: rowToData(row) };
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
      await prisma.creatureDef.create({ data: dataToDb(def) });
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
        create: dataToDb(item),
        update: dataToDb(item),
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
    if (row && row.isActive) return rowToData(row);
  } catch {
    /* table may not exist yet */
  }
  return FALLBACK_CREATURE_DEFS.find((c) => c.slug === slug && c.isActive) || null;
}
