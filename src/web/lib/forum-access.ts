/**
 * Restricted board / category access checks.
 * Staff (Head Moderator+) bypass flag requirements.
 */

import { PERMISSION_LEVELS } from "./permissions";

export type RestrictedBoardFlags = {
  reqWriter: boolean;
  reqVIP: boolean;
  reqFounder: boolean;
  reqTrusted: boolean;
};

export type RestrictedBoardUser = {
  permissionLevel: number;
  isWriter?: boolean;
  isVIP?: boolean;
  isFounder?: boolean;
  isTrusted?: boolean;
};

/** True when any restriction flag is set on the board/category. */
export function isRestrictedBoard(item: RestrictedBoardFlags): boolean {
  return item.reqWriter || item.reqVIP || item.reqFounder || item.reqTrusted;
}

/**
 * Can this user post/reply/view a restricted board?
 * Unrestricted boards always allow access.
 * Head Moderator+ always bypass.
 * Otherwise the matching role flag must be true on the user.
 */
export function canAccessRestrictedBoard(
  item: RestrictedBoardFlags,
  user: RestrictedBoardUser | null | undefined
): boolean {
  if (!isRestrictedBoard(item)) return true;

  const level = user?.permissionLevel ?? 0;
  if (level >= PERMISSION_LEVELS.HEAD_MODERATOR) return true;
  if (!user) return false;

  if (item.reqWriter && user.isWriter) return true;
  if (item.reqVIP && user.isVIP) return true;
  if (item.reqFounder && user.isFounder) return true;
  if (item.reqTrusted && user.isTrusted) return true;

  return false;
}
