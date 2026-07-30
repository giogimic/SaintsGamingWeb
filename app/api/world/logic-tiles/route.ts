import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tiles = await prisma.mapLogicTile.findMany();
    return NextResponse.json(tiles);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logic tiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { id, name, color, isSolid, interactable, onInteractAction, onInteractPayload, onStepAction, onStepPayload } = data;

    const tile = await prisma.mapLogicTile.upsert({
      where: { id: Number(id) },
      update: {
        name,
        color,
        isSolid: Boolean(isSolid),
        interactable: Boolean(interactable),
        onInteractAction: onInteractAction || null,
        onInteractPayload: onInteractPayload ? JSON.stringify(onInteractPayload) : null,
        onStepAction: onStepAction || null,
        onStepPayload: onStepPayload ? JSON.stringify(onStepPayload) : null
      },
      create: {
        id: Number(id),
        name,
        color,
        isSolid: Boolean(isSolid),
        interactable: Boolean(interactable),
        onInteractAction: onInteractAction || null,
        onInteractPayload: onInteractPayload ? JSON.stringify(onInteractPayload) : null,
        onStepAction: onStepAction || null,
        onStepPayload: onStepPayload ? JSON.stringify(onStepPayload) : null
      }
    });

    return NextResponse.json(tile);
  } catch (error) {
    console.error("[API/LogicTiles] POST error:", error);
    return NextResponse.json({ error: "Failed to save logic tile" }, { status: 500 });
  }
}
