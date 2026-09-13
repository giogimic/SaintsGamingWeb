import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { spawn, ChildProcess } from "child_process";
import path from "path";

// Define a global symbol so it persists across Next.js HMR
const GO_SERVER_SYMBOL = Symbol.for("sg.goServerProcess");

interface GlobalWithProcess {
  [GO_SERVER_SYMBOL]?: ChildProcess | null;
}

const g = global as GlobalWithProcess;

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });

    if (!user || user.permissionLevel < 1000) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const isRunning = g[GO_SERVER_SYMBOL] && !g[GO_SERVER_SYMBOL].killed;
    
    return NextResponse.json({ 
      success: true, 
      status: isRunning ? "running" : "stopped",
    });

  } catch (error) {
    console.error("Go server status error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

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

    if (!user || user.permissionLevel < 1000) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action;

    if (action === "start") {
      if (g[GO_SERVER_SYMBOL] && !g[GO_SERVER_SYMBOL].killed) {
        return NextResponse.json({ success: false, message: "Go server is already running" }, { status: 400 });
      }

      console.log("[GoServer API] Starting Go MMO Server...");
      
      const serverCwd = path.join(process.cwd(), "the-lobby");
      
      const proc = spawn("go", ["run", "cmd/server/main.go"], {
        cwd: serverCwd,
        stdio: "inherit",
        shell: true, // Use shell to ensure 'go' is found in PATH
      });

      proc.on("error", (err) => {
        console.error("[GoServer API] Failed to start Go server:", err);
      });

      proc.on("exit", (code, signal) => {
        console.log(`[GoServer API] Go server exited with code ${code} (signal ${signal})`);
        if (g[GO_SERVER_SYMBOL] === proc) {
          g[GO_SERVER_SYMBOL] = null;
        }
      });

      g[GO_SERVER_SYMBOL] = proc;

      return NextResponse.json({ success: true, message: "Go MMO Server started" });
    } 
    else if (action === "stop") {
      if (!g[GO_SERVER_SYMBOL] || g[GO_SERVER_SYMBOL].killed) {
        return NextResponse.json({ success: false, message: "Go server is not running" }, { status: 400 });
      }

      console.log("[GoServer API] Stopping Go MMO Server...");
      const proc = g[GO_SERVER_SYMBOL];
      
      // Send termination signal
      proc.kill("SIGTERM");
      
      // Cleanup reference
      g[GO_SERVER_SYMBOL] = null;

      return NextResponse.json({ success: true, message: "Go MMO Server stopped" });
    }
    else {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("Go server control error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
