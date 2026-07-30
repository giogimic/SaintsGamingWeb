/**
 * Saints Gaming — Permission System
 *
 * Numeric role levels:
 *   0    = Lurker
 *   10   = New
 *   20   = User
 *   30   = Active
 *   40   = Dedicated
 *   50   = Loyal
 *   60   = Saint
 *   100  = Helper
 *   200  = Moderator
 *   300  = Head Moderator
 *   400  = Admin
 *   500  = Head Admin
 *   600  = Community Manager
 *   1000 = Developer
 */

export const PERMISSION_LEVELS = {
  // Non-Staff (Progressive Tiers)
  LURKER: 0,
  NEW: 10,
  USER: 20,
  ACTIVE: 30,
  DEDICATED: 40,
  LOYAL: 50,
  SAINT: 60,
  
  // Staff Tiers
  HELPER: 100,
  MODERATOR: 200,
  HEAD_MODERATOR: 300,
  ADMIN: 400,
  HEAD_ADMIN: 500,
  COMMUNITY_MANAGER: 600,
  FIVEM_DEVELOPER: 900,
  DEVELOPER: 1000,
} as const;

// Staff (mods and above) are authorized to change site styling/theme settings.
export const STYLE_MANAGEMENT_PERMISSION = PERMISSION_LEVELS.MODERATOR; 

export type PermissionLevel =
  (typeof PERMISSION_LEVELS)[keyof typeof PERMISSION_LEVELS];

/** Human-readable role name from a permission level */
export function getRoleName(level: number): string {
  if (level >= PERMISSION_LEVELS.DEVELOPER) return "Developer";
  if (level >= PERMISSION_LEVELS.FIVEM_DEVELOPER) return "FiveM Developer";
  if (level >= PERMISSION_LEVELS.COMMUNITY_MANAGER) return "Community Manager";
  if (level >= PERMISSION_LEVELS.HEAD_ADMIN) return "Head Admin";
  if (level >= PERMISSION_LEVELS.ADMIN) return "Admin";
  if (level >= PERMISSION_LEVELS.HEAD_MODERATOR) return "Head Moderator";
  if (level >= PERMISSION_LEVELS.MODERATOR) return "Moderator";
  if (level >= PERMISSION_LEVELS.HELPER) return "Helper";
  
  if (level >= PERMISSION_LEVELS.SAINT) return "SAINT";
  if (level >= PERMISSION_LEVELS.LOYAL) return "Loyal";
  if (level >= PERMISSION_LEVELS.DEDICATED) return "Dedicated";
  if (level >= PERMISSION_LEVELS.ACTIVE) return "Active";
  if (level >= PERMISSION_LEVELS.USER) return "User";
  if (level >= PERMISSION_LEVELS.NEW) return "New";
  return "Lurker";
}

/** Get a CSS-friendly color class for a role badge */
export function getRoleColor(level: number): string {
  if (level >= PERMISSION_LEVELS.DEVELOPER) return "text-red-400";
  if (level >= PERMISSION_LEVELS.FIVEM_DEVELOPER) return "text-orange-400";
  if (level >= PERMISSION_LEVELS.COMMUNITY_MANAGER) return "text-purple-400";
  if (level >= PERMISSION_LEVELS.HEAD_ADMIN) return "text-amber-400";
  if (level >= PERMISSION_LEVELS.ADMIN) return "text-blue-400";
  if (level >= PERMISSION_LEVELS.HEAD_MODERATOR) return "text-cyan-400";
  if (level >= PERMISSION_LEVELS.MODERATOR) return "text-green-400";
  if (level >= PERMISSION_LEVELS.HELPER) return "text-emerald-400";
  
  // Base users
  if (level >= PERMISSION_LEVELS.SAINT) return "text-yellow-300";
  return "text-zinc-300";
}

/** Check if a user has at least the required permission level */
export function hasPermission(
  userLevel: number | undefined | null,
  requiredLevel: number
): boolean {
  return (userLevel ?? 0) >= requiredLevel;
}

/** Check if a user can manage another user (must have higher level) */
export function canManageUser(managerLevel: number, targetLevel: number): boolean {
  return managerLevel > targetLevel;
}

/** Can this actor mute the target from posting to forums? */
export function canMute(actorLevel: number, targetLevel: number): boolean {
  return actorLevel >= PERMISSION_LEVELS.MODERATOR && targetLevel < PERMISSION_LEVELS.MODERATOR;
}

/** Can this actor permanently ban the target? */
export function canBan(actorLevel: number, targetLevel: number): boolean {
  if (actorLevel >= PERMISSION_LEVELS.COMMUNITY_MANAGER) {
    return targetLevel < actorLevel;
  }
  if (actorLevel >= PERMISSION_LEVELS.HEAD_ADMIN) {
    return targetLevel < PERMISSION_LEVELS.HEAD_ADMIN; // Can ban Admins & Mods
  }
  if (actorLevel >= PERMISSION_LEVELS.ADMIN) {
    return targetLevel < PERMISSION_LEVELS.MODERATOR; // Can only ban non-staff
  }
  return false;
}

/** Can this actor delete/purge forum posts? */
export function canPurge(actorLevel: number): boolean {
  return actorLevel >= PERMISSION_LEVELS.MODERATOR;
}

/** All staff permission levels as an ordered array for admin UIs */
export const ROLE_OPTIONS = [
  { value: PERMISSION_LEVELS.HELPER, label: "Helper" },
  { value: PERMISSION_LEVELS.MODERATOR, label: "Moderator" },
  { value: PERMISSION_LEVELS.HEAD_MODERATOR, label: "Head Moderator" },
  { value: PERMISSION_LEVELS.ADMIN, label: "Admin" },
  { value: PERMISSION_LEVELS.HEAD_ADMIN, label: "Head Admin" },
  { value: PERMISSION_LEVELS.COMMUNITY_MANAGER, label: "Community Manager" },
  { value: PERMISSION_LEVELS.DEVELOPER, label: "Developer" },
] as const;
