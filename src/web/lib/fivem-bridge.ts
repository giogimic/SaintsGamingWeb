import "server-only";

/**
 * FiveM Server ↔ Saints Web bridge helpers.
 * Used by /api/fivem/events (game server producer).
 *
 * Coarse character/stats only — never publish per-tick coords on the realtime bus.
 */

import { prisma } from "@/web/lib/prisma";
import { emitNotificationCreated, emitPresenceUpdated } from "@/web/lib/realtime-emit";
import { applyBankDelta, normalizeFivemLicense } from "@/web/lib/fivem-bridge-utils";

export type FivemBridgeAction =
  | "player_joined"
  | "player_left"
  | "sync_character"
  | "bank_transaction"
  | "link_license";

export { applyBankDelta, normalizeFivemLicense };

export async function findUserByFivemLicense(license: string) {
  const normalized = normalizeFivemLicense(license);
  const candidates = [normalized, `license:${normalized}`, license.trim()];

  for (const candidate of candidates) {
    const user = await prisma.user.findFirst({
      where: { fivemLicense: candidate },
      select: { id: true, username: true, fivemLicense: true },
    });
    if (user) return user;
  }
  return null;
}

async function publishRealtime(
  type: string,
  payload: Record<string, unknown>,
  options: { userId?: string; global?: boolean } = {}
) {
  try {
    const { getRealtimeService } = await import("../../../server");
    const realtime = getRealtimeService();
    if (!realtime) return;
    await realtime.publishEvent(type, payload, {
      ...options,
      source: "fivem",
    });
  } catch {
    // Non-fatal when custom server is not running
  }
}

async function notifyUser(userId: string, message: string, link: string | null = "/ucp") {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      message,
      link,
    },
  });
  await emitNotificationCreated(notification);
  return notification;
}

function characterDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export async function emitCharacterUpdated(character: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  cash: number;
  bank: number;
  health: number;
  armor: number;
  isDead: boolean;
}) {
  await publishRealtime(
    "fivem.character.updated",
    {
      userId: character.userId,
      characterId: character.id,
      characterName: characterDisplayName(character.firstName, character.lastName),
      cash: character.cash,
      bank: character.bank,
      health: character.health,
      armor: character.armor,
      isDead: character.isDead,
    },
    { userId: character.userId }
  );
}

export async function handlePlayerJoined(input: {
  fivemLicense: string;
  characterId?: string;
  characterName?: string;
  playerCount?: number;
}) {
  const user = await findUserByFivemLicense(input.fivemLicense);
  if (!user) {
    return { ok: true, linked: false, message: "No linked Saints account" };
  }

  const license = user.fivemLicense || normalizeFivemLicense(input.fivemLicense);

  await publishRealtime(
    "fivem.player.online",
    {
      userId: user.id,
      fivemLicense: license,
      characterId: input.characterId,
      characterName: input.characterName,
      playerCount: input.playerCount,
    },
    { userId: user.id }
  );

  await emitPresenceUpdated(user.id, "playing", { source: "fivem" });

  return { ok: true, linked: true, userId: user.id };
}

export async function handlePlayerLeft(input: {
  fivemLicense: string;
  playerCount?: number;
}) {
  const user = await findUserByFivemLicense(input.fivemLicense);
  if (!user) {
    return { ok: true, linked: false, message: "No linked Saints account" };
  }

  const license = user.fivemLicense || normalizeFivemLicense(input.fivemLicense);

  await publishRealtime(
    "fivem.player.offline",
    {
      userId: user.id,
      fivemLicense: license,
      playerCount: input.playerCount,
    },
    { userId: user.id }
  );

  await emitPresenceUpdated(user.id, "online", { source: "fivem" });

  return { ok: true, linked: true, userId: user.id };
}

export async function handleSyncCharacter(input: {
  fivemLicense: string;
  characterId?: string;
  firstName?: string;
  lastName?: string;
  cash?: number;
  bank?: number;
  health?: number;
  armor?: number;
  isDead?: boolean;
  drugStats?: Record<string, unknown>;
  phoneNumber?: string;
}) {
  const user = await findUserByFivemLicense(input.fivemLicense);
  if (!user) {
    return { ok: false, linked: false, error: "No linked Saints account" };
  }

  let character =
    (input.characterId &&
      (await prisma.character.findFirst({
        where: { id: input.characterId, userId: user.id },
      }))) ||
    null;

  if (!character && input.firstName && input.lastName) {
    character = await prisma.character.findFirst({
      where: {
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });
  }

  if (!character) {
    if (!input.firstName || !input.lastName) {
      return {
        ok: false,
        error: "characterId or firstName+lastName required to create/sync",
      };
    }
    character = await prisma.character.create({
      data: {
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        cash: input.cash ?? 0,
        bank: input.bank ?? 0,
        health: input.health ?? 200,
        armor: input.armor ?? 0,
        isDead: input.isDead ?? false,
        phoneNumber: input.phoneNumber,
        drugStats: input.drugStats ? JSON.stringify(input.drugStats) : null,
      },
    });
  } else {
    character = await prisma.character.update({
      where: { id: character.id },
      data: {
        ...(typeof input.cash === "number" ? { cash: Math.trunc(input.cash) } : {}),
        ...(typeof input.bank === "number" ? { bank: Math.trunc(input.bank) } : {}),
        ...(typeof input.health === "number" ? { health: Math.trunc(input.health) } : {}),
        ...(typeof input.armor === "number" ? { armor: Math.trunc(input.armor) } : {}),
        ...(typeof input.isDead === "boolean" ? { isDead: input.isDead } : {}),
        ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
        ...(input.drugStats ? { drugStats: JSON.stringify(input.drugStats) } : {}),
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
      },
    });
  }

  await emitCharacterUpdated(character);

  try {
    const { checkAndAwardAchievements } = await import("@/web/lib/achievements");
    await checkAndAwardAchievements(user.id);
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    linked: true,
    userId: user.id,
    characterId: character.id,
    cash: character.cash,
    bank: character.bank,
  };
}

export async function handleBankTransaction(input: {
  fivemLicense?: string;
  characterId: string;
  type: string;
  amount: number;
  description?: string;
}) {
  const character = await prisma.character.findUnique({
    where: { id: input.characterId },
  });
  if (!character) {
    return { ok: false, error: "Character not found" };
  }

  if (input.fivemLicense) {
    const user = await findUserByFivemLicense(input.fivemLicense);
    if (!user || user.id !== character.userId) {
      return { ok: false, error: "License does not own this character" };
    }
  }

  const serapht = applyBankDelta(character.bank, character.cash, input.type, input.amount);
  const updated = await prisma.character.update({
    where: { id: character.id },
    data: { cash: serapht.cash, bank: serapht.bank },
  });

  const tx = await prisma.bankTransaction.create({
    data: {
      characterId: character.id,
      type: input.type.toUpperCase(),
      amount: Math.trunc(input.amount),
      description: input.description?.slice(0, 200) ?? null,
    },
  });

  const characterName = characterDisplayName(updated.firstName, updated.lastName);

  await publishRealtime(
    "fivem.bank.updated",
    {
      userId: updated.userId,
      characterId: updated.id,
      characterName,
      transactionType: tx.type,
      amount: tx.amount,
      cash: updated.cash,
      bank: updated.bank,
    },
    { userId: updated.userId }
  );

  await emitCharacterUpdated(updated);

  try {
    const { checkAndAwardAchievements } = await import("@/web/lib/achievements");
    await checkAndAwardAchievements(updated.userId);
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    transactionId: tx.id,
    characterId: updated.id,
    cash: updated.cash,
    bank: updated.bank,
  };
}

export async function handleLinkLicense(input: {
  fivemLicense: string;
  saintsUserId?: string;
  saintsUsername?: string;
}) {
  const normalized = normalizeFivemLicense(input.fivemLicense);
  if (!normalized) {
    return { ok: false, error: "fivemLicense required" };
  }

  let user =
    (input.saintsUserId &&
      (await prisma.user.findUnique({
        where: { id: input.saintsUserId },
        select: { id: true, username: true, fivemLicense: true },
      }))) ||
    null;

  if (!user && input.saintsUsername) {
    user = await prisma.user.findUnique({
      where: { username: input.saintsUsername },
      select: { id: true, username: true, fivemLicense: true },
    });
  }

  if (!user) {
    return { ok: false, error: "Saints user not found" };
  }

  const conflict = await prisma.user.findFirst({
    where: {
      fivemLicense: { in: [normalized, `license:${normalized}`] },
      NOT: { id: user.id },
    },
    select: { id: true },
  });
  if (conflict) {
    return { ok: false, error: "License already linked to another account" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { fivemLicense: normalized },
  });

  await notifyUser(user.id, "Your FiveM license is now linked to Saints Gaming.", "/ucp/settings");

  return { ok: true, userId: user.id, username: user.username, fivemLicense: normalized };
}
