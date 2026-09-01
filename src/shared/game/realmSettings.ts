/**
 * Saints Gaming — Realm Settings & Identity Conventions
 *
 * Configurable realm-wide settings including the canonical player class / identity name
 * (default: "Saint", formerly "Tamer" / "Operative"), Soul Link chat terminology,
 * creature beings ("Soul" / "Souls"), and capture tools ("Camera" / "Film").
 * Server owners can customize this in Studio server settings or Admin settings.
 */

export const DEFAULT_PLAYER_IDENTITY = 'Saint';
export const DEFAULT_PLAYER_IDENTITY_PLURAL = 'Saints';
export const DEFAULT_CHAT_TITLE = 'Soul Link';
export const DEFAULT_CREATURE_IDENTITY = 'Soul';
export const DEFAULT_CREATURE_IDENTITY_PLURAL = 'Souls';
export const DEFAULT_CAPTURE_TOOL_NAME = 'Camera';
export const DEFAULT_CAPTURE_AMMO_NAME = 'Film';
export const DEFAULT_REALM_NAME = 'The Lobby';
export const DEFAULT_REALM_DESCRIPTION = 'The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~';
export const DEFAULT_REALM_MOTD = 'Welcome to Saints MMO — where spirit captures and heroic battles unfold!';
export const DEFAULT_SPAWN_MAP_ID = 'DEMO_SANDBOX';

export interface RealmSettingsConfig {
  playerClassName: string;
  playerClassNamePlural: string;
  chatTitle: string;
  creatureIdentity: string;
  creatureIdentityPlural: string;
  captureToolName: string;
  captureAmmoName: string;
  realmName: string;
  realmDescription: string;
  motd: string;
  spawnMapId: string;
  allowGuestAccess?: boolean;
  // 2.5D & 3D Global Visuals
  enable3DLighting?: boolean;
  enableShadows?: boolean;
  shadowQuality?: 'low' | 'medium' | 'high';
  enableAtmosphericFog?: boolean;
  fogDensity?: number;
  fogColor?: string;
  terrainElevationScale?: number;
  defaultCameraStyle?: 'isometric' | 'follow45' | 'topdown' | 'free';
  waterReflectionQuality?: 'off' | 'low' | 'high';
  enableBloom?: boolean;
  enableAntiAliasing?: boolean;
  showTileCoordinatesOverlay?: boolean;
}

export const DEFAULT_REALM_SETTINGS: RealmSettingsConfig = {
  playerClassName: DEFAULT_PLAYER_IDENTITY,
  playerClassNamePlural: DEFAULT_PLAYER_IDENTITY_PLURAL,
  chatTitle: DEFAULT_CHAT_TITLE,
  creatureIdentity: DEFAULT_CREATURE_IDENTITY,
  creatureIdentityPlural: DEFAULT_CREATURE_IDENTITY_PLURAL,
  captureToolName: DEFAULT_CAPTURE_TOOL_NAME,
  captureAmmoName: DEFAULT_CAPTURE_AMMO_NAME,
  realmName: DEFAULT_REALM_NAME,
  realmDescription: DEFAULT_REALM_DESCRIPTION,
  motd: DEFAULT_REALM_MOTD,
  spawnMapId: DEFAULT_SPAWN_MAP_ID,
  allowGuestAccess: true,
  // 2.5D & 3D Global Defaults
  enable3DLighting: true,
  enableShadows: true,
  shadowQuality: 'medium',
  enableAtmosphericFog: true,
  fogDensity: 0.015,
  fogColor: '#0b1626',
  terrainElevationScale: 1.0,
  defaultCameraStyle: 'isometric',
  waterReflectionQuality: 'high',
  enableBloom: false,
  enableAntiAliasing: true,
  showTileCoordinatesOverlay: false,
};

export const REALM_SETTING_KEYS = {
  REALM_NAME: 'REALM_NAME',
  REALM_DESCRIPTION: 'REALM_DESCRIPTION',
  PLAYER_CLASS_NAME: 'PLAYER_CLASS_NAME',
  PLAYER_CLASS_NAME_PLURAL: 'PLAYER_CLASS_NAME_PLURAL',
  CHAT_TITLE: 'CHAT_TITLE',
  CREATURE_IDENTITY: 'CREATURE_IDENTITY',
  CREATURE_IDENTITY_PLURAL: 'CREATURE_IDENTITY_PLURAL',
  CAPTURE_TOOL_NAME: 'CAPTURE_TOOL_NAME',
  CAPTURE_AMMO_NAME: 'CAPTURE_AMMO_NAME',
  REALM_MOTD: 'REALM_MOTD',
  SPAWN_MAP_ID: 'SPAWN_MAP_ID',
  ALLOW_GUEST_ACCESS: 'ALLOW_GUEST_ACCESS',
  ENABLE_3D_LIGHTING: 'ENABLE_3D_LIGHTING',
  ENABLE_SHADOWS: 'ENABLE_SHADOWS',
  SHADOW_QUALITY: 'SHADOW_QUALITY',
  ENABLE_ATMOSPHERIC_FOG: 'ENABLE_ATMOSPHERIC_FOG',
  FOG_DENSITY: 'FOG_DENSITY',
  FOG_COLOR: 'FOG_COLOR',
  TERRAIN_ELEVATION_SCALE: 'TERRAIN_ELEVATION_SCALE',
  DEFAULT_CAMERA_STYLE: 'DEFAULT_CAMERA_STYLE',
  WATER_REFLECTION_QUALITY: 'WATER_REFLECTION_QUALITY',
  ENABLE_BLOOM: 'ENABLE_BLOOM',
  ENABLE_ANTI_ALIASING: 'ENABLE_ANTI_ALIASING',
  SHOW_TILE_COORDINATES_OVERLAY: 'SHOW_TILE_COORDINATES_OVERLAY',
} as const;

/**
 * Returns the effective player class/identity name (e.g., "Saint", "Hero", etc.)
 * falling back to the canonical default "Saint".
 */
export function getPlayerClassName(customName?: string | null): string {
  if (customName && typeof customName === 'string' && customName.trim().length > 0) {
    return customName.trim();
  }
  return DEFAULT_PLAYER_IDENTITY;
}

/**
 * Returns the plural player class/identity name (e.g., "Saints", "Heroes", etc.)
 * falling back to the canonical default "Saints".
 */
export function getPlayerClassNamePlural(customName?: string | null): string {
  if (customName && typeof customName === 'string' && customName.trim().length > 0) {
    return customName.trim();
  }
  return DEFAULT_PLAYER_IDENTITY_PLURAL;
}

/**
 * Returns the effective chat box title (e.g., "Soul Link", "Comm Link", "Global Chat", etc.)
 * falling back to canonical "Soul Link".
 */
export function getChatTitle(customTitle?: string | null): string {
  if (customTitle && typeof customTitle === 'string' && customTitle.trim().length > 0) {
    return customTitle.trim();
  }
  return DEFAULT_CHAT_TITLE;
}

/**
 * Returns the creature/being identity name (e.g., "Soul", "Spirit", "Beast", etc.)
 * falling back to canonical "Soul".
 */
export function getCreatureIdentity(custom?: string | null): string {
  if (custom && typeof custom === 'string' && custom.trim().length > 0) {
    return custom.trim();
  }
  return DEFAULT_CREATURE_IDENTITY;
}

/**
 * Returns the plural creature/being identity name (e.g., "Souls", "Spirits", "Beasts", etc.)
 * falling back to canonical "Souls".
 */
export function getCreatureIdentityPlural(custom?: string | null): string {
  if (custom && typeof custom === 'string' && custom.trim().length > 0) {
    return custom.trim();
  }
  return DEFAULT_CREATURE_IDENTITY_PLURAL;
}

/**
 * Returns the capture device name (e.g., "Camera", "Tamer Deck", "Seal", etc.)
 * falling back to canonical "Camera".
 */
export function getCaptureToolName(custom?: string | null): string {
  if (custom && typeof custom === 'string' && custom.trim().length > 0) {
    return custom.trim();
  }
  return DEFAULT_CAPTURE_TOOL_NAME;
}

/**
 * Returns the capture ammo name (e.g., "Film", "Disks", "Cartridges", etc.)
 * falling back to canonical "Film".
 */
export function getCaptureAmmoName(custom?: string | null): string {
  if (custom && typeof custom === 'string' && custom.trim().length > 0) {
    return custom.trim();
  }
  return DEFAULT_CAPTURE_AMMO_NAME;
}

/**
 * Formats a player display name with fallback to the configured class/identity name.
 */
export function formatPlayerIdentity(name?: string | null, customIdentity?: string | null): string {
  if (name && typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }
  return getPlayerClassName(customIdentity);
}
