import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { PERMISSION_LEVELS } from '@/web/lib/permissions';
import { AuditService } from '@/server/audit/AuditService';
import { validateWorldForPublish } from '@/app/actions/publishing';
import { REALM_SETTING_KEYS, DEFAULT_REALM_SETTINGS } from '@/shared/game/realmSettings';
import os from 'os';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, permissionLevel: true },
    });

    const level = user?.permissionLevel ?? 0;
    if (level < PERMISSION_LEVELS.MODERATOR) {
      return NextResponse.json({ error: 'Forbidden: Operator console requires Moderator+.' }, { status: 403 });
    }

    // Parallel retrieval of summary metrics
    const startTime = Date.now();

    const [
      characterCount,
      worldMapCount,
      gameServerCount,
      openTicketCount,
      latestSnapshot,
      snapshotCount,
      rawSettings,
    ] = await Promise.all([
      prisma.gameCharacter.count().catch(() => 0),
      prisma.worldMap.count().catch(() => 0),
      prisma.gameServer.count().catch(() => 0),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }).catch(() => 0),
      prisma.worldPublishSnapshot.findFirst({ orderBy: { createdAt: 'desc' } }).catch(() => null),
      prisma.worldPublishSnapshot.count().catch(() => 0),
      prisma.siteSetting.findMany({
        where: {
          key: {
            in: [
              REALM_SETTING_KEYS.REALM_NAME,
              REALM_SETTING_KEYS.PLAYER_CLASS_NAME,
              REALM_SETTING_KEYS.PLAYER_CLASS_NAME_PLURAL,
              REALM_SETTING_KEYS.DEFAULT_CAMERA_STYLE,
              'ALLOW_CUSTOM_PLAYER_CAMERA',
              'SITE_VERSION',
            ],
          },
        },
      }).catch(() => []),
    ]);

    const settingsMap = (rawSettings || []).reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    // Run lightweight validation summary
    let validationResult = { valid: true, errorCount: 0, warningCount: 0 };
    try {
      const v = await validateWorldForPublish();
      validationResult = {
        valid: v.valid,
        errorCount: v.errorCount,
        warningCount: v.warningCount,
      };
    } catch {
      // Fallback if db is busy
    }

    // Determine gateway status
    const goMmoBase = process.env.GO_MMO_INTERNAL_URL || process.env.NEXT_PUBLIC_GO_MMO_URL || null;
    const heartbeatMs = Date.now() - startTime;

    const dbProvider =
      process.env.DB_PROVIDER?.toLowerCase() === 'mysql' || process.env.DATABASE_URL?.startsWith('mysql://')
        ? 'MariaDB / MySQL'
        : 'SQLite (Local)';

    const isWindows = os.platform() === 'win32';
    const scriptName = isWindows ? 'update.bat' : 'update.sh';
    const updateScriptPath = path.join(process.cwd(), 'scripts', scriptName);
    const updateScriptAvailable = fs.existsSync(updateScriptPath);

    // Filter audit logs
    const recentAuditLogs = AuditService.getRecentLogs(12).map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      at: log.at,
    }));

    // Active operational alerts
    const alerts: { id: string; title: string; severity: 'warning' | 'info' | 'error'; message: string }[] = [];
    if (validationResult.errorCount > 0) {
      alerts.push({
        id: 'val-errors',
        title: 'Publish Validation Blockers',
        severity: 'error',
        message: `${validationResult.errorCount} structural errors detected in world templates.`,
      });
    }
    if (validationResult.warningCount > 0) {
      alerts.push({
        id: 'val-warnings',
        title: 'World Validation Warnings',
        severity: 'warning',
        message: `${validationResult.warningCount} non-fatal template warnings present.`,
      });
    }
    if (openTicketCount > 0) {
      alerts.push({
        id: 'open-tickets',
        title: 'Unresolved Support Tickets',
        severity: 'info',
        message: `${openTicketCount} player support tickets awaiting review.`,
      });
    }

    const payload: Record<string, any> = {
      success: true,
      userLevel: level,
      commandSummary: {
        characterCount,
        worldMapCount,
        gameServerCount,
        openTicketCount,
        alerts,
      },
      gatewayStatus: {
        status: 'online',
        capacity: 500,
        goMmoUrl: goMmoBase,
        heartbeatMs,
      },
      releaseSummary: {
        liveVersion: settingsMap['SITE_VERSION'] || process.env.NEXT_PUBLIC_SITE_VERSION || '2.1.721',
        snapshotCount,
        latestSnapshot: latestSnapshot
          ? {
              id: latestSnapshot.id,
              title: latestSnapshot.title,
              version: latestSnapshot.version,
              createdAt: latestSnapshot.createdAt,
            }
          : null,
        validation: validationResult,
      },
      diagnostics: {
        dbProvider,
        platform: os.platform(),
        nodeEnv: process.env.NODE_ENV || 'development',
        runtime: `Node.js ${process.version}`,
        heartbeatMs,
      },
      realmSettings: {
        realmName: settingsMap[REALM_SETTING_KEYS.REALM_NAME] || DEFAULT_REALM_SETTINGS.realmName,
        playerClassName: settingsMap[REALM_SETTING_KEYS.PLAYER_CLASS_NAME] || DEFAULT_REALM_SETTINGS.playerClassName,
        playerClassNamePlural: settingsMap[REALM_SETTING_KEYS.PLAYER_CLASS_NAME_PLURAL] || DEFAULT_REALM_SETTINGS.playerClassNamePlural,
        defaultCameraStyle: settingsMap[REALM_SETTING_KEYS.DEFAULT_CAMERA_STYLE] || 'isometric',
        allowCustomPlayerCamera: settingsMap['ALLOW_CUSTOM_PLAYER_CAMERA'] === 'true',
      },
      recentAuditLogs,
    };

    // Deep developer-only maintenance payload
    if (level >= PERMISSION_LEVELS.DEVELOPER) {
      payload.maintenance = {
        updateScriptAvailable,
        isDocker: fs.existsSync('/.dockerenv'),
        platform: os.platform(),
        scriptName,
      };
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[api/admin/game-summary] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load game summary' },
      { status: 500 }
    );
  }
}
