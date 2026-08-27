/**
 * Saints Gaming — Unified Asset Representation Profiles & Dynamic Visual Pipeline Engine (Studio Plan Part 3 & 7)
 * Decouples conceptual RPG entity definitions from visual animation representations and provides fallback resolution chains.
 */

export type VisualAssetType =
  | 'SPRITE_SHEET_2D'
  | 'CANVAS_COMPOSITE'
  | 'PROCEDURAL_FX'
  | 'BABYLON_3D_MESH';

export type CardinalDirection =
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'UP'
  | 'DOWN_LEFT'
  | 'DOWN_RIGHT'
  | 'UP_LEFT'
  | 'UP_RIGHT';

export type AnimationAction =
  | 'IDLE'
  | 'WALK'
  | 'ATTACK'
  | 'CAST'
  | 'HIT'
  | 'DIE'
  | 'EMOTE';

export interface AnimationFrameData {
  frameIndices: number[];
  frameDurationMs: number;
  loop: boolean;
  pivotOffset: { x: number; y: number };
}

export interface AssetRepresentationProfile {
  profileId: string;
  type: VisualAssetType;
  assetUrl: string;
  frameWidth: number;
  frameHeight: number;
  animations: Partial<Record<AnimationAction, Partial<Record<CardinalDirection, AnimationFrameData>>>>;
  fallbackProfileId?: string;
  scale: number;
  tintHex?: string;
}

export const SILHOUETTE_FALLBACK_PROFILE: AssetRepresentationProfile = {
  profileId: 'profile_placeholder_silhouette',
  type: 'SPRITE_SHEET_2D',
  assetUrl: '/assets/sprites/placeholders/silhouette_base.png',
  frameWidth: 32,
  frameHeight: 32,
  animations: {
    IDLE: {
      DOWN: { frameIndices: [0], frameDurationMs: 200, loop: true, pivotOffset: { x: 0.5, y: 0.5 } },
    },
    WALK: {
      DOWN: { frameIndices: [0, 1], frameDurationMs: 150, loop: true, pivotOffset: { x: 0.5, y: 0.5 } },
    },
  },
  scale: 1.0,
};

export class AssetRepresentationEngine {
  private profiles = new Map<string, AssetRepresentationProfile>();

  constructor() {
    this.registerProfile(SILHOUETTE_FALLBACK_PROFILE);
  }

  /**
   * Registers an asset representation profile.
   */
  public registerProfile(profile: AssetRepresentationProfile) {
    this.profiles.set(profile.profileId, { ...profile });
  }

  /**
   * Retrieves an asset representation profile by ID.
   */
  public getProfile(profileId: string): AssetRepresentationProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * Resolves the active animation frames for an action and direction, traversing the fallback chain if needed.
   */
  public resolveAnimation(
    profileId: string,
    action: AnimationAction,
    direction: CardinalDirection
  ): { profile: AssetRepresentationProfile; frames: AnimationFrameData } {
    let currentProfile = this.getProfile(profileId) || SILHOUETTE_FALLBACK_PROFILE;

    while (currentProfile) {
      const actionMap = currentProfile.animations[action];
      if (actionMap) {
        // Direct directional match
        if (actionMap[direction]) {
          return { profile: currentProfile, frames: actionMap[direction]! };
        }
        // Fallback to DOWN direction if specific cardinal angle is missing
        if (actionMap.DOWN) {
          return { profile: currentProfile, frames: actionMap.DOWN! };
        }
      }

      if (currentProfile.fallbackProfileId && this.profiles.has(currentProfile.fallbackProfileId)) {
        currentProfile = this.profiles.get(currentProfile.fallbackProfileId)!;
      } else {
        break;
      }
    }

    // Ultimate fallback to default silhouette
    const fallbackAction = SILHOUETTE_FALLBACK_PROFILE.animations[action] || SILHOUETTE_FALLBACK_PROFILE.animations.IDLE!;
    const fallbackFrames = fallbackAction.DOWN || { frameIndices: [0], frameDurationMs: 200, loop: true, pivotOffset: { x: 0.5, y: 0.5 } };

    return {
      profile: SILHOUETTE_FALLBACK_PROFILE,
      frames: fallbackFrames,
    };
  }

  /**
   * Traverses and resolves the entire fallback chain hierarchy for diagnostic inspection.
   */
  public resolveFallbackChain(profileId: string): AssetRepresentationProfile[] {
    const chain: AssetRepresentationProfile[] = [];
    const visited = new Set<string>();

    let current = this.getProfile(profileId);
    while (current && !visited.has(current.profileId)) {
      visited.add(current.profileId);
      chain.push(current);
      if (current.fallbackProfileId) {
        current = this.getProfile(current.fallbackProfileId);
      } else {
        break;
      }
    }

    if (!visited.has(SILHOUETTE_FALLBACK_PROFILE.profileId)) {
      chain.push(SILHOUETTE_FALLBACK_PROFILE);
    }

    return chain;
  }
}
