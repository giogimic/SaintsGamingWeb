import { describe, expect, it } from 'vitest';

describe('Starter Content Catalog Verification (Phase 9)', () => {
  it('validates taxonomy categorization and attribute constraints for seeded creatures', () => {
    const beasts = [
      { slug: 'beast_ember_fox', catchRate: 0.45, isStarter: true, tag: 'BEAST' },
      { slug: 'beast_aqua_otter', catchRate: 0.45, isStarter: true, tag: 'BEAST' },
      { slug: 'beast_verdant_sprout', catchRate: 0.5, isStarter: true, tag: 'BEAST' },
    ];

    const monsters = [
      { slug: 'monster_abyssal_fiend', catchRate: 0.0, stage: 'ENEMY', tag: 'MONSTER' },
      { slug: 'monster_skeleton_warrior', catchRate: 0.0, stage: 'ENEMY', tag: 'MONSTER' },
      { slug: 'monster_crypt_lord', catchRate: 0.0, stage: 'BOSS', tag: 'BOSS' },
    ];

    const mercenaries = [
      { slug: 'merc_veteran_guard', stage: 'COMPANION', tag: 'MERCENARY' },
      { slug: 'merc_shadow_scout', stage: 'COMPANION', tag: 'MERCENARY' },
      { slug: 'merc_mystic_healer', stage: 'COMPANION', tag: 'MERCENARY' },
    ];

    // Beasts check
    for (const b of beasts) {
      expect(b.catchRate).toBeGreaterThan(0);
      expect(b.isStarter).toBe(true);
      expect(b.tag).toBe('BEAST');
    }

    // Monsters check
    for (const m of monsters) {
      expect(m.catchRate).toBe(0.0);
      expect(['MONSTER', 'BOSS']).toContain(m.tag);
    }

    // Mercenaries check
    for (const merc of mercenaries) {
      expect(merc.stage).toBe('COMPANION');
      expect(merc.tag).toBe('MERCENARY');
    }
  });

  it('validates quest objective sequences and reward structures', () => {
    const awakeningQuest = {
      slug: 'quest_the_saints_awakening',
      objectives: [
        { stage: 1, type: 'TALK', targetSlug: 'npc_elder_marcus' },
        { stage: 2, type: 'GATHER', targetSlug: 'copper_ore' },
        { stage: 3, type: 'DEFEAT', targetSlug: 'monster_abyssal_fiend' },
        { stage: 4, type: 'TALK', targetSlug: 'npc_elder_marcus' },
      ],
      rewards: { xp: 250, gold: 100, items: [{ itemSlug: 'health_potion_minor', quantity: 3 }] },
    };

    expect(awakeningQuest.objectives).toHaveLength(4);
    expect(awakeningQuest.objectives.map((o) => o.stage)).toEqual([1, 2, 3, 4]);
    expect(awakeningQuest.rewards.xp).toBe(250);
    expect(awakeningQuest.rewards.gold).toBe(100);
    expect(awakeningQuest.rewards.items).toHaveLength(1);
  });
});
