'use server';

import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
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

    let sanitizedStateStr = data.initialState;
    try {
      const parsedState = JSON.parse(data.initialState);
      
      // Server Validation & Sanitization against exploits
      parsedState.level = 1;
      parsedState.xp = 0;
      if (typeof parsedState.credits === 'number' && parsedState.credits > 2000) parsedState.credits = 1000;
      if (typeof parsedState.hp === 'number' && parsedState.hp > 200) parsedState.hp = 200;
      if (typeof parsedState.maxHp === 'number' && parsedState.maxHp > 200) parsedState.maxHp = 200;
      
      sanitizedStateStr = JSON.stringify(parsedState);
    } catch (e) {
      console.warn('Failed to parse initialState for validation, continuing with raw string', e);
    }

    const character = await prisma.gameCharacter.create({
      data: {
        userId: session.user.id,
        name: (data.name || 'Saint').slice(0, 32).trim(),
        spriteId: (data.spriteId || 'human_base').slice(0, 255),
        classId: (data.classId || 'WARRIOR').slice(0, 50),
        stateData: sanitizedStateStr,
      }
    });

    revalidatePath(`/user/[username]`);
    return { success: true, character };
  } catch (error: any) {
    console.error('Failed to create character:', error);
    return { success: false, error: 'Failed to create character: ' + (error?.message || String(error)) };
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
        const { sendDiscordWebhook } = await import('@/web/lib/discord');
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

/**
 * Pin an owned PlayerCreature to the public web profile (ALIGNMENT E.1).
 * `beastId` must be a PlayerCreature.id belonging to the caller.
 * Also accepts a speciesSlug — pins the oldest owned instance of that species.
 * Pass empty / "none" to unpin.
 */
export async function pinBeastToProfile(beastId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id;
    const raw = String(beastId || '').trim();

    if (!raw || raw.toLowerCase() === 'none') {
      await prisma.user.update({
        where: { id: userId },
        data: { pinnedBeastId: null },
      });
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      if (u?.username) revalidatePath(`/user/${u.username}`);
      return { success: true, unpinned: true };
    }

    let owned = await prisma.playerCreature.findFirst({
      where: { id: raw, userId },
    });
    if (!owned) {
      owned = await prisma.playerCreature.findFirst({
        where: { userId, speciesSlug: raw },
        orderBy: { capturedAt: 'asc' },
      });
    }
    if (!owned) {
      // Dex may pass display name — try case-insensitive slug normalize
      const slugGuess = raw.toLowerCase().replace(/\s+/g, '_');
      owned = await prisma.playerCreature.findFirst({
        where: { userId, speciesSlug: slugGuess },
        orderBy: { capturedAt: 'asc' },
      });
    }
    if (!owned) {
      return {
        success: false,
        error: 'You must own that creature first (claim starter or capture).',
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pinnedBeastId: owned.id },
    });

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (u?.username) revalidatePath(`/user/${u.username}`);
    return { success: true, pinnedBeastId: owned.id, speciesSlug: owned.speciesSlug };
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
      const caughtCount = (state.creatureSpeciesCaught || state.tuxemonSpeciesCaught || state.caughtDaemons || []).length;
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

export async function getGlobalBankGold() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { coins: true }
  });
  return { success: true, gold: user?.coins || 0 };
}

export async function depositToBank(characterId: string, amount: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

  const character = await prisma.gameCharacter.findUnique({
    where: { id: characterId, userId: session.user.id },
  });
  if (!character) return { success: false, error: 'Character not found' };

  const state = JSON.parse(character.stateData);
  if ((state.credits || 0) < amount) {
    return { success: false, error: 'Insufficient character gold' };
  }

  state.credits -= amount;

  await prisma.$transaction(async (tx) => {
    await tx.gameCharacter.update({
      where: { id: characterId },
      data: { stateData: JSON.stringify(state) }
    });
    await tx.user.update({
      where: { id: session.user.id },
      data: { coins: { increment: amount } }
    });
  });

  return { success: true, newCharacterGold: state.credits };
}

export async function withdrawFromBank(characterId: string, amount: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { coins: true }
  });
  
  if (!user || user.coins < amount) {
    return { success: false, error: 'Insufficient bank gold' };
  }

  const character = await prisma.gameCharacter.findUnique({
    where: { id: characterId, userId: session.user.id },
  });
  if (!character) return { success: false, error: 'Character not found' };

  const state = JSON.parse(character.stateData);
  state.credits = (state.credits || 0) + amount;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { coins: { decrement: amount } }
    });
    await tx.gameCharacter.update({
      where: { id: characterId },
      data: { stateData: JSON.stringify(state) }
    });
  });

  return { success: true, newCharacterGold: state.credits, newBankGold: user.coins - amount };
}
