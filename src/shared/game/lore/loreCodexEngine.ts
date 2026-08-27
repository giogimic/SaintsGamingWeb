/**
 * Saints Gaming — Master World Lore Codex, Ancient Relics & Archaeology Excavation Engine (Bible 09, 13, 22, 32)
 * Manages epoch lore chapters, relic fragment restoration, and passive mastery perk evaluation.
 */

export type LoreEpoch =
  | 'AGE_OF_CREATION'
  | 'THE_FIRST_TAMERS'
  | 'THE_SHADOW_CATACLYSM'
  | 'ERA_OF_GUILDS'
  | 'CONTEMPORARY_SAINTS';

export type RelicQuality =
  | 'COMMON_SHARD'
  | 'ANCIENT_POTTERY'
  | 'FORGOTTEN_RUNESTONE'
  | 'MYTHIC_CELESTIAL_RELIC';

export interface RelicDefinition {
  id: string;
  name: string;
  quality: RelicQuality;
  requiredFragments: number;
  description: string;
  associatedChapterId?: string;
}

export interface LoreChapterDefinition {
  id: string;
  epoch: LoreEpoch;
  title: string;
  transcript: string;
  associatedRelicId?: string;
  masteryPerk: {
    stat: string;
    bonusPct: number;
    description: string;
  };
}

export interface PlayerCodexProgress {
  playerId: string;
  discoveredChapters: Set<string>;
  relicFragments: Map<string, number>;
  restoredRelics: Set<string>;
  activeMasteryPerks: Array<{ stat: string; bonusPct: number; description: string }>;
}

export class LoreCodexEngine {
  private chapters = new Map<string, LoreChapterDefinition>();
  private relics = new Map<string, RelicDefinition>();

  /**
   * Registers a lore chapter definition.
   */
  public registerChapter(chapter: LoreChapterDefinition) {
    this.chapters.set(chapter.id, { ...chapter });
  }

  /**
   * Registers an archaeological relic definition.
   */
  public registerRelic(relic: RelicDefinition) {
    this.relics.set(relic.id, { ...relic });
  }

  /**
   * Initializes a player's lore codex progress profile.
   */
  public createPlayerProgress(playerId: string): PlayerCodexProgress {
    return {
      playerId,
      discoveredChapters: new Set<string>(),
      relicFragments: new Map<string, number>(),
      restoredRelics: new Set<string>(),
      activeMasteryPerks: [],
    };
  }

  /**
   * Discovers a lore chapter, granting the chapter's mastery passive perk.
   */
  public discoverChapter(
    progress: PlayerCodexProgress,
    chapterId: string
  ): {
    unlocked: boolean;
    perkUnlocked?: { stat: string; bonusPct: number; description: string };
  } {
    const chapter = this.chapters.get(chapterId);
    if (!chapter) {
      throw new Error(`Lore chapter ${chapterId} not found`);
    }

    if (progress.discoveredChapters.has(chapterId)) {
      return { unlocked: false };
    }

    progress.discoveredChapters.add(chapterId);
    progress.activeMasteryPerks.push({ ...chapter.masteryPerk });

    return {
      unlocked: true,
      perkUnlocked: chapter.masteryPerk,
    };
  }

  /**
   * Adds excavated relic fragments to the player's collection.
   */
  public addRelicFragment(
    progress: PlayerCodexProgress,
    relicId: string,
    count: number = 1
  ): { totalFragments: number; canRestore: boolean } {
    const relic = this.relics.get(relicId);
    if (!relic) {
      throw new Error(`Relic ${relicId} not found`);
    }

    const current = progress.relicFragments.get(relicId) || 0;
    const total = current + count;
    progress.relicFragments.set(relicId, total);

    return {
      totalFragments: total,
      canRestore: total >= relic.requiredFragments && !progress.restoredRelics.has(relicId),
    };
  }

  /**
   * Restores an ancient relic from collected fragments, optionally unlocking its associated lore chapter.
   */
  public restoreRelic(
    progress: PlayerCodexProgress,
    relicId: string
  ): {
    restored: boolean;
    relic?: RelicDefinition;
    associatedChapterUnlocked?: boolean;
    error?: string;
  } {
    const relic = this.relics.get(relicId);
    if (!relic) {
      return { restored: false, error: `Relic ${relicId} not found` };
    }

    if (progress.restoredRelics.has(relicId)) {
      return { restored: false, error: 'Relic has already been restored' };
    }

    const fragments = progress.relicFragments.get(relicId) || 0;
    if (fragments < relic.requiredFragments) {
      return {
        restored: false,
        error: `Insufficient fragments (${fragments}/${relic.requiredFragments})`,
      };
    }

    // Consume fragments and mark restored
    progress.relicFragments.set(relicId, fragments - relic.requiredFragments);
    progress.restoredRelics.add(relicId);

    // Auto-discover associated chapter if defined
    let associatedChapterUnlocked = false;
    if (relic.associatedChapterId) {
      const disc = this.discoverChapter(progress, relic.associatedChapterId);
      associatedChapterUnlocked = disc.unlocked;
    }

    return {
      restored: true,
      relic,
      associatedChapterUnlocked,
    };
  }

  /**
   * Computes aggregate passive bonus percentage for a given combat or gathering stat.
   */
  public getStatMasteryBonus(progress: PlayerCodexProgress, stat: string): number {
    let totalBonus = 0;
    for (const perk of progress.activeMasteryPerks) {
      if (perk.stat.toLowerCase() === stat.toLowerCase()) {
        totalBonus += perk.bonusPct;
      }
    }
    return totalBonus;
  }
}
