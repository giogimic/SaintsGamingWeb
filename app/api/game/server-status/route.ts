import { NextResponse } from 'next/server';

// In-memory dev override toggle state (defaults to online in dev mode)
let devServerStatusOverride: 'online' | 'offline' | null = null;

export async function GET() {
  try {
    if (devServerStatusOverride !== null) {
      return NextResponse.json({
        players: devServerStatusOverride === 'online' ? 1 : 0,
        capacity: 500,
        status: devServerStatusOverride,
        isDevOverride: true
      });
    }

    // Attempt to hit external game server endpoints or local dev instance
    const urlsToTry = [
      'http://game-server:3001/status', // Docker Compose environment
      'http://localhost:3001/status',   // PM2 or separate process
      'http://127.0.0.1:3001/status',
    ];

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            players: data.players ?? 1,
            capacity: data.capacity ?? 500,
            status: data.status ?? 'online',
          });
        }
      } catch {
        continue;
      }
    }

    // In local development or standalone Next.js server mode, the web server is online
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE !== undefined) {
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
    const body = await req.json();
    if (body.action === 'start' || body.status === 'online') {
      devServerStatusOverride = 'online';
    } else if (body.action === 'stop' || body.status === 'offline') {
      devServerStatusOverride = 'offline';
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
