import { describe, expect, it } from 'vitest';
import {
  LoreChapterDefinition,
  LoreCodexEngine,
  RelicDefinition,
} from './loreCodexEngine';

describe('Master World Lore Codex & Archaeology Relic Engine (Phase 48)', () => {
  const chapter1: LoreChapterDefinition = {
    id: 'chap_creation_wyrm',
    epoch: 'AGE_OF_CREATION',
    title: 'The Awakening of the Astral Wyrm',
    transcript: 'In the primordial dawn before the shards fractured, the great astral beast sang...',
    masteryPerk: {
      stat: 'HOLY_MAGIC_AFFINITY',
      bonusPct: 5,
      description: '+5% Holy Magic Affinity',
    },
  };

  const chapter2: LoreChapterDefinition = {
    id: 'chap_shadow_cataclysm',
    epoch: 'THE_SHADOW_CATACLYSM',
    title: 'The Fall of the Old Tamers',
    transcript: 'When darkness fell upon the grand citadel, the tamers bound their spirits to the stones...',
    masteryPerk: {
      stat: 'ANCIENT_CRYPT_DAMAGE',
      bonusPct: 8,
      description: '+8% Ancient Crypt Monster Damage',
    },
  };

  const relicTome: RelicDefinition = {
    id: 'relic_astral_tome',
    name: 'Tome of the Astral Wyrm',
    quality: 'MYTHIC_CELESTIAL_RELIC',
    requiredFragments: 4,
    description: 'An ancient grimoire of celestial taming rites.',
    associatedChapterId: 'chap_creation_wyrm',
  };

  it('registers chapters, discovers lore, and activates passive mastery perks', () => {
    const engine = new LoreCodexEngine();
    engine.registerChapter(chapter1);
    engine.registerChapter(chapter2);

    const player = engine.createPlayerProgress('saint_archaeologist');
    expect(player.discoveredChapters.size).toBe(0);
    expect(engine.getStatMasteryBonus(player, 'HOLY_MAGIC_AFFINITY')).toBe(0);

    // 1. Discover Chapter 1
    const disc1 = engine.discoverChapter(player, 'chap_creation_wyrm');
    expect(disc1.unlocked).toBe(true);
    expect(disc1.perkUnlocked?.stat).toBe('HOLY_MAGIC_AFFINITY');
    expect(engine.getStatMasteryBonus(player, 'HOLY_MAGIC_AFFINITY')).toBe(5);

    // 2. Discover Chapter 2
    const disc2 = engine.discoverChapter(player, 'chap_shadow_cataclysm');
    expect(disc2.unlocked).toBe(true);
    expect(engine.getStatMasteryBonus(player, 'ANCIENT_CRYPT_DAMAGE')).toBe(8);

    // 3. Re-discovering already discovered chapter returns false
    const rediscovery = engine.discoverChapter(player, 'chap_creation_wyrm');
    expect(rediscovery.unlocked).toBe(false);
  });

  it('collects relic fragments, restores ancient relics, and unlocks associated lore chapters', () => {
    const engine = new LoreCodexEngine();
    engine.registerChapter(chapter1);
    engine.registerRelic(relicTome);

    const player = engine.createPlayerProgress('saint_delver');

    // 1. Dig up 2 fragments (< 4 required) -> Cannot restore yet
    const dig1 = engine.addRelicFragment(player, 'relic_astral_tome', 2);
    expect(dig1.totalFragments).toBe(2);
    expect(dig1.canRestore).toBe(false);

    // 2. Attempt early restoration -> Fails with error
    const earlyRestore = engine.restoreRelic(player, 'relic_astral_tome');
    expect(earlyRestore.restored).toBe(false);
    expect(earlyRestore.error).toContain('Insufficient fragments');

    // 3. Dig up 2 more fragments (total 4) -> Ready to restore
    const dig2 = engine.addRelicFragment(player, 'relic_astral_tome', 2);
    expect(dig2.totalFragments).toBe(4);
    expect(dig2.canRestore).toBe(true);

    // 4. Restore relic -> Consumes fragments, restores relic, and auto-discovers Chapter 1
    const restore = engine.restoreRelic(player, 'relic_astral_tome');
    expect(restore.restored).toBe(true);
    expect(restore.associatedChapterUnlocked).toBe(true);
    expect(player.restoredRelics.has('relic_astral_tome')).toBe(true);
    expect(player.discoveredChapters.has('chap_creation_wyrm')).toBe(true);
    expect(engine.getStatMasteryBonus(player, 'HOLY_MAGIC_AFFINITY')).toBe(5);
  });
});
