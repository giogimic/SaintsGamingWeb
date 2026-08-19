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

export interface AssetCreditEntry {
  fileName?: string;
  authors?: string[];
  licenses?: string[];
  urls?: string[];
}

export interface AssetEntity {
  id: string;
  createdById: string;
  visibility: AssetVisibility | string;
  moderationStatus: AssetModerationStatus | string;
  gameId?: string | null;
  license?: string | null;
  /** Structured per-layer credit entries (e.g. multi-author LPC packs). Takes precedence over `license` when present. */
  credits?: AssetCreditEntry[] | null;
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
 * When structured `credits` are present (e.g. an imported multi-author LPC pack),
 * renders one segment per credited layer instead of the single license string.
 */
export function getAssetAttribution(asset: AssetEntity): string {
  if (asset.credits && asset.credits.length > 0) {
    return asset.credits
      .map((credit) => {
        const authors = (credit.authors || []).filter(Boolean).join(", ") || "Unknown author";
        const licenses = (credit.licenses || []).filter(Boolean).join(", ") || "Unknown license";
        const label = credit.fileName ? `${credit.fileName}: ` : "";
        return `${label}${authors} (${licenses})`;
      })
      .join(" | ");
  }

  const authorName = asset.createdBy?.displayName || asset.createdBy?.username || 'Community Creator';
  const license = asset.license || 'CC0';
  return `Created by ${authorName} • License: ${license}`;
}
