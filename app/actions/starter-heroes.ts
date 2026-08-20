'use server';

import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from './game-admin';

export type StarterHeroData = {
  id?: string;
  slug: string;
  gameId?: string;
  name: string;
  classId: string;
  spriteKey: string;
  /** Optional GameAsset bundle id for a full modular/composited character sprite (see lpcPackImporter). */
  spriteBundleId?: string | null;
  flavor: string;
  tag: string;
  tagColor: string;
  sortOrder: number;
  isActive: boolean;
  startingMap: string;
  startingX: number;
  startingY: number;
  startingInventory: string;
};

/** Public: fetch active heroes for character creator (scoped to active world profile by default). */
export async function getStarterHeroes(gameId?: string) {
  try {
    let gid = gameId;
    if (!gid) {
      const active = await prisma.gameConfig.findFirst({
        where: {
          isActive: true,
          slug: { notIn: ['saints', 'saints-gaming', 'saints-gaming-qol'] },
        },
        select: { slug: true },
      });
      gid = active?.slug;
    }
    const heroes = await prisma.starterHero.findMany({
      where: {
        isActive: true,
        ...(gid ? { gameId: gid } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
    // Fallback: if profile has no heroes yet, show all active
    if (heroes.length === 0 && gid) {
      const all = await prisma.starterHero.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      return { success: true, data: all };
    }
    return { success: true, data: heroes };
  } catch (err) {
    console.error('[getStarterHeroes]', err);
    return { success: false, data: [] };
  }
}

/** Admin: fetch heroes (including inactive), optionally scoped to a world profile. */
export async function getAllStarterHeroes(gameId?: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', data: [] };

  try {
    const heroes = await prisma.starterHero.findMany({
      where: gameId ? { gameId } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: heroes };
  } catch (err) {
    console.error('[getAllStarterHeroes]', err);
    return { success: false, error: 'Failed to fetch heroes', data: [] };
  }
}

/** Admin: create or update a hero */
export async function upsertStarterHero(data: StarterHeroData) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    let gameId = data.gameId;
    if (!gameId) {
      const active = await prisma.gameConfig.findFirst({
        where: {
          isActive: true,
          slug: { notIn: ['saints', 'saints-gaming', 'saints-gaming-qol'] },
        },
        select: { slug: true },
      });
      gameId = active?.slug || 'saints';
    }
    const hero = await prisma.starterHero.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        gameId,
        name: data.name,
        classId: data.classId,
        spriteKey: data.spriteKey,
        spriteBundleId: data.spriteBundleId || null,
        flavor: data.flavor,
        tag: data.tag,
        tagColor: data.tagColor,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        startingMap: data.startingMap,
        startingX: data.startingX,
        startingY: data.startingY,
        startingInventory: data.startingInventory,
      },
      update: {
        gameId,
        name: data.name,
        classId: data.classId,
        spriteKey: data.spriteKey,
        spriteBundleId: data.spriteBundleId || null,
        flavor: data.flavor,
        tag: data.tag,
        tagColor: data.tagColor,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        startingMap: data.startingMap,
        startingX: data.startingX,
        startingY: data.startingY,
        startingInventory: data.startingInventory,
      },
    });
    revalidatePath('/lobby');
    return { success: true, data: hero };
  } catch (err: any) {
    console.error('[upsertStarterHero]', err);
    return { success: false, error: err.message || 'Failed to save hero' };
  }
}

/** Admin: import batch JSON of heroes */
export async function importStarterHeroesJson(jsonString: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const items = JSON.parse(jsonString);
    const heroesArray: StarterHeroData[] = Array.isArray(items) ? items : [items];

    let imported = 0;
    for (const h of heroesArray) {
      if (!h.slug || !h.name || !h.spriteKey) continue;
      await prisma.starterHero.upsert({
        where: { slug: h.slug },
        create: {
          slug: h.slug,
          name: h.name,
          classId: h.classId || 'WARRIOR',
          spriteKey: h.spriteKey,
          flavor: h.flavor || '',
          tag: h.tag || 'Custom',
          tagColor: h.tagColor || '#a78bfa',
          sortOrder: h.sortOrder ?? 0,
          isActive: h.isActive ?? true,
          startingMap: h.startingMap || 'LOBBY',
          startingX: h.startingX ?? 32,
          startingY: h.startingY ?? 32,
          startingInventory: typeof h.startingInventory === 'object' 
            ? JSON.stringify(h.startingInventory) 
            : h.startingInventory || '{"capture_script":10,"patch_kit":5}',
        },
        update: {
          name: h.name,
          classId: h.classId || 'WARRIOR',
          spriteKey: h.spriteKey,
          flavor: h.flavor || '',
          tag: h.tag || 'Custom',
          tagColor: h.tagColor || '#a78bfa',
          sortOrder: h.sortOrder ?? 0,
          isActive: h.isActive ?? true,
        },
      });
      imported++;
    }
    revalidatePath('/lobby');
    return { success: true, count: imported };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON input format' };
  }
}

/** Admin: delete a hero by slug */
export async function deleteStarterHero(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.starterHero.delete({ where: { slug } });
    revalidatePath('/lobby');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete' };
  }
}

/** Admin: toggle isActive */
export async function toggleStarterHeroActive(slug: string, isActive: boolean) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.starterHero.update({ where: { slug }, data: { isActive } });
    revalidatePath('/lobby');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update' };
  }
}

/** Admin: batch seed default heroes (idempotent) */
export async function seedDefaultStarterHeroes() {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const defaults: StarterHeroData[] = [
    {
      slug: 'warrior', name: 'Warrior', classId: 'WARRIOR', spriteKey: 'evil-berserker-bloodaxe-male',
      flavor: 'Frontline champion. High HP, unstoppable in melee.',
      tag: 'Beginner Friendly', tagColor: '#34d399', sortOrder: 1, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'paladin', name: 'Paladin', classId: 'WARRIOR', spriteKey: 'good-paladin-templar-female',
      flavor: 'Holy guardian. Superior defense, supports allies.',
      tag: 'Defensive', tagColor: '#60a5fa', sortOrder: 2, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'mystic', name: 'Mystic', classId: 'MAGE', spriteKey: 'good-wizard-archmage-male',
      flavor: 'Master of arcane arts. High burst, low defense.',
      tag: 'Advanced', tagColor: '#a78bfa', sortOrder: 3, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'shadow', name: 'Shadow', classId: 'THIEF', spriteKey: 'evil-assassin-nightstalker-female',
      flavor: "Swift and lethal. Strike before you're seen.",
      tag: 'Skill Cap', tagColor: '#f472b6', sortOrder: 4, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'ranger', name: 'Ranger', classId: 'RANGER', spriteKey: 'good-ranger-grovekeeper-female',
      flavor: 'Agile hunter. Precision strikes from distance.',
      tag: 'Mobile', tagColor: '#fbbf24', sortOrder: 5, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'priest', name: 'Priest', classId: 'PRIEST', spriteKey: 'good-cleric-highpriestess-female',
      flavor: 'Devoted healer. Wisdom and vitality over raw attack.',
      tag: 'Support', tagColor: '#e2d5b3', sortOrder: 6, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'monk', name: 'Monk', classId: 'WARRIOR', spriteKey: 'monk',
      flavor: 'Inner strength fighter. Balanced offense and utility.',
      tag: 'Balanced', tagColor: '#fb923c', sortOrder: 7, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    // Extra Tuxemon and thematic archetypes
    {
      slug: 'dragonrider', name: 'Dragon Rider', classId: 'WARRIOR', spriteKey: 'dragonrider',
      flavor: 'Bonded with dragons. Exceptional power and presence.',
      tag: 'Epic', tagColor: '#f87171', sortOrder: 7, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'witchcraft', name: 'Witch', classId: 'MAGE', spriteKey: 'witch',
      flavor: 'Dark magic wielder. Curse enemies and summon spirits.',
      tag: 'Dark Arts', tagColor: '#818cf8', sortOrder: 8, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'disciple', name: 'Disciple', classId: 'MAGE', spriteKey: 'disciple',
      flavor: 'Devoted scholar of ancient arts. Support and healer.',
      tag: 'Support', tagColor: '#34d399', sortOrder: 9, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'knightlord', name: 'Knight Lord', classId: 'WARRIOR', spriteKey: 'knightlord',
      flavor: 'Commander of armies. Unbreakable defense, rally allies.',
      tag: 'Commander', tagColor: '#fbbf24', sortOrder: 10, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'heroine', name: 'Heroine', classId: 'THIEF', spriteKey: 'heroine',
      flavor: 'Fearless adventurer. Versatile and fast in combat.',
      tag: 'Versatile', tagColor: '#38bdf8', sortOrder: 11, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'tuxemon_tamer', name: 'Beast Tamer', classId: 'WARRIOR', spriteKey: 'catgirl',
      flavor: 'Tuxemon creature specialist. High beast synergy and capture speed.',
      tag: 'Beast Master', tagColor: '#f472b6', sortOrder: 12, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":20,"patch_kit":10}',
    },
    {
      slug: 'goth_animist', name: 'Shadow Animist', classId: 'MAGE', spriteKey: 'goth',
      flavor: 'Attuned to nether spirits and dark elements.',
      tag: 'Spiritualist', tagColor: '#a78bfa', sortOrder: 13, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    },
    {
      slug: 'prof_researcher', name: 'Professor', classId: 'MAGE', spriteKey: 'professor',
      flavor: 'Veteran Tuxemon scientist. Identifies stats and weak points.',
      tag: 'Scholar', tagColor: '#60a5fa', sortOrder: 14, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":15,"patch_kit":15}',
    },
    {
      slug: 'cyber_soldier', name: 'Xero Soldier', classId: 'WARRIOR', spriteKey: 'soldier',
      flavor: 'Heavy combat specialist equipped with tactical armor.',
      tag: 'Tactical', tagColor: '#fb923c', sortOrder: 15, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":10}',
    },
    {
      slug: 'florist_druid', name: 'Nature Druid', classId: 'THIEF', spriteKey: 'florist',
      flavor: 'Botanical guardian. Uses nature remedies and evasive spores.',
      tag: 'Nature', tagColor: '#34d399', sortOrder: 16, isActive: true,
      startingMap: 'LOBBY', startingX: 32, startingY: 32,
      startingInventory: '{"capture_script":10,"patch_kit":8}',
    },
    {
      slug: 'spyder_tamer', name: 'Spyder Tamer', classId: 'RANGER', spriteKey: 'catgirl',
      flavor: 'Starts in Azure Town — Tuxemon Spyder campaign playtest bed.',
      tag: 'Campaign', tagColor: '#cbb26a', sortOrder: 17, isActive: true,
      startingMap: 'AZURE_TOWN', startingX: 25, startingY: 25,
      startingInventory: '{"capture_script":20,"patch_kit":10}',
    },
  ];

  // Core classId remaps (e.g. ranger THIEF → RANGER) always sync; flavor/custom stay.
  const syncClassIds = new Set(['warrior', 'paladin', 'mystic', 'shadow', 'ranger', 'priest', 'monk']);
  const results = await Promise.allSettled(
    defaults.map(h =>
      prisma.starterHero.upsert({
        where: { slug: h.slug },
        create: h,
        update: syncClassIds.has(h.slug)
          ? { classId: h.classId, name: h.name, flavor: h.flavor, tag: h.tag, tagColor: h.tagColor, sortOrder: h.sortOrder }
          : {},
      })
    )
  );

  const created = results.filter(r => r.status === 'fulfilled').length;
  revalidatePath('/lobby');
  return { success: true, created };
}
