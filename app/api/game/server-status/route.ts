import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { canUseStudioServerControls } from '@/shared/game/studioPermissions';
import { spawn } from 'child_process';
import path from 'path';

// In-memory dev override toggle state (defaults to online in dev mode)
let devServerStatusOverride: 'online' | 'offline' | 'maintenance' | null = null;

export async function GET() {
  try {
    if (devServerStatusOverride === 'maintenance') {
      return NextResponse.json({
        players: 0,
        capacity: 500,
        status: 'maintenance',
        isDevOverride: true
      });
    }

    // Attempt to hit external game server endpoints (Go MMO or configured dev instance)
    const goMmoBase = process.env.GO_MMO_INTERNAL_URL || process.env.NEXT_PUBLIC_GO_MMO_URL;
    const urlsToTry: string[] = [];
    if (goMmoBase) {
      urlsToTry.push(`${goMmoBase.replace(/\/$/, '')}/api/health`, `${goMmoBase.replace(/\/$/, '')}/healthz`);
    }
    // Also try direct Docker and localhost addresses
    urlsToTry.push(
      'http://127.0.0.1:24011/api/health',
      'http://game-server:24011/api/health'
    );

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            players: data.players ?? (data.map ? 1 : 0),
            capacity: data.capacity ?? 500,
            status: 'online',
          });
        }
      } catch {
        continue;
      }
    }

    // If an admin manually clicked "Start Realm", report starting until Go responds
    if (devServerStatusOverride === 'online') {
      return NextResponse.json({
        players: 0,
        capacity: 500,
        status: 'starting',
        isDevOverride: true
      });
    }

    // In local development mode without a running Go server, provide dev fallback
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        players: 1,
        capacity: 500,
        status: 'online',
        isDevMode: true
      });
    }

    return NextResponse.json({
      players: 0,
      capacity: 500,
      status: 'offline'
    });

  } catch {
    return NextResponse.json({
      players: 0,
      capacity: 500,
      status: 'offline'
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || !canUseStudioServerControls(user.permissionLevel)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    if (body.action === 'start' || body.status === 'online') {
      devServerStatusOverride = 'online';

      // Proactively trigger the Go MMO start script if on Linux
      if (process.platform === 'linux') {
        try {
          const proc = spawn('bash', ['scripts/start-go.sh'], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore',
          });
          proc.unref();
        } catch (spawnErr) {
          console.error('[server-status] Failed to spawn start-go.sh:', spawnErr);
        }
      } else {
        // Windows fallback
        try {
          const serverCwd = path.join(process.cwd(), 'the-lobby');
          const proc = spawn('go', ['run', 'cmd/server/main.go'], {
            cwd: serverCwd,
            detached: true,
            stdio: 'ignore',
            shell: true,
          });
          proc.unref();
        } catch (spawnErr) {
          console.error('[server-status] Failed to spawn Go server locally:', spawnErr);
        }
      }
    } else if (body.action === 'maintenance' || body.status === 'maintenance') {
      devServerStatusOverride = 'maintenance';
    } else if (body.action === 'stop' || body.status === 'offline') {
      devServerStatusOverride = 'offline';

      if (process.platform === 'linux') {
        try {
          const proc = spawn('bash', ['scripts/stop-go.sh'], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore',
          });
          proc.unref();
        } catch (spawnErr) {
          console.error('[server-status] Failed to spawn stop-go.sh:', spawnErr);
        }
      }
    } else if (body.action === 'reset') {
      devServerStatusOverride = null;
    }

    return NextResponse.json({
      success: true,
      status: devServerStatusOverride || 'online',
      devOverride: devServerStatusOverride
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
