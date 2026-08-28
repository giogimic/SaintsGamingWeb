/**
 * Game Setup Status & Fresh Install Detection Engine
 * Evaluates whether the game instance is in pristine fresh install mode,
 * awaiting initial game-specific onboarding and starting map creation,
 * or in an existing/updated active game mode.
 */

export interface SetupStatus {
  isFreshInstall: boolean;
  isSetupCompleted: boolean;
  isGameInitialized: boolean;
  mapCount: number;
  userCount: number;
  hasAdmin: boolean;
  gameName: string;
  gameDescription: string;
  gameGenre: string;
  gameStyle: string;
  gameCamera: string;
  defaultMapId: string | null;
  defaultGroundGid: number;
  /** @deprecated backward-compatible alias for gameName */
  realmName: string;
  /** @deprecated backward-compatible alias for gameDescription */
  realmDescription: string;
}

export const SETUP_SETTING_KEYS = {
  // Canonical Game Initialization Settings
  GAME_INITIALIZED: 'GAME_INITIALIZED',
  GAME_INITIALIZED_AT: 'GAME_INITIALIZED_AT',
  GAME_INITIALIZED_VERSION: 'GAME_INITIALIZED_VERSION',
  GAME_NAME: 'GAME_NAME',
  GAME_DESCRIPTION: 'GAME_DESCRIPTION',
  GAME_GENRE: 'GAME_GENRE',
  GAME_STYLE: 'GAME_STYLE',
  GAME_CAMERA: 'GAME_CAMERA',
  DEFAULT_MAP_ID: 'DEFAULT_MAP_ID',
  DEFAULT_GROUND_GID: 'DEFAULT_GROUND_GID',

  // Legacy Settings (preserved for backward compatibility & migration)
  SETUP_COMPLETED: 'SETUP_COMPLETED',
  SETUP_COMPLETED_AT: 'SETUP_COMPLETED_AT',
  REALM_NAME: 'REALM_NAME',
  REALM_DESCRIPTION: 'REALM_DESCRIPTION',
  STARTER_PACK_IMPORTED: 'STARTER_PACK_IMPORTED',
} as const;

export const DEFAULT_GAME_NAME = 'Saints Game';
export const DEFAULT_GAME_DESCRIPTION = 'Explore, battle, capture, and build in this 2.5D MMO universe.';
export const DEFAULT_GAME_GENRE = 'CREATURE_MMO';
export const DEFAULT_GAME_STYLE = 'SAINTS_HYBRID';
export const DEFAULT_GAME_CAMERA = 'ISOMETRIC_25D';
export const DEFAULT_FALLBACK_MAP_ID = 'STARTING_MAP';
export const DEFAULT_GROUND_GID_VALUE = 17; // George terrain solid grass

/** @deprecated legacy alias */
export const DEFAULT_REALM_NAME = DEFAULT_GAME_NAME;
/** @deprecated legacy alias */
export const DEFAULT_REALM_DESCRIPTION = DEFAULT_GAME_DESCRIPTION;

/**
 * Pure function to evaluate setup status based on database state metrics.
 * Ensures updates and existing games NEVER fall back into setup or wipe data.
 */
export function evaluateSetupStatus(params: {
  gameInitializedVal?: string | null;
  setupSettingVal?: string | null;
  mapCount: number;
  userCount: number;
  adminCount: number;
  gameConfigActive?: boolean;
  gameNameSettingVal?: string | null;
  gameDescriptionSettingVal?: string | null;
  gameGenreSettingVal?: string | null;
  gameStyleSettingVal?: string | null;
  gameCameraSettingVal?: string | null;
  defaultMapIdSettingVal?: string | null;
  defaultGroundGidSettingVal?: string | null;
  realmNameSettingVal?: string | null;
  realmDescriptionSettingVal?: string | null;
}): SetupStatus {
  const isGameInitialized =
    params.gameInitializedVal === 'true' ||
    params.gameInitializedVal === '1';

  const hasExplicitCompleted =
    isGameInitialized ||
    params.setupSettingVal === 'true' ||
    params.setupSettingVal === '1';

  // An existing installation is indicated by existing authored maps, active game configs, or existing user accounts.
  const hasExistingData =
    params.mapCount > 0 ||
    params.userCount > 1 ||
    Boolean(params.gameConfigActive);

  // If the server is updated with existing data OR setup was explicitly completed, setup is completed
  // and will not block normal gameplay, studio access, or rewrite old data.
  const isSetupCompleted = hasExplicitCompleted || hasExistingData;
  const isFreshInstall = !hasExplicitCompleted && !hasExistingData;

  const resolvedName =
    params.gameNameSettingVal?.trim() ||
    params.realmNameSettingVal?.trim() ||
    DEFAULT_GAME_NAME;

  const resolvedDesc =
    params.gameDescriptionSettingVal?.trim() ||
    params.realmDescriptionSettingVal?.trim() ||
    DEFAULT_GAME_DESCRIPTION;

  const resolvedGenre =
    params.gameGenreSettingVal?.trim() ||
    DEFAULT_GAME_GENRE;

  const resolvedStyle =
    params.gameStyleSettingVal?.trim() ||
    DEFAULT_GAME_STYLE;

  const resolvedCamera =
    params.gameCameraSettingVal?.trim() ||
    DEFAULT_GAME_CAMERA;

  const resolvedGid = params.defaultGroundGidSettingVal
    ? parseInt(params.defaultGroundGidSettingVal, 10) || DEFAULT_GROUND_GID_VALUE
    : DEFAULT_GROUND_GID_VALUE;

  return {
    isFreshInstall,
    isSetupCompleted,
    isGameInitialized: isGameInitialized || hasExistingData,
    mapCount: Math.max(0, params.mapCount),
    userCount: Math.max(0, params.userCount),
    hasAdmin: params.adminCount > 0,
    gameName: resolvedName,
    gameDescription: resolvedDesc,
    gameGenre: resolvedGenre,
    gameStyle: resolvedStyle,
    gameCamera: resolvedCamera,
    defaultMapId: params.defaultMapIdSettingVal?.trim() || null,
    defaultGroundGid: resolvedGid,
    realmName: resolvedName,
    realmDescription: resolvedDesc,
  };
}

/**
 * Query active Prisma client to determine current game setup status.
 */
export async function getSystemSetupStatus(prismaClient: any): Promise<SetupStatus> {
  try {
    const [
      gameInitSetting,
      setupSetting,
      gameNameSetting,
      gameDescSetting,
      gameGenreSetting,
      gameStyleSetting,
      gameCameraSetting,
      defaultMapSetting,
      defaultGidSetting,
      realmNameSetting,
      realmDescSetting,
      mapCount,
      userCount,
      adminCount,
      activeGameConfigCount,
    ] = await Promise.all([
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.GAME_INITIALIZED } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.SETUP_COMPLETED } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.GAME_NAME } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.GAME_DESCRIPTION } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.GAME_GENRE } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.GAME_STYLE } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.GAME_CAMERA } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.DEFAULT_GROUND_GID } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.REALM_NAME } }).catch(() => null),
      prismaClient.siteSetting.findUnique({ where: { key: SETUP_SETTING_KEYS.REALM_DESCRIPTION } }).catch(() => null),
      prismaClient.worldMap.count().catch(() => 0),
      prismaClient.user.count().catch(() => 0),
      prismaClient.user.count({ where: { OR: [{ permissionLevel: { gte: 80 } }, { role: { name: 'ADMIN' } }] } }).catch(() => 0),
      prismaClient.gameConfig.count({ where: { isActive: true } }).catch(() => 0),
    ]);

    return evaluateSetupStatus({
      gameInitializedVal: gameInitSetting?.value,
      setupSettingVal: setupSetting?.value,
      gameNameSettingVal: gameNameSetting?.value,
      gameDescriptionSettingVal: gameDescSetting?.value,
      gameGenreSettingVal: gameGenreSetting?.value,
      gameStyleSettingVal: gameStyleSetting?.value,
      gameCameraSettingVal: gameCameraSetting?.value,
      defaultMapIdSettingVal: defaultMapSetting?.value,
      defaultGroundGidSettingVal: defaultGidSetting?.value,
      realmNameSettingVal: realmNameSetting?.value,
      realmDescriptionSettingVal: realmDescSetting?.value,
      mapCount,
      userCount,
      adminCount,
      gameConfigActive: activeGameConfigCount > 0,
    });
  } catch (error) {
    console.error('[SetupDetection] Failed to query setup status:', error);
    // Safe fallback to prevent locking out on DB connection glitches
    return {
      isFreshInstall: false,
      isSetupCompleted: true,
      isGameInitialized: true,
      mapCount: 1,
      userCount: 1,
      hasAdmin: true,
      gameName: DEFAULT_GAME_NAME,
      gameDescription: DEFAULT_GAME_DESCRIPTION,
      gameGenre: DEFAULT_GAME_GENRE,
      gameStyle: DEFAULT_GAME_STYLE,
      gameCamera: DEFAULT_GAME_CAMERA,
      defaultMapId: DEFAULT_FALLBACK_MAP_ID,
      defaultGroundGid: DEFAULT_GROUND_GID_VALUE,
      realmName: DEFAULT_GAME_NAME,
      realmDescription: DEFAULT_GAME_DESCRIPTION,
    };
  }
}

