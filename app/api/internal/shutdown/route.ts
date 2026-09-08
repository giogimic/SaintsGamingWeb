import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required for shutdown' },
        { status: 403 }
      );
    }

    console.warn('[SHUTDOWN] Administrator initiated graceful restart. Exiting process...');
    
    // We send a success response first before actually exiting
    // so the client doesn't get a connection hang.
    setTimeout(() => {
      process.exit(0);
    }, 1000);

    return NextResponse.json({
      success: true,
      message: 'Server is gracefully restarting. Please wait a moment for it to come back online.',
    });
  } catch (error) {
    console.error('[api/internal/shutdown] Shutdown failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate shutdown' },
      { status: 500 }
    );
  }
}
