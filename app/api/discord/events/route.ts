/**
 * POST /api/discord/events
 *
 * Ingestion endpoint for the Saints Discord bot.
 * Auth: Authorization: Bearer <SAINTS_INTERNAL_SECRET|DISCORD_BOT_SECRET>
 * Header: X-Service-Name: discord-bot (recommended)
 *
 * Body:
 * {
 *   action: "member_joined" | "role_sync" | "community_announce" | "link_account",
 *   ...action-specific fields
 * }
 *
 * For raw realtime bus envelopes, prefer POST /api/internal/events.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  handleCommunityAnnounce,
  handleLinkAccount,
  handleMemberJoined,
  handleRoleSync,
} from "@/web/lib/discord-bridge";

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret =
    process.env.DISCORD_BOT_SECRET || process.env.SAINTS_INTERNAL_SECRET;
  if (!secret || !authHeader) return false;
  return authHeader === `Bearer ${secret}`;
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("member_joined"),
    discordUserId: z.string().min(1),
    discordUsername: z.string().optional(),
  }),
  z.object({
    action: z.literal("role_sync"),
    discordUserId: z.string().min(1),
    discordRoleIds: z.array(z.string()).default([]),
    forceDemote: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("community_announce"),
    message: z.string().min(1).max(500),
    link: z.string().nullable().optional(),
    targetUserId: z.string().optional(),
    targetDiscordUserId: z.string().optional(),
  }),
  z.object({
    action: z.literal("link_account"),
    discordUserId: z.string().min(1),
    saintsUserId: z.string().optional(),
    saintsUsername: z.string().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const serviceName = req.headers.get("x-service-name") ?? "discord-bot";

  try {
    let result: Record<string, unknown>;
    switch (parsed.data.action) {
      case "member_joined":
        result = await handleMemberJoined(parsed.data);
        break;
      case "role_sync":
        result = await handleRoleSync(parsed.data);
        break;
      case "community_announce":
        result = await handleCommunityAnnounce(parsed.data);
        break;
      case "link_account":
        result = await handleLinkAccount(parsed.data);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    console.log(
      `[Discord Events] action=${parsed.data.action} service=${serviceName} ok=${result.ok !== false}`
    );
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[Discord Events] handler error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "discord-events",
    actions: ["member_joined", "role_sync", "community_announce", "link_account"],
    auth: "Bearer SAINTS_INTERNAL_SECRET or DISCORD_BOT_SECRET",
  });
}
