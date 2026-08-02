import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { emitCharacterUpdated } from "@/web/lib/fivem-bridge";

function authorize(req: Request): boolean {
  const apiKey = req.headers.get("Authorization");
  const secret =
    process.env.FIVEM_API_KEY ||
    process.env.SAINTS_INTERNAL_SECRET ||
    process.env.AUTH_SECRET;
  if (!secret || !apiKey) return false;
  return apiKey === `Bearer ${secret}` || apiKey === secret;
}

// Legacy FiveM sync API (coords / drugs / inventory). Prefer /api/fivem/events for
// coarse character/stats and presence. Coords stay here — never on the realtime bus.

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const license = searchParams.get("license");

  if (!license) {
    return NextResponse.json({ error: "Missing license" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { fivemLicense: license },
          { fivemLicense: license.replace(/^license:/i, "").toLowerCase() },
          { fivemLicense: `license:${license.replace(/^license:/i, "").toLowerCase()}` },
        ],
      },
      include: {
        characters: {
          include: {
            properties: true,
            vehicles: true,
            faction: true,
            gang: true,
            businesses: true,
            inventory: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ characters: user.characters });
  } catch (error) {
    console.error("Failed to fetch characters:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, characterId, data } = body;

    if (!characterId || !action) {
      return NextResponse.json({ error: "Missing characterId or action" }, { status: 400 });
    }

    if (action === "updateCoords") {
      if (!data?.coords || typeof data.coords !== "object") {
        return NextResponse.json({ error: "Invalid coords payload" }, { status: 400 });
      }
      const updated = await prisma.character.update({
        where: { id: characterId },
        data: { lastCoords: JSON.stringify(data.coords) },
      });
      // Intentionally no realtime emit — high-frequency tick path.
      return NextResponse.json({ success: true, character: updated });
    }

    if (action === "updateDrugs") {
      if (!data?.drugStats || typeof data.drugStats !== "object") {
        return NextResponse.json({ error: "Invalid drugStats payload" }, { status: 400 });
      }
      const updated = await prisma.character.update({
        where: { id: characterId },
        data: { drugStats: JSON.stringify(data.drugStats) },
      });
      await emitCharacterUpdated(updated);
      return NextResponse.json({ success: true, character: updated });
    }

    if (action === "updateInventory") {
      const { itemKey, quantity, metadata } = data || {};

      if (!itemKey || typeof quantity !== "number") {
        return NextResponse.json({ error: "Invalid inventory payload" }, { status: 400 });
      }
      if (metadata && typeof metadata !== "object") {
        return NextResponse.json({ error: "Invalid metadata payload" }, { status: 400 });
      }

      const inventoryItem = await prisma.inventoryItem.upsert({
        where: {
          characterId_itemKey: {
            characterId: characterId,
            itemKey: itemKey,
          },
        },
        update: { quantity: quantity, metadata: metadata ? JSON.stringify(metadata) : null },
        create: {
          characterId: characterId,
          itemKey: itemKey,
          quantity: quantity,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      const character = await prisma.character.findUnique({ where: { id: characterId } });
      if (character) {
        await emitCharacterUpdated(character);
      }

      return NextResponse.json({ success: true, inventoryItem });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update character:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
