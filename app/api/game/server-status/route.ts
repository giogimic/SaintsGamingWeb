import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Attempt to hit the game server via localhost (if running locally or via PM2)
    // or via the Docker container hostname 'game-server'
    const urlsToTry = [
      'http://game-server:3001/status', // Docker Compose environment
      'http://localhost:3001/status',   // Local dev or PM2
      'http://127.0.0.1:3001/status'
    ];

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      } catch (err) {
        // Ignore and try next URL
        continue;
      }
    }

    // If all fail, server is offline
    return NextResponse.json({
      players: 0,
      capacity: 500,
      status: 'offline'
    });

  } catch (err) {
    return NextResponse.json({
      players: 0,
      capacity: 500,
      status: 'offline'
    });
  }
}
