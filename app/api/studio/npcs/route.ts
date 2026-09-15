import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { verifyStudioPermission } from "@/server/auth/studioApiAuth";
import { STUDIO_CONTENT_WRITE_LEVEL } from "@/shared/game/studioPermissions";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyStudioPermission(request, 10);
    if ("errorResponse" in authCheck) {
      return authCheck.errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "saints";
    const npcs = await prisma.npcDef.findMany({
      where: { gameId },
      orderBy: { updatedAt: "desc" }
    });
    
    return NextResponse.json({ success: true, data: npcs });
  } catch (error) {
    console.error("Failed to list NpcDefs:", error);
    return NextResponse.json({ error: "Failed to list NpcDefs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyStudioPermission(request, STUDIO_CONTENT_WRITE_LEVEL);
    if ("errorResponse" in authCheck) {
      return authCheck.errorResponse;
    }

    const body = await request.json();
    const { slug, name, description, componentsData, gameId } = body;
    
    if (!slug || !name || !componentsData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const npc = await prisma.npcDef.upsert({
      where: { slug },
      update: {
        name,
        description,
        componentsData,
        gameId: gameId || "saints",
        version: { increment: 1 }
      },
      create: {
        slug,
        name,
        description,
        componentsData,
        gameId: gameId || "saints",
        version: 1
      }
    });
    
    return NextResponse.json({ success: true, data: npc });
  } catch (error) {
    console.error("Failed to upsert NpcDef:", error);
    return NextResponse.json({ error: "Failed to upsert NpcDef" }, { status: 500 });
  }
}
