/**
 * POST /api/fivem/events
 *
 * Ingestion endpoint for the Saints FiveM game server.
 * Auth: Authorization: Bearer <FIVEM_API_KEY|SAINTS_INTERNAL_SECRET|AUTH_SECRET>
 * Header: X-Service-Name: fivem-server (recommended)
 *
 * Body:
 * {
 *   action: "player_joined" | "player_left" | "sync_character" | "bank_transaction" | "link_license",
 *   ...action-specific fields
 * }
 *
 * For raw realtime bus envelopes (already registered types), prefer POST /api/internal/events
 * with source: "fivem". Do not send per-tick coords on either path.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  handleBankTransaction,
  handleLinkLicense,
  handlePlayerJoined,
  handlePlayerLeft,
  handleSyncCharacter,
} from "@/web/lib/fivem-bridge";

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const secret =
    process.env.FIVEM_API_KEY ||
    process.env.SAINTS_INTERNAL_SECRET ||
    process.env.AUTH_SECRET;
  if (!secret || !authHeader) return false;
  return authHeader === `Bearer ${secret}` || authHeader === secret;
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("player_joined"),
    fivemLicense: z.string().min(1),
    characterId: z.string().optional(),
    characterName: z.string().optional(),
    playerCount: z.number().int().nonnegative().optional(),
  }),
  z.object({
    action: z.literal("player_left"),
    fivemLicense: z.string().min(1),
    playerCount: z.number().int().nonnegative().optional(),
  }),
  z.object({
    action: z.literal("sync_character"),
    fivemLicense: z.string().min(1),
    characterId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    cash: z.number().int().optional(),
    bank: z.number().int().optional(),
    health: z.number().int().optional(),
    armor: z.number().int().optional(),
    isDead: z.boolean().optional(),
    drugStats: z.record(z.unknown()).optional(),
    phoneNumber: z.string().optional(),
  }),
  z.object({
    action: z.literal("bank_transaction"),
    characterId: z.string().min(1),
    type: z.string().min(1),
    amount: z.number().int(),
    fivemLicense: z.string().optional(),
    description: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("link_license"),
    fivemLicense: z.string().min(1),
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

  const serviceName = req.headers.get("x-service-name") ?? "fivem-server";

  try {
    let result: Record<string, unknown>;
    switch (parsed.data.action) {
      case "player_joined":
        result = await handlePlayerJoined(parsed.data);
        break;
      case "player_left":
        result = await handlePlayerLeft(parsed.data);
        break;
      case "sync_character":
        result = await handleSyncCharacter(parsed.data);
        break;
      case "bank_transaction":
        result = await handleBankTransaction(parsed.data);
        break;
      case "link_license":
        result = await handleLinkLicense(parsed.data);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    console.log(
      `[FiveM Events] action=${parsed.data.action} service=${serviceName} ok=${result.ok !== false}`
    );
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[FiveM Events] handler error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "fivem-events",
    actions: [
      "player_joined",
      "player_left",
      "sync_character",
      "bank_transaction",
      "link_license",
    ],
    auth: "Bearer FIVEM_API_KEY or SAINTS_INTERNAL_SECRET",
    note: "Coords ticks stay on /api/fivem/characters updateCoords — not on the realtime bus",
  });
}
