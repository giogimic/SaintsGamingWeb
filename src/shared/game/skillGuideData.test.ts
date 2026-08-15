import { describe, it, expect } from 'vitest';
import {
  SKILL_GUIDE_REGISTRY,
  getSkillGuide,
  resolveDynamicSkillUnlocks,
  getAllSkillUnlocks,
} from './skillGuideData';
import {
  COMBAT_SKILL_TYPINGS,
  GATHERING_SKILL_SLUGS,
  ARTISAN_SKILL_SLUGS,
  SUPPORT_SKILL_SLUGS,
} from './skillTypings';

describe('skillGuideData Registry', () => {
  const ALL_27_SLUGS = [
    ...COMBAT_SKILL_TYPINGS,
    ...GATHERING_SKILL_SLUGS,
    ...ARTISAN_SKILL_SLUGS,
    ...SUPPORT_SKILL_SLUGS,
  ];

  it('contains registered entries for all 27 skills', () => {
    expect(ALL_27_SLUGS.length).toBe(27);
    for (const slug of ALL_27_SLUGS) {
      const guide = getSkillGuide(slug);
      expect(guide).toBeDefined();
      expect(guide?.name).toBeDefined();
      expect(guide?.category).toBeDefined();
      expect(guide?.iconName).toBeDefined();
      expect(guide?.perLevelPerks.length).toBeGreaterThan(0);
      expect(guide?.staticMilestones.length).toBeGreaterThan(0);
      expect(guide?.battlepassTiers.length).toBeGreaterThan(0);
    }
  });

  it('accurately resolves dynamic recipe and ability unlocks for Crafting & Attack', () => {
    const craftingUnlocks = resolveDynamicSkillUnlocks('crafting');
    expect(craftingUnlocks.length).toBeGreaterThan(0);
    expect(craftingUnlocks.some((u) => u.title.includes('Capture Device'))).toBe(true);

    const attackUnlocks = getAllSkillUnlocks('attack');
    expect(attackUnlocks.length).toBeGreaterThan(0);
    expect(attackUnlocks.some((u) => u.title.includes('Sword') || u.title.includes('Slash') || u.title.includes('Weaponry'))).toBe(true);
    expect(attackUnlocks.some((u) => u.level === 50 && u.title.includes('Celestial'))).toBe(true);
  });

  it('contains complete Attack, Strength, Defence, Hitpoints, Ranged, Agility, Perception, Wisdom, Intelligence, Farming, Fishing, Hunter, Mining, Woodcutting, Construction, & Cooking battlepass tier rewards from Lv 5/10 to Lv 50/99', () => {
    const attackGuide = getSkillGuide('attack')!;
    expect(attackGuide.battlepassTiers.length).toBe(10);
    expect(attackGuide.battlepassTiers[0].rewardName).toContain('Novice Swordsman');
    expect(attackGuide.battlepassTiers[9].rewardName).toContain('Cape of Attack');

    const strengthGuide = getSkillGuide('strength')!;
    expect(strengthGuide.battlepassTiers.length).toBe(10);
    expect(strengthGuide.battlepassTiers[0].rewardName).toContain('Novice Brawler');
    expect(strengthGuide.battlepassTiers[9].rewardName).toContain('Cape of Strength');

    const defenceGuide = getSkillGuide('defence')!;
    expect(defenceGuide.battlepassTiers.length).toBe(10);
    expect(defenceGuide.battlepassTiers[0].rewardName).toContain('Shieldbearer');
    expect(defenceGuide.battlepassTiers[9].rewardName).toContain('Cape of Defence');

    const hitpointsGuide = getSkillGuide('hitpoints')!;
    expect(hitpointsGuide.battlepassTiers.length).toBe(10);
    expect(hitpointsGuide.battlepassTiers[0].rewardName).toContain('Novice Vitalist');
    expect(hitpointsGuide.battlepassTiers[9].rewardName).toContain('Cape of Hitpoints');

    const rangedGuide = getSkillGuide('ranged')!;
    expect(rangedGuide.battlepassTiers.length).toBe(10);
    expect(rangedGuide.battlepassTiers[0].rewardName).toContain('Novice Marksman');
    expect(rangedGuide.battlepassTiers[9].rewardName).toContain('Cape of Ranged');

    const agilityGuide = getSkillGuide('agility')!;
    expect(agilityGuide.battlepassTiers.length).toBe(10);
    expect(agilityGuide.battlepassTiers[0].rewardName).toContain('Novice Acrobat');
    expect(agilityGuide.battlepassTiers[9].rewardName).toContain('Cape of Agility');

    const perceptionGuide = getSkillGuide('perception')!;
    expect(perceptionGuide.battlepassTiers.length).toBe(10);
    expect(perceptionGuide.battlepassTiers[0].rewardName).toContain('Novice Tracker');
    expect(perceptionGuide.battlepassTiers[9].rewardName).toContain('Cape of Perception');

    const wisdomGuide = getSkillGuide('wisdom')!;
    expect(wisdomGuide.battlepassTiers.length).toBe(10);
    expect(wisdomGuide.battlepassTiers[0].rewardName).toContain('Novice Acolyte');
    expect(wisdomGuide.battlepassTiers[9].rewardName).toContain('Cape of Wisdom');

    const intGuide = getSkillGuide('intelligence')!;
    expect(intGuide.battlepassTiers.length).toBe(10);
    expect(intGuide.battlepassTiers[0].rewardName).toContain('Novice Evoker');
    expect(intGuide.battlepassTiers[9].rewardName).toContain('Cape of Intelligence');

    const farmGuide = getSkillGuide('farming')!;
    expect(farmGuide.battlepassTiers.length).toBe(10);
    expect(farmGuide.battlepassTiers[0].rewardName).toContain('Novice Planter');
    expect(farmGuide.battlepassTiers[9].rewardName).toContain('Cape of Farming');

    const fishGuide = getSkillGuide('fishing')!;
    expect(fishGuide.battlepassTiers.length).toBe(10);
    expect(fishGuide.battlepassTiers[0].rewardName).toContain('Novice Angler');
    expect(fishGuide.battlepassTiers[9].rewardName).toContain('Cape of Fishing');

    const hunterGuide = getSkillGuide('hunter')!;
    expect(hunterGuide.battlepassTiers.length).toBe(10);
    expect(hunterGuide.battlepassTiers[0].rewardName).toContain('Novice Trapper');
    expect(hunterGuide.battlepassTiers[9].rewardName).toContain('Cape of Hunter');

    const miningGuide = getSkillGuide('mining')!;
    expect(miningGuide.battlepassTiers.length).toBe(10);
    expect(miningGuide.battlepassTiers[0].rewardName).toContain('Novice Miner');
    expect(miningGuide.battlepassTiers[9].rewardName).toContain('Cape of Mining');

    const wcGuide = getSkillGuide('woodcutting')!;
    expect(wcGuide.battlepassTiers.length).toBe(10);
    expect(wcGuide.battlepassTiers[0].rewardName).toContain('Novice Lumberjack');
    expect(wcGuide.battlepassTiers[9].rewardName).toContain('Cape of Woodcutting');

    const conGuide = getSkillGuide('construction')!;
    expect(conGuide.battlepassTiers.length).toBe(10);
    expect(conGuide.battlepassTiers[0].rewardName).toContain('Novice Builder');
    expect(conGuide.battlepassTiers[9].rewardName).toContain('Cape of Construction');

    const cookGuide = getSkillGuide('cooking')!;
    expect(cookGuide.battlepassTiers.length).toBe(10);
    expect(cookGuide.battlepassTiers[0].rewardName).toContain('Novice Cook');
    expect(cookGuide.battlepassTiers[9].rewardName).toContain('Cape of Cooking');
  });

  it('accurately resolves heavy weapon unlocks for Strength, armor for Defence, vitality for Hitpoints, bows for Ranged, boots for Agility, optics for Perception, relics for Wisdom, wands for Intelligence, crops for Farming, seafood for Fishing, traps for Hunter, pickaxes for Mining, hatchets/logs for Woodcutting, planks/altars for Construction, and dishes/recipes for Cooking in dynamic lookups', () => {
    const strengthUnlocks = getAllSkillUnlocks('strength');
    expect(strengthUnlocks.length).toBeGreaterThan(0);
    expect(strengthUnlocks.some((u) => u.title.includes('Battleaxe') || u.title.includes('Warhammer'))).toBe(true);
    expect(strengthUnlocks.some((u) => u.level === 50 && u.title.includes('Titan'))).toBe(true);

    const defenceUnlocks = getAllSkillUnlocks('defence');
    expect(defenceUnlocks.length).toBeGreaterThan(0);
    expect(defenceUnlocks.some((u) => u.title.includes('Platebody') || u.title.includes('Kiteshield') || u.title.includes('Bulwark'))).toBe(true);
    expect(defenceUnlocks.some((u) => u.level === 50 && u.title.includes('Celestial'))).toBe(true);

    const hpUnlocks = getAllSkillUnlocks('hitpoints');
    expect(hpUnlocks.length).toBeGreaterThan(0);
    expect(hpUnlocks.some((u) => u.title.includes('Fish') || u.title.includes('Shark') || u.title.includes('Vitality') || u.title.includes('Heart'))).toBe(true);
    expect(hpUnlocks.some((u) => u.level === 50 && u.title.includes('Phoenix'))).toBe(true);

    const rangedUnlocks = getAllSkillUnlocks('ranged');
    expect(rangedUnlocks.length).toBeGreaterThan(0);
    expect(rangedUnlocks.some((u) => u.title.includes('Bow') || u.title.includes('Longbow') || u.title.includes('Crossbow') || u.title.includes('Tunic'))).toBe(true);
    expect(rangedUnlocks.some((u) => u.level === 50 && u.title.includes('Celestial'))).toBe(true);

    const agilityUnlocks = getAllSkillUnlocks('agility');
    expect(agilityUnlocks.length).toBeGreaterThan(0);
    expect(agilityUnlocks.some((u) => u.title.includes('Boots') || u.title.includes('Runners') || u.title.includes('Stamina') || u.title.includes('Greaves'))).toBe(true);
    expect(agilityUnlocks.some((u) => u.level === 50 && u.title.includes('Celestial'))).toBe(true);

    const perceptionUnlocks = getAllSkillUnlocks('perception');
    expect(perceptionUnlocks.length).toBeGreaterThan(0);
    expect(perceptionUnlocks.some((u) => u.title.includes('Spyglass') || u.title.includes('Monocle') || u.title.includes('Goggles') || u.title.includes('Lens') || u.title.includes('Oculus'))).toBe(true);
    expect(perceptionUnlocks.some((u) => u.level === 50 && u.title.includes('Celestial'))).toBe(true);

    const wisdomUnlocks = getAllSkillUnlocks('wisdom');
    expect(wisdomUnlocks.length).toBeGreaterThan(0);
    expect(wisdomUnlocks.some((u) => u.title.includes('Talisman') || u.title.includes('Mana') || u.title.includes('Scripture') || u.title.includes('Buckler') || u.title.includes('Aegis') || u.title.includes('Sanctuary'))).toBe(true);
    expect(wisdomUnlocks.some((u) => u.level === 50 && u.title.includes('Celestial'))).toBe(true);

    const intUnlocks = getAllSkillUnlocks('intelligence');
    expect(intUnlocks.length).toBeGreaterThan(0);
    expect(intUnlocks.some((u) => u.title.includes('Wand') || u.title.includes('Staff') || u.title.includes('Orb') || u.title.includes('Grimoire') || u.title.includes('Scepter') || u.title.includes('Singularity'))).toBe(true);
    expect(intUnlocks.some((u) => u.level === 50 && u.title.includes('Celestial'))).toBe(true);

    const farmUnlocks = getAllSkillUnlocks('farming');
    expect(farmUnlocks.length).toBeGreaterThan(0);
    expect(farmUnlocks.some((u) => u.title.includes('Seed') || u.title.includes('Compost') || u.title.includes('Watering Can') || u.title.includes('Sapling') || u.title.includes('Starflower'))).toBe(true);
    expect(farmUnlocks.some((u) => u.level === 99 && u.title.includes('Celestial'))).toBe(true);

    const fishUnlocks = getAllSkillUnlocks('fishing');
    expect(fishUnlocks.length).toBeGreaterThan(0);
    expect(fishUnlocks.some((u) => u.title.includes('Net') || u.title.includes('Shrimp') || u.title.includes('Trout') || u.title.includes('Lobster') || u.title.includes('Swordfish') || u.title.includes('Shark') || u.title.includes('Leviathan'))).toBe(true);
    expect(fishUnlocks.some((u) => u.level === 99 && u.title.includes('Celestial'))).toBe(true);

    const hunterUnlocks = getAllSkillUnlocks('hunter');
    expect(hunterUnlocks.length).toBeGreaterThan(0);
    expect(hunterUnlocks.some((u) => u.title.includes('Snare') || u.title.includes('Finch') || u.title.includes('Trap') || u.title.includes('Kebbit') || u.title.includes('Chinchompa') || u.title.includes('Kyatt') || u.title.includes('Phoenix'))).toBe(true);
    expect(hunterUnlocks.some((u) => u.level === 99 && u.title.includes('Celestial'))).toBe(true);

    const miningUnlocks = getAllSkillUnlocks('mining');
    expect(miningUnlocks.length).toBeGreaterThan(0);
    expect(miningUnlocks.some((u) => u.title.includes('Pickaxe') || u.title.includes('Copper') || u.title.includes('Iron') || u.title.includes('Coal') || u.title.includes('Mithril') || u.title.includes('Adamant') || u.title.includes('Runite') || u.title.includes('Asteroid'))).toBe(true);
    expect(miningUnlocks.some((u) => u.level === 99 && u.title.includes('Celestial'))).toBe(true);

    const wcUnlocks = getAllSkillUnlocks('woodcutting');
    expect(wcUnlocks.length).toBeGreaterThan(0);
    expect(wcUnlocks.some((u) => u.title.includes('Hatchet') || u.title.includes('Oak') || u.title.includes('Willow') || u.title.includes('Teak') || u.title.includes('Maple') || u.title.includes('Yew') || u.title.includes('Magic') || u.title.includes('Redwood') || u.title.includes('World-Tree'))).toBe(true);
    expect(wcUnlocks.some((u) => u.level === 99 && u.title.includes('Celestial'))).toBe(true);

    const conUnlocks = getAllSkillUnlocks('construction');
    expect(conUnlocks.length).toBeGreaterThan(0);
    expect(conUnlocks.some((u) => u.title.includes('Plank') || u.title.includes('Estate') || u.title.includes('Table') || u.title.includes('Bench') || u.title.includes('Portal') || u.title.includes('Altar') || u.title.includes('Throne') || u.title.includes('Palace'))).toBe(true);
    expect(conUnlocks.some((u) => u.level === 99 && u.title.includes('Celestial'))).toBe(true);

    const cookUnlocks = getAllSkillUnlocks('cooking');
    expect(cookUnlocks.length).toBeGreaterThan(0);
    expect(cookUnlocks.some((u) => u.title.includes('Shrimp') || u.title.includes('Bread') || u.title.includes('Trout') || u.title.includes('Pie') || u.title.includes('Salmon') || u.title.includes('Lobster') || u.title.includes('Swordfish') || u.title.includes('Shark') || u.title.includes('Roast') || u.title.includes('Ambrosia'))).toBe(true);
    expect(cookUnlocks.some((u) => u.level === 99 && u.title.includes('Celestial'))).toBe(true);
  });

  it('orders battlepass tiers and milestone levels sequentially', () => {
    for (const slug of ALL_27_SLUGS) {
      const guide = getSkillGuide(slug)!;
      for (let i = 1; i < guide.battlepassTiers.length; i++) {
        expect(guide.battlepassTiers[i].level).toBeGreaterThanOrEqual(guide.battlepassTiers[i - 1].level);
      }
    }
  });
});
