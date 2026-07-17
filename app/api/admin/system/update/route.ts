import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import path from "path";
import os from "os";

export async function POST() {
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

    const isWindows = os.platform() === "win32";
    const scriptName = isWindows ? "update.bat" : "update.sh";
    
    // Execute the script in the background
    // We don't await the full result because the server might restart mid-request
    const scriptPath = path.join(process.cwd(), scriptName);
    
    exec(`"${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Update script error: ${error}`);
        return;
      }
      console.log(`Update script output: ${stdout}`);
      if (stderr) console.error(`Update script stderr: ${stderr}`);
    });

    return NextResponse.json({ 
      success: true, 
      message: "Update process started. The server may restart shortly." 
    });

  } catch (error) {
    console.error("System update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
