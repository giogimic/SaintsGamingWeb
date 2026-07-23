'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createGameCharacter(data: {
  name: string;
  spriteId: string;
  classId: string;
  initialState: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const character = await prisma.gameCharacter.create({
      data: {
        userId: session.user.id,
        name: data.name,
        spriteId: data.spriteId,
        classId: data.classId,
        stateData: data.initialState,
      }
    });

    revalidatePath(`/user/[username]`);
    return { success: true, character };
  } catch (error) {
    console.error('Failed to create character:', error);
    return { success: false, error: 'Failed to create character' };
  }
}

export async function saveGameState(characterId: string, stateData: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.gameCharacter.update({
      where: { 
        id: characterId,
        userId: session.user.id // Security check
      },
      data: { stateData }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save game state:', error);
    return { success: false, error: 'Failed to save game state' };
  }
}

export async function loadGameCharacter(characterId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const save = await prisma.gameCharacter.findUnique({
      where: { 
        id: characterId,
        userId: session.user.id
      }
    });

    return { success: true, data: save || null };
  } catch (error) {
    console.error('Failed to load game character:', error);
    return { success: false, error: 'Failed to load game character', data: null };
  }
}

export async function getUserCharacters() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    const characters = await prisma.gameCharacter.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' }
    });

    return { success: true, data: characters };
  } catch (error) {
    console.error('Failed to load characters:', error);
    return { success: false, error: 'Failed to load characters', data: [] };
  }
}

export async function deleteGameCharacter(characterId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.gameCharacter.delete({
      where: {
        id: characterId,
        userId: session.user.id
      }
    });

    revalidatePath('/profile');
    revalidatePath('/lobby');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete character:', error);
    return { success: false, error: 'Failed to delete character' };
  }
}

export async function unlockGameAchievement(badgeId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id;

    // Check if they already have it
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      }
    });

    if (existing) {
      return { success: true, alreadyUnlocked: true };
    }

    await prisma.userAchievement.create({
      data: {
        userId,
        badgeId,
        isPinned: false
      }
    });

    // Get current user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, username: true }
    });

    const newXp = (user?.xp || 0) + 100;
    let newLevel = user?.level || 1;

    // Check if they leveled up
    const nextTier = await prisma.levelTier.findFirst({
      where: { xpRequired: { lte: newXp } },
      orderBy: { xpRequired: 'desc' }
    });

    let leveledUp = false;
    if (nextTier && nextTier.level > newLevel) {
      newLevel = nextTier.level;
      leveledUp = true;
    }

    // Grant platform XP, Coins, and potentially Level
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: 50 },
        xp: newXp,
        level: newLevel
      }
    });

    // Discord Integration
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        const { sendDiscordWebhook } = await import('@/lib/discord');
        const badgeName = badgeId.replace(/_/g, ' ').toUpperCase();
        
        const embeds = [{
          title: '🏆 Achievement Unlocked!',
          description: `**${user?.username}** has unlocked the **${badgeName}** achievement in Saints Tamer!`,
          color: 0xFFD700,
          fields: [
            { name: 'Rewards', value: '+100 XP\n+50 Coins', inline: true },
            ...(leveledUp ? [{ name: 'Level Up!', value: `Reached Level ${newLevel}! 🎉`, inline: true }] : [])
          ]
        }];

        // Fire and forget so we don't block the request
        sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, { embeds }).catch(console.error);
      } catch (err) {
        console.error('Failed to send discord webhook for achievement', err);
      }
    }

    revalidatePath('/profile/[username]'); // Revalidate profile to show new badge
    return { success: true, alreadyUnlocked: false, leveledUp, newLevel };
  } catch (error) {
    console.error('Failed to unlock achievement:', error);
    return { success: false, error: 'Failed to unlock achievement' };
  }
}

export async function pinBeastToProfile(beastId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pinnedBeastId: beastId }
    });

    revalidatePath('/profile/[username]');
    return { success: true };
  } catch (error) {
    console.error('Failed to pin beast:', error);
    return { success: false, error: 'Failed to pin beast' };
  }
}

export async function getTopLobbyOperatives() {
  try {
    const characters = await prisma.gameCharacter.findMany({
      take: 50,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            image: true,
            isFounder: true,
            isVIP: true,
            isTrusted: true
          }
        }
      }
    });

    const ranked = characters.map(c => {
      let state: any = {};
      try {
        state = JSON.parse(c.stateData || '{}');
      } catch {
        state = {};
      }

      const skills: Record<string, { level: number; xp: number }> = state.skills || {};
      const totalXp = Object.values(skills).reduce((sum, s) => sum + (s.xp || 0), 0);
      const credits = state.credits || 0;
      const caughtCount = (state.tuxemonSpeciesCaught || state.caughtDaemons || []).length;
      const level = state.level || 1;
      const perk = state.perk || 'SWIFT_TRAVELER';

      return {
        id: c.id,
        name: c.name,
        classId: c.classId,
        spriteId: c.spriteId,
        level,
        totalXp,
        credits,
        caughtCount,
        perk,
        user: c.user
      };
    });

    return { success: true, data: ranked };
  } catch (error) {
    console.error('Failed to load top operatives:', error);
    return { success: false, error: 'Failed to load leaderboards', data: [] };
  }
}
