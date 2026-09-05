import crypto from 'crypto';
import { prisma } from '@/web/lib/prisma';
import { canEnterStudio, STUDIO_ENTRY_LEVEL } from '@/shared/game/studioPermissions';
import { SeraphtResponse } from 'serapht/server';

let authFn: (() => Promise<any>) | null = null;
async function resolveSeraphtAuth() {
  if (!authFn) {
    try {
      const authModule = await import('@/auth');
      authFn = authModule.auth;
    } catch {
      authFn = null;
    }
  }
  return authFn;
}

export interface StudioAuthUser {
  id: string;
  username: string;
  email: string;
  permissionLevel: number;
  displayName: string | null;
  image: string | null;
}

export function hashStudioToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateStudioToken(): string {
  return `sg_studio_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Resolves the authenticated user from either SeraphtAuth session cookie
 * or an `Authorization: Bearer <token>` header against `StudioSessionToken`.
 */
export async function getAuthenticatedStudioUser(
  req?: Request | Headers | null
): Promise<StudioAuthUser | null> {
  // 1. Check Bearer token from header first if request/headers provided
  let authHeader: string | null = null;
  if (req) {
    if (req instanceof Headers) {
      authHeader = req.get('authorization');
    } else if (typeof (req as Request).headers?.get === 'function') {
      authHeader = (req as Request).headers.get('authorization');
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    if (rawToken) {
      const tokenHash = hashStudioToken(rawToken);
      const sessionToken = await prisma.studioSessionToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              permissionLevel: true,
              displayName: true,
              image: true,
              isBanned: true,
            },
          },
        },
      });

      if (sessionToken && !sessionToken.user.isBanned && sessionToken.expiresAt > new Date()) {
        // Fire-and-forget update last used timestamp
        prisma.studioSessionToken.update({
          where: { id: sessionToken.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        return {
          id: sessionToken.user.id,
          username: sessionToken.user.username,
          email: sessionToken.user.email,
          permissionLevel: sessionToken.user.permissionLevel,
          displayName: sessionToken.user.displayName,
          image: sessionToken.user.image,
        };
      }
    }
  }

  // 2. Fallback to SeraphtAuth cookie session
  try {
    const auth = await resolveSeraphtAuth();
    if (auth) {
      const session = await auth();
      if (session?.user?.id) {
        const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          permissionLevel: true,
          displayName: true,
          image: true,
          isBanned: true,
        },
      });

        if (user && !user.isBanned) {
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            permissionLevel: user.permissionLevel,
            displayName: user.displayName,
            image: user.image,
          };
        }
      }
    }
  } catch (err) {
    // Non-fatal, return null
  }

  return null;
}

/**
 * Validates request and ensures user satisfies minimum required studio permission level.
 * Returns either `{ user }` or `{ errorResponse }`.
 */
export async function verifyStudioPermission(
  req?: Request | Headers | null,
  requiredLevel: number = STUDIO_ENTRY_LEVEL
): Promise<{ user: StudioAuthUser } | { errorResponse: SeraphtResponse }> {
  const user = await getAuthenticatedStudioUser(req);

  if (!user) {
    return {
      errorResponse: SeraphtResponse.json(
        { error: 'Unauthorized. Valid session or Bearer token required.' },
        { status: 401 }
      ),
    };
  }

  if (user.permissionLevel < requiredLevel) {
    return {
      errorResponse: SeraphtResponse.json(
        { error: 'Forbidden. Insufficient permissions to access Studio tools.' },
        { status: 403 }
      ),
    };
  }

  return { user };
}
