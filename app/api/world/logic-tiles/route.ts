import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tiles = await prisma.mapLogicTile.findMany();
    // Return them mapped by id for O(1) lookup in the frontend
    const tileMap = tiles.reduce((acc, tile) => {
      acc[tile.id] = tile;
      return acc;
    }, {} as Record<number, any>);
    
    return NextResponse.json({ success: true, data: tileMap });
  } catch (error) {
    console.error("[GET_LOGIC_TILES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Basic auth check can go here if needed
    const body = await req.json();
    const { 
      id, 
      name, 
      color, 
      isSolid, 
      interactable, 
      onInteractAction, 
      onInteractPayload, 
      onStepAction, 
      onStepPayload 
    } = body;

    const newTile = await prisma.mapLogicTile.upsert({
      where: { id: parseInt(id) },
      update: {
        name,
        color,
        isSolid,
        interactable,
        onInteractAction,
        onInteractPayload: onInteractPayload ? JSON.stringify(onInteractPayload) : null,
        onStepAction,
        onStepPayload: onStepPayload ? JSON.stringify(onStepPayload) : null
      },
      create: {
        id: parseInt(id),
        name,
        color,
        isSolid,
        interactable,
        onInteractAction,
        onInteractPayload: onInteractPayload ? JSON.stringify(onInteractPayload) : null,
        onStepAction,
        onStepPayload: onStepPayload ? JSON.stringify(onStepPayload) : null
      }
    });

    return NextResponse.json({ success: true, data: newTile });
  } catch (error) {
    console.error("[POST_LOGIC_TILE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
