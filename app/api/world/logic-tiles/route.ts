import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { AuditService } from "@/server/audit/AuditService";


export async function GET() {
  try {
    const tiles = await prisma.mapLogicTile.findMany();
    const keyed: Record<number, (typeof tiles)[number]> = {};
    for (const tile of tiles) {
      keyed[tile.id] = tile;
    }
    // Dual shape: array (legacy) + { success, data } for lobby store
    return NextResponse.json({ success: true, data: keyed, tiles });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logic tiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || !canWriteStudioContent(user.permissionLevel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    const {
      id,
      name,
      color,
      isSolid,
      interactable,
      onInteractAction,
      onInteractPayload,
      onStepAction,
      onStepPayload,
    } = data;

    // Security compliance audit record prior to DB write
    await AuditService.write({
      userId: session.user.id,
      action: "logicTile.upsert",
      resource: { type: "logicTile", id: String(id) },
      after: { id, name, isSolid, interactable },
    });

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
        onStepPayload: onStepPayload ? JSON.stringify(onStepPayload) : null,
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
        onStepPayload: onStepPayload ? JSON.stringify(onStepPayload) : null,
      },
    });

    return NextResponse.json(tile);
  } catch (error) {
    console.error("[API/LogicTiles] POST error:", error);
    return NextResponse.json({ error: "Failed to save logic tile" }, { status: 500 });
  }
}
