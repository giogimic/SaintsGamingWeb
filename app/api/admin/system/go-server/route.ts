import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { spawn, ChildProcess, execSync } from "child_process";
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

    let isRunning = false;
    
    if (process.platform === "linux") {
      try {
        const output = execSync("bash scripts/status-go.sh", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
        isRunning = output.trim() === "running";
      } catch (err) {
        isRunning = false;
      }
    } else {
      isRunning = !!(g[GO_SERVER_SYMBOL] && !g[GO_SERVER_SYMBOL].killed);
    }
    
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
      console.log("[GoServer API] Starting Go MMO Server...");
      
      if (process.platform === "linux") {
        // On Debian, rely entirely on the root bash script for Docker/Systemd execution
        const proc = spawn("bash", ["scripts/start-go.sh"], {
          cwd: process.cwd(),
          stdio: "inherit",
        });
        
        proc.on("error", (err) => console.error("[GoServer API] Failed to run start-go.sh:", err));
        return NextResponse.json({ success: true, message: "Go MMO Server start script triggered" });
      } else {
        // Windows fallback: use raw `go run`
        if (g[GO_SERVER_SYMBOL] && !g[GO_SERVER_SYMBOL].killed) {
          return NextResponse.json({ success: false, message: "Go server is already running" }, { status: 400 });
        }
        
        const serverCwd = path.join(process.cwd(), "the-lobby");
        
        const proc = spawn("go", ["run", "cmd/server/main.go"], {
          cwd: serverCwd,
          stdio: "inherit",
          shell: true, 
        });

        proc.on("error", (err) => console.error("[GoServer API] Failed to start Go server:", err));
        proc.on("exit", (code, signal) => {
          console.log(`[GoServer API] Go server exited with code ${code} (signal ${signal})`);
          if (g[GO_SERVER_SYMBOL] === proc) {
            g[GO_SERVER_SYMBOL] = null;
          }
        });

        g[GO_SERVER_SYMBOL] = proc;
        return NextResponse.json({ success: true, message: "Go MMO Server started locally" });
      }
    } 
    else if (action === "stop") {
      console.log("[GoServer API] Stopping Go MMO Server...");
      
      if (process.platform === "linux") {
        const proc = spawn("bash", ["scripts/stop-go.sh"], {
          cwd: process.cwd(),
          stdio: "inherit",
        });
        
        proc.on("error", (err) => console.error("[GoServer API] Failed to run stop-go.sh:", err));
        return NextResponse.json({ success: true, message: "Go MMO Server stop script triggered" });
      } else {
        if (!g[GO_SERVER_SYMBOL] || g[GO_SERVER_SYMBOL].killed) {
          return NextResponse.json({ success: false, message: "Go server is not running" }, { status: 400 });
        }

        const proc = g[GO_SERVER_SYMBOL];
        proc.kill("SIGTERM");
        g[GO_SERVER_SYMBOL] = null;

        return NextResponse.json({ success: true, message: "Go MMO Server stopped locally" });
      }
    }
    else {
      return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("Go server control error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
