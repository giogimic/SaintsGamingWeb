import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Assuming a db instance in lib

// This is a simple API for the FiveM server to interact with the database.
// In a real scenario, protect this with an API key/secret in the headers.

export async function GET(req: Request) {
  const apiKey = req.headers.get("Authorization");
  if (apiKey !== (process.env.FIVEM_API_KEY || process.env.AUTH_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const license = searchParams.get("license");

  if (!license) {
    return NextResponse.json({ error: "Missing license" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { fivemLicense: license },
      include: {
        characters: {
          include: {
            properties: true,
            vehicles: true,
            faction: true,
            gang: true,
            businesses: true,
            inventory: true,
          }
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
  const apiKey = req.headers.get("Authorization");
  if (apiKey !== (process.env.FIVEM_API_KEY || process.env.AUTH_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, characterId, data } = body;

    if (!characterId || !action) {
      return NextResponse.json({ error: "Missing characterId or action" }, { status: 400 });
    }

    if (action === "updateCoords") {
      if (!data.coords || typeof data.coords !== 'object') {
        return NextResponse.json({ error: "Invalid coords payload" }, { status: 400 });
      }
      const updated = await prisma.character.update({
        where: { id: characterId },
        data: { lastCoords: JSON.stringify(data.coords) }
      });
      return NextResponse.json({ success: true, character: updated });
    }

    if (action === "updateDrugs") {
       if (!data.drugStats || typeof data.drugStats !== 'object') {
         return NextResponse.json({ error: "Invalid drugStats payload" }, { status: 400 });
       }
       const updated = await prisma.character.update({
         where: { id: characterId },
         data: { drugStats: JSON.stringify(data.drugStats) }
       });
       return NextResponse.json({ success: true, character: updated });
    }

    if (action === "updateInventory") {
      // Basic implementation for syncing an inventory item
      const { itemKey, quantity, metadata } = data;
      
      if (metadata && typeof metadata !== 'object') {
        return NextResponse.json({ error: "Invalid metadata payload" }, { status: 400 });
      }
      
      const inventoryItem = await prisma.inventoryItem.upsert({
        where: {
          characterId_itemKey: {
            characterId: characterId,
            itemKey: itemKey
          }
        },
        update: { quantity: quantity, metadata: metadata ? JSON.stringify(metadata) : null },
        create: {
          characterId: characterId,
          itemKey: itemKey,
          quantity: quantity,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });
      return NextResponse.json({ success: true, inventoryItem });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update character:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
