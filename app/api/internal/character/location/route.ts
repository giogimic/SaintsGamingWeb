import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SAINTS_INTERNAL_SECRET || process.env.AUTH_SECRET || "";
    
    // Allow either Bearer token or custom header for internal RPC
    const customHeader = request.headers.get("X-Saints-Internal-Secret");
    const isAuthorized = (authHeader === `Bearer ${secret}`) || (customHeader === secret);
    
    if (!isAuthorized || !secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { characterId, userId, mapId, x, y, z, isHome, timestamp } = body;

    if (!characterId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch the character to check idempotency/sequence
    const character = await prisma.gameCharacter.findUnique({
      where: { id: characterId, userId: userId },
    });

    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Idempotency check using stateData JSON
    let stateDataObj: any = {};
    try {
      stateDataObj = JSON.parse(character.stateData || "{}");
    } catch (e) {
      stateDataObj = {};
    }

    const lastSyncKey = isHome ? "lastHomeSyncAt" : "lastLocationSyncAt";
    const lastSyncAt = stateDataObj[lastSyncKey] || 0;

    // If the incoming timestamp is older than or equal to the last sync, ignore it (idempotency)
    if (timestamp && timestamp <= lastSyncAt) {
      return NextResponse.json({ success: true, ignored: true, reason: "older timestamp" });
    }

    // Update the stateData with the new timestamp
    if (timestamp) {
      stateDataObj[lastSyncKey] = timestamp;
    }

    const updateData: any = {
      stateData: JSON.stringify(stateDataObj)
    };
    
    if (isHome) {
      if (mapId) updateData.homeMapId = mapId;
      if (x !== undefined) updateData.homeX = x;
      if (y !== undefined) updateData.homeY = y;
      if (z !== undefined) updateData.homeZ = z;
    } else {
      if (mapId) updateData.lastMapId = mapId;
      if (x !== undefined) updateData.lastX = x;
      if (y !== undefined) updateData.lastY = y;
      if (z !== undefined) updateData.lastZ = z;
    }

    await prisma.gameCharacter.updateMany({
      where: { id: characterId, userId: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
