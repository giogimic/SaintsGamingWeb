import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import {
  generateStudioToken,
  hashStudioToken,
  getAuthenticatedStudioUser,
} from '@/server/auth/studioApiAuth';
import { canEnterStudio } from '@/shared/game/studioPermissions';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedStudioUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be logged into Saints Gaming.' },
        { status: 401 }
      );
    }

    if (!canEnterStudio(user.permissionLevel)) {
      return NextResponse.json(
        { error: 'Forbidden. Your account does not have Studio access permissions.' },
        { status: 403 }
      );
    }

    const rawToken = generateStudioToken();
    const tokenHash = hashStudioToken(rawToken);
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    await prisma.studioSessionToken.create({
      data: {
        userId: user.id,
        tokenHash,
        name: 'Windows Desktop Studio',
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      token: rawToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        permissionLevel: user.permissionLevel,
      },
    });
  } catch (error: any) {
    console.error('Error issuing studio session token:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate studio token' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedStudioUser(req);

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired studio token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        permissionLevel: user.permissionLevel,
        displayName: user.displayName,
        image: user.image,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error?.message || 'Verification error' },
      { status: 500 }
    );
  }
}
