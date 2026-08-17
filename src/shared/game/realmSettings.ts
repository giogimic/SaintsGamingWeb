/**
 * Saints Gaming — Realm Settings & Identity Conventions
 *
 * Configurable realm-wide settings including the canonical player class / identity name
 * (default: "Saint", formerly "Tamer"). Server owners can customize this in Studio settings.
 */

export const DEFAULT_PLAYER_IDENTITY = 'Saint';
export const DEFAULT_REALM_NAME = 'Saints Realm';
export const DEFAULT_REALM_MOTD = 'Welcome to Saints MMO — where spirit captures and heroic battles unfold!';

export interface RealmSettingsConfig {
  playerClassName: string;
  realmName: string;
  motd: string;
  allowGuestAccess?: boolean;
}

export const DEFAULT_REALM_SETTINGS: RealmSettingsConfig = {
  playerClassName: DEFAULT_PLAYER_IDENTITY,
  realmName: DEFAULT_REALM_NAME,
  motd: DEFAULT_REALM_MOTD,
  allowGuestAccess: true,
};

/**
 * Returns the effective player class/identity name (e.g., "Saint", "Tamer", "Operative", etc.)
 * falling back to the canonical default "Saint".
 */
export function getPlayerClassName(customName?: string | null): string {
  if (customName && typeof customName === 'string' && customName.trim().length > 0) {
    return customName.trim();
  }
  return DEFAULT_PLAYER_IDENTITY;
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
