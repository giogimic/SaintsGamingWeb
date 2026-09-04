import "server-only";

/**
 * Discord Bot ↔ Saints Web bridge helpers.
 * Used by /api/discord/events (bot producer) and role/account linking.
 */

import { prisma } from "@/web/lib/prisma";
import { emitNotificationCreated } from "@/web/lib/realtime-emit";
import { parseDiscordRoleMap } from "@/web/lib/discord-role-map";

export type DiscordBridgeAction =
  | "member_joined"
  | "role_sync"
  | "community_announce"
  | "link_account";

export { parseDiscordRoleMap };

export async function findUserByDiscordId(discordUserId: string) {
  // Prefer User.discordId, fall back to OAuth Account.providerAccountId
  const byField = await prisma.user.findFirst({
    where: { discordId: discordUserId },
    select: {
      id: true,
      username: true,
      permissionLevel: true,
      discordId: true,
    },
  });
  if (byField) return byField;

  const account = await prisma.account.findFirst({
    where: { provider: "discord", providerAccountId: discordUserId },
    select: {
      user: {
        select: {
          id: true,
          username: true,
          permissionLevel: true,
          discordId: true,
        },
      },
    },
  });
  return account?.user ?? null;
}

/** Ensure User.discordId is populated from the OAuth Account row. */
export async function ensureDiscordIdLinked(userId: string, discordUserId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { discordId: discordUserId },
  });
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
      source: "discord",
    });
  } catch {
    // Non-fatal when custom server is not running
  }
}

async function notifyUser(userId: string, message: string, link: string | null = "/home") {
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

export async function handleMemberJoined(input: {
  discordUserId: string;
  discordUsername?: string;
}) {
  const user = await findUserByDiscordId(input.discordUserId);
  if (!user) {
    return { ok: true, linked: false, message: "No linked Saints account" };
  }

  if (!user.discordId) {
    await ensureDiscordIdLinked(user.id, input.discordUserId);
  }

  await notifyUser(
    user.id,
    `Welcome back from Discord${input.discordUsername ? `, ${input.discordUsername}` : ""}! Your account is linked.`,
    "/profile"
  );

  await publishRealtime(
    "discord.member.linked",
    {
      userId: user.id,
      discordUserId: input.discordUserId,
      username: user.username,
    },
    { userId: user.id }
  );

  return { ok: true, linked: true, userId: user.id };
}

export async function handleRoleSync(input: {
  discordUserId: string;
  discordRoleIds: string[];
  forceDemote?: boolean;
}) {
  const user = await findUserByDiscordId(input.discordUserId);
  if (!user) {
    return { ok: true, linked: false, message: "No linked Saints account" };
  }

  if (!user.discordId) {
    await ensureDiscordIdLinked(user.id, input.discordUserId);
  }

  const roleMap = parseDiscordRoleMap();
  let mappedLevel = 0;
  for (const roleId of input.discordRoleIds) {
    const level = roleMap[roleId];
    if (typeof level === "number") mappedLevel = Math.max(mappedLevel, level);
  }

  if (mappedLevel <= 0) {
    return { ok: true, linked: true, unchanged: true, reason: "no_mapped_roles" };
  }

  // Safety: never auto-demote staff (>=100) unless forceDemote
  if (
    !input.forceDemote &&
    user.permissionLevel >= 100 &&
    mappedLevel < user.permissionLevel
  ) {
    return {
      ok: true,
      linked: true,
      skippedDemote: true,
      permissionLevel: user.permissionLevel,
    };
  }

  if (mappedLevel === user.permissionLevel) {
    return { ok: true, linked: true, unchanged: true, permissionLevel: mappedLevel };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { permissionLevel: mappedLevel },
  });

  await notifyUser(
    user.id,
    `Your site permissions were synced from Discord (level ${mappedLevel}).`,
    "/profile"
  );

  await publishRealtime(
    "discord.role.synced",
    {
      userId: user.id,
      discordUserId: input.discordUserId,
      permissionLevel: mappedLevel,
      sourceRoleIds: input.discordRoleIds,
    },
    { userId: user.id }
  );

  return {
    ok: true,
    linked: true,
    updated: true,
    userId: user.id,
    permissionLevel: mappedLevel,
  };
}

export async function handleCommunityAnnounce(input: {
  message: string;
  link?: string | null;
  targetUserId?: string;
  targetDiscordUserId?: string;
}) {
  if (!input.message?.trim()) {
    return { ok: false, error: "message required" };
  }

  let targetUserId = input.targetUserId;
  if (!targetUserId && input.targetDiscordUserId) {
    const user = await findUserByDiscordId(input.targetDiscordUserId);
    targetUserId = user?.id;
  }

  if (targetUserId) {
    await notifyUser(targetUserId, input.message.trim(), input.link ?? "/home");
    return { ok: true, targeted: true, userId: targetUserId };
  }

  // Broadcast a site-wide ephemeral announcement on the realtime bus
  await publishRealtime(
    "discord.community.announce",
    {
      message: input.message.trim().slice(0, 500),
      link: input.link ?? null,
    },
    { global: true }
  );

  return { ok: true, targeted: false, global: true };
}

export async function handleLinkAccount(input: {
  discordUserId: string;
  saintsUserId?: string;
  saintsUsername?: string;
}) {
  let user =
    (input.saintsUserId &&
      (await prisma.user.findUnique({
        where: { id: input.saintsUserId },
        select: { id: true, username: true, permissionLevel: true, discordId: true },
      }))) ||
    null;

  if (!user && input.saintsUsername) {
    user = await prisma.user.findUnique({
      where: { username: input.saintsUsername },
      select: { id: true, username: true, permissionLevel: true, discordId: true },
    });
  }

  if (!user) {
    return { ok: false, error: "Saints user not found" };
  }

  await ensureDiscordIdLinked(user.id, input.discordUserId);

  await notifyUser(user.id, "Your Discord account is now linked to Saints Gaming.", "/profile");

  await publishRealtime(
    "discord.member.linked",
    {
      userId: user.id,
      discordUserId: input.discordUserId,
      username: user.username,
    },
    { userId: user.id }
  );

  // Passiveively re-check achievements after link
  try {
    const { checkAndAwardAchievements } = await import("@/web/lib/achievements");
    await checkAndAwardAchievements(user.id);
  } catch {
    /* ignore */
  }


  return { ok: true, userId: user.id, username: user.username };
}
