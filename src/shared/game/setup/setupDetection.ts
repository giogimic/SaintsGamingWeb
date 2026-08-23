/**
 * Setup Status & Fresh Install Detection Engine
 * Evaluates whether the game instance is in pristine fresh install mode,
 * awaiting initial onboarding & first map creation, or in active update mode.
 */

export interface SetupStatus {
  isFreshInstall: boolean;
  isSetupCompleted: boolean;
  mapCount: number;
  userCount: number;
  hasAdmin: boolean;
  realmName: string;
  realmDescription: string;
  defaultMapId: string | null;
}

export const SETUP_SETTING_KEYS = {
  SETUP_COMPLETED: 'SETUP_COMPLETED',
  SETUP_COMPLETED_AT: 'SETUP_COMPLETED_AT',
  REALM_NAME: 'REALM_NAME',
  REALM_DESCRIPTION: 'REALM_DESCRIPTION',
  DEFAULT_MAP_ID: 'DEFAULT_MAP_ID',
  STARTER_PACK_IMPORTED: 'STARTER_PACK_IMPORTED',
} as const;

export const DEFAULT_REALM_NAME = 'The Lobby';
export const DEFAULT_REALM_DESCRIPTION = 'The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~';
export const DEFAULT_FALLBACK_MAP_ID = 'DEMO_SANDBOX';

/**
 * Pure function to evaluate setup status based on database state metrics.
 */
export function evaluateSetupStatus(params: {
  setupSettingVal?: string | null;
  mapCount: number;
  userCount: number;
  adminCount: number;
  realmNameSettingVal?: string | null;
  realmDescriptionSettingVal?: string | null;
  defaultMapIdSettingVal?: string | null;
}): SetupStatus {
  const hasExplicitCompleted = params.setupSettingVal === 'true' || params.setupSettingVal === '1';
  
  // A server is an existing/updated install if it already has maps or existing users from prior versions.
  const hasExistingData = params.mapCount > 0 || params.userCount > 1;

  // If the server is updated with existing data OR setup was explicitly completed, setup is completed
  // and will not block normal gameplay, studio access, or rewrite old data.
  const isSetupCompleted = hasExplicitCompleted || hasExistingData;
  const isFreshInstall = !hasExplicitCompleted && !hasExistingData;

  return {
    isFreshInstall,
    isSetupCompleted,
    mapCount: Math.max(0, params.mapCount),
    userCount: Math.max(0, params.userCount),
    hasAdmin: params.adminCount > 0,
    realmName: params.realmNameSettingVal?.trim() || DEFAULT_REALM_NAME,
    realmDescription: params.realmDescriptionSettingVal?.trim() || DEFAULT_REALM_DESCRIPTION,
    defaultMapId: params.defaultMapIdSettingVal?.trim() || null,
  };
}

/**
 * Query active Prisma client to determine current realm setup status.
 */
export async function getSystemSetupStatus(prismaClient: any): Promise<SetupStatus> {
  try {
    const [setupSetting, realmNameSetting, realmDescSetting, defaultMapSetting, mapCount, userCount, adminCount] = await Promise.all([
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.SETUP_COMPLETED } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.REALM_NAME } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.REALM_DESCRIPTION } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID } }).catch(() => null),
      prismaClient.worldMap.count().catch(() => 0),
      prismaClient.user.count().catch(() => 0),
      prismaClient.user.count({ where: { OR: [{ permissionLevel: { gte: 80 } }, { role: 'ADMIN' }] } }).catch(() => 0),
    ]);

    return evaluateSetupStatus({
      setupSettingVal: setupSetting?.value,
      realmNameSettingVal: realmNameSetting?.value,
      realmDescriptionSettingVal: realmDescSetting?.value,
      defaultMapIdSettingVal: defaultMapSetting?.value,
      mapCount,
      userCount,
      adminCount,
    });
  } catch (error) {
    console.error('[SetupDetection] Failed to query setup status:', error);
    // Safe fallback to prevent locking out on DB connection glitches
    return {
      isFreshInstall: false,
      isSetupCompleted: true,
      mapCount: 1,
      userCount: 1,
      hasAdmin: true,
      realmName: DEFAULT_REALM_NAME,
      realmDescription: DEFAULT_REALM_DESCRIPTION,
      defaultMapId: DEFAULT_FALLBACK_MAP_ID,
    };
  }
}
