import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { mapId } = body;
    if (!mapId) {
      return NextResponse.json({ success: false, error: 'mapId is required' }, { status: 400 });
    }

    // In a fully scaled system, we would look up the specific World Server hosting this mapId.
    // For now, we route to the active Dedicated World Server defined in env vars.
    const serverUrl = process.env.NEXT_PUBLIC_GO_MMO_URL || 'http://localhost:24011';
    
    // We issue a joinToken. The World Server will validate this token.
    // For MVP, we use the DevBypassToken format until we implement signing a JWT for the dedicated server.
    const joinToken = "dev:" + session.user.id;

    return NextResponse.json({
      success: true,
      serverUrl,
      joinToken
    });
  } catch (error: any) {
    console.error('[api/realm/route] POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
