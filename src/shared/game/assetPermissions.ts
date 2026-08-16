/**
 * Saints Gaming — Asset Permissions & Moderation Governance (Bible 35 §6-7)
 */

export type AssetVisibility = 'PERSONAL' | 'PROJECT' | 'COMMUNITY' | 'PUBLIC';
export type AssetModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AssetUserContext {
  id: string;
  permissionLevel?: number; // 100=User, 200=Mod, 300=Admin, 400=Owner
  gameId?: string;
}

export interface AssetEntity {
  id: string;
  createdById: string;
  visibility: AssetVisibility | string;
  moderationStatus: AssetModerationStatus | string;
  gameId?: string | null;
  license?: string | null;
  createdBy?: {
    username?: string;
    displayName?: string;
  } | null;
}

/**
 * Checks if a user has sufficient authority to moderate assets.
 * Moderation requires MOD (permissionLevel >= 200) or higher.
 */
export function canUserModerateAssets(user?: AssetUserContext | null): boolean {
  if (!user) return false;
  return (user.permissionLevel || 0) >= 200;
}

/**
 * Checks whether an asset is accessible by a given user under Bible 35 §6 rules.
 */
export function canUserAccessAsset(
  asset: AssetEntity,
  user?: AssetUserContext | null
): boolean {
  const isMod = canUserModerateAssets(user);
  const isOwner = Boolean(user?.id && user.id === asset.createdById);

  // Owners and Moderators can always view their own / pending assets
  if (isOwner || isMod) return true;

  // Unapproved assets cannot be accessed by the public
  if (asset.moderationStatus !== 'APPROVED') {
    return false;
  }

  // Check visibility scoping
  switch (asset.visibility) {
    case 'PUBLIC':
      return true;
    case 'COMMUNITY':
      // Community assets are available to all authenticated community members
      return Boolean(user?.id);
    case 'PROJECT':
      // Project assets require matching gameId / project realm
      return Boolean(user?.gameId && asset.gameId === user.gameId);
    case 'PERSONAL':
      return isOwner;
    default:
      return true;
  }
}

/**
 * Builds formatted attribution metadata for display in the asset catalog.
 */
export function getAssetAttribution(asset: AssetEntity): string {
  const authorName = asset.createdBy?.displayName || asset.createdBy?.username || 'Community Creator';
  const license = asset.license || 'CC0';
  return `Created by ${authorName} • License: ${license}`;
}
