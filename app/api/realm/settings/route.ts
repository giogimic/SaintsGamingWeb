import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import {
  REALM_SETTING_KEYS,
  DEFAULT_REALM_SETTINGS,
  RealmSettingsConfig,
} from '@/shared/game/realmSettings';
import { AuditService } from '@/server/audit/AuditService';


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: Object.values(REALM_SETTING_KEYS),
        },
      },
    });

    const configMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    const config: RealmSettingsConfig = {
      realmName: configMap[REALM_SETTING_KEYS.REALM_NAME] || DEFAULT_REALM_SETTINGS.realmName,
      realmDescription: configMap[REALM_SETTING_KEYS.REALM_DESCRIPTION] || DEFAULT_REALM_SETTINGS.realmDescription,
      playerClassName: configMap[REALM_SETTING_KEYS.PLAYER_CLASS_NAME] || DEFAULT_REALM_SETTINGS.playerClassName,
      playerClassNamePlural: configMap[REALM_SETTING_KEYS.PLAYER_CLASS_NAME_PLURAL] || DEFAULT_REALM_SETTINGS.playerClassNamePlural,
      chatTitle: configMap[REALM_SETTING_KEYS.CHAT_TITLE] || DEFAULT_REALM_SETTINGS.chatTitle,
      creatureIdentity: configMap[REALM_SETTING_KEYS.CREATURE_IDENTITY] || DEFAULT_REALM_SETTINGS.creatureIdentity,
      creatureIdentityPlural: configMap[REALM_SETTING_KEYS.CREATURE_IDENTITY_PLURAL] || DEFAULT_REALM_SETTINGS.creatureIdentityPlural,
      captureToolName: configMap[REALM_SETTING_KEYS.CAPTURE_TOOL_NAME] || DEFAULT_REALM_SETTINGS.captureToolName,
      captureAmmoName: configMap[REALM_SETTING_KEYS.CAPTURE_AMMO_NAME] || DEFAULT_REALM_SETTINGS.captureAmmoName,
      motd: configMap[REALM_SETTING_KEYS.REALM_MOTD] || DEFAULT_REALM_SETTINGS.motd,
      spawnMapId: configMap[REALM_SETTING_KEYS.SPAWN_MAP_ID] || DEFAULT_REALM_SETTINGS.spawnMapId,
      allowGuestAccess: configMap[REALM_SETTING_KEYS.ALLOW_GUEST_ACCESS] !== 'false',
    };

    return NextResponse.json({ success: true, settings: config });
  } catch (error: any) {
    console.error('[api/realm/settings] GET error:', error);
    return NextResponse.json({ success: true, settings: DEFAULT_REALM_SETTINGS });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    const isStaff = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');
    if (!isStaff) {
      return NextResponse.json({ error: 'Unauthorized: Staff permissions required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const updates: { key: string; value: string }[] = [];

    if (typeof body.realmName === 'string') updates.push({ key: REALM_SETTING_KEYS.REALM_NAME, value: body.realmName.trim() });
    if (typeof body.realmDescription === 'string') updates.push({ key: REALM_SETTING_KEYS.REALM_DESCRIPTION, value: body.realmDescription.trim() });
    if (typeof body.playerClassName === 'string') updates.push({ key: REALM_SETTING_KEYS.PLAYER_CLASS_NAME, value: body.playerClassName.trim() });
    if (typeof body.playerClassNamePlural === 'string') updates.push({ key: REALM_SETTING_KEYS.PLAYER_CLASS_NAME_PLURAL, value: body.playerClassNamePlural.trim() });
    if (typeof body.chatTitle === 'string') updates.push({ key: REALM_SETTING_KEYS.CHAT_TITLE, value: body.chatTitle.trim() });
    if (typeof body.creatureIdentity === 'string') updates.push({ key: REALM_SETTING_KEYS.CREATURE_IDENTITY, value: body.creatureIdentity.trim() });
    if (typeof body.creatureIdentityPlural === 'string') updates.push({ key: REALM_SETTING_KEYS.CREATURE_IDENTITY_PLURAL, value: body.creatureIdentityPlural.trim() });
    if (typeof body.captureToolName === 'string') updates.push({ key: REALM_SETTING_KEYS.CAPTURE_TOOL_NAME, value: body.captureToolName.trim() });
    if (typeof body.captureAmmoName === 'string') updates.push({ key: REALM_SETTING_KEYS.CAPTURE_AMMO_NAME, value: body.captureAmmoName.trim() });
    if (typeof body.motd === 'string') updates.push({ key: REALM_SETTING_KEYS.REALM_MOTD, value: body.motd.trim() });
    if (typeof body.spawnMapId === 'string') updates.push({ key: REALM_SETTING_KEYS.SPAWN_MAP_ID, value: body.spawnMapId.trim() });
    if (typeof body.allowGuestAccess === 'boolean') updates.push({ key: REALM_SETTING_KEYS.ALLOW_GUEST_ACCESS, value: String(body.allowGuestAccess) });

    // Security compliance audit record prior to DB write
    await AuditService.write({
      userId: user.id || session?.user?.id || "system",
      action: "realm.settings.update",
      resource: { type: "realm" as any, id: "settings" },
      after: { updatesCount: updates.length, keys: updates.map((u) => u.key) },
    });

    await Promise.all(

      updates.map((u) =>
        prisma.siteSetting.upsert({
          where: { key: u.key },
          create: { key: u.key, value: u.value },
          update: { value: u.value },
        })
      )
    );

    return NextResponse.json({ success: true, message: 'Realm settings saved successfully' });
  } catch (error: any) {
    console.error('[api/realm/settings] POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save realm settings' }, { status: 500 });
  }
}
