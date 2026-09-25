'use server';

import { prisma } from '@/web/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAdminPermission } from '../admin/game-admin';

export interface StarterPerkData {
  id?: string;
  slug: string;
  gameId?: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  badge: string;
  isActive: boolean;
  sortOrder: number;
}

/** Public: fetch active perks for character creator (scoped to active world profile by default). */
export async function getStarterPerks(gameId?: string) {
  try {
    let perks = await prisma.starterPerk.findMany({
      where: {
        isActive: true,
        ...(gameId ? { gameId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
    // Fallback: if scoped profile has no perks yet, show all active
    if (perks.length === 0 && gameId) {
      perks = await prisma.starterPerk.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }
    return { success: true, data: perks };
  } catch (err) {
    console.error('[getStarterPerks]', err);
    return { success: true, data: [] };
  }
}

/** Admin: fetch perks (including inactive), optionally scoped to a world profile. */
export async function getAllStarterPerks(gameId?: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized', data: [] };

  try {
    const perks = await prisma.starterPerk.findMany({
      where: gameId ? { gameId } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: perks };
  } catch (err) {
    console.error('[getAllStarterPerks]', err);
    return { success: false, error: 'Failed to fetch perks', data: [] };
  }
}

/** Admin: create or update a perk */
export async function upsertStarterPerk(data: StarterPerkData) {
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
    const perk = await prisma.starterPerk.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        gameId,
        name: data.name,
        desc: data.desc,
        icon: data.icon,
        color: data.color,
        badge: data.badge,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
      update: {
        gameId,
        name: data.name,
        desc: data.desc,
        icon: data.icon,
        color: data.color,
        badge: data.badge,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });
    revalidatePath('/lobby');
    return { success: true, data: perk };
  } catch (err: any) {
    console.error('[upsertStarterPerk]', err);
    return { success: false, error: err.message || 'Failed to save perk' };
  }
}

/** Admin: delete a perk by slug */
export async function deleteStarterPerk(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.starterPerk.delete({ where: { slug } });
    revalidatePath('/lobby');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete' };
  }
}

/** Admin: batch seed default perks (idempotent) */
export async function seedDefaultStarterPerks() {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  const defaults: StarterPerkData[] = [
    {
      slug: 'swift-traveler', name: 'Swift Traveler',
      desc: '+25% Movement Speed across all maps and dungeons.',
      icon: 'Zap', color: '#fbbf24', badge: 'AGILITY',
      sortOrder: 1, isActive: true,
    },
    {
      slug: 'acrobat', name: 'Acrobat',
      desc: 'Perform 2-tile Double Jumps over obstacles and gaps.',
      icon: 'Feather', color: '#34d399', badge: 'MOBILITY',
      sortOrder: 2, isActive: true,
    },
    {
      slug: 'pack-mule', name: 'Pack Mule',
      desc: '+50% Inventory Carry Weight & pouch capacity.',
      icon: 'Shield', color: '#60a5fa', badge: 'UTILITY',
      sortOrder: 3, isActive: true,
    },
    {
      slug: 'master-saint', name: 'Master Saint',
      desc: '+15% Capture Rate boost for wild Daemons & Beasts.',
      icon: 'User', color: '#cbb26a', badge: 'MASTERY',
      sortOrder: 4, isActive: true,
    },
    {
      slug: 'stamina-surge', name: 'Stamina Surge',
      desc: '+30 Base Health & accelerated health regeneration.',
      icon: 'Sparkles', color: '#f472b6', badge: 'SURVIVAL',
      sortOrder: 5, isActive: true,
    },
  ];

  const results = await Promise.allSettled(
    defaults.map(p =>
      prisma.starterPerk.upsert({
        where: { slug: p.slug },
        create: p,
        update: p,
      })
    )
  );

  const created = results.filter(r => r.status === 'fulfilled').length;
  revalidatePath('/lobby');
  return { success: true, created };
}
