import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { exec } from "child_process";
import path from "path";
import os from "os";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });

    // Require head admin / founder
    if (!user || user.permissionLevel < 1000) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let updateType = "auto";
    let wipeGameData = false;
    try {
      const body = await req.json();
      if (body && typeof body.updateType === "string") {
        const cleanType = body.updateType.toLowerCase().trim();
        if (["auto", "quick", "app", "db", "full", "restart"].includes(cleanType)) {
          updateType = cleanType;
        }
      }
      if (body && typeof body.wipeGameData === "boolean") {
        wipeGameData = body.wipeGameData;
      }
    } catch {
      // Fall back to default 'auto' if no JSON body
    }

    if (wipeGameData) {
      console.log("[SystemUpdate] Admin requested game data wipe. Resetting gameplay records...");
      try {
        await prisma.playerCreature.deleteMany({});
        await prisma.playerInventoryItem.deleteMany({});
        await prisma.playerSkill.deleteMany({});
        await prisma.playerStats.deleteMany({});
        await prisma.worldMap.deleteMany({});
        await prisma.gameMap.deleteMany({});
      } catch (wipeErr) {
        console.warn("[SystemUpdate] Non-fatal error during table wipe:", wipeErr);
      }
    }

    const isWindows = os.platform() === "win32";
    const scriptName = isWindows ? "update.bat" : "update.sh";
    const scriptPath = path.join(process.cwd(), "scripts", scriptName);
    
    // Execute the script in the background with the chosen update profile
    const cmd = isWindows 
      ? `"${scriptPath}" ${updateType}` 
      : `bash "${scriptPath}" --type=${updateType} --non-interactive`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Update script (${updateType}) error: ${error}`);
        return;
      }
      console.log(`Update script (${updateType}) output: ${stdout}`);
      if (stderr) console.error(`Update script (${updateType}) stderr: ${stderr}`);
    });

    return NextResponse.json({ 
      success: true, 
      updateType,
      wipeGameData,
      message: `System update (${updateType.toUpperCase()}) initiated${wipeGameData ? ' with clean data wipe' : ''}. The server may restart shortly.` 
    });

  } catch (error) {
    console.error("System update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
