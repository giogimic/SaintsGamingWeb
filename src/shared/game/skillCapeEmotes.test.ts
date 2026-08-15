import { describe, expect, it } from 'vitest';
import {
  SKILL_CAPE_EMOTES,
  getSkillCapeEmote,
  getAllCapeEmotes,
} from './skillCapeEmotes';
import { ALL_SKILL_SLUGS } from './skillTypings';

describe('Skill Cape Emotes & Visual FX Registry', () => {
  it('contains comprehensive emote definitions for all 27 skills + max + completionist capes', () => {
    expect(Object.keys(SKILL_CAPE_EMOTES).length).toBe(29);

    for (const slug of ALL_SKILL_SLUGS) {
      const emote = SKILL_CAPE_EMOTES[slug];
      expect(emote).toBeDefined();
      expect(emote.slug).toBe(slug);
      expect(emote.capeName).toContain('Cape of');
      expect(emote.emoteName.length).toBeGreaterThan(3);
      expect(emote.description.length).toBeGreaterThan(20);
      expect(emote.primaryColor.startsWith('#')).toBe(true);
      expect(emote.durationSeconds).toBeGreaterThan(0);
    }

    // Special capes
    const maxEmote = SKILL_CAPE_EMOTES.max;
    expect(maxEmote).toBeDefined();
    expect(maxEmote.capeName).toContain('Max Cape');

    const compEmote = SKILL_CAPE_EMOTES.completionist;
    expect(compEmote).toBeDefined();
    expect(compEmote.capeName).toContain('Completionist Cape');
  });

  it('retrieves emote definitions by slug case-insensitively', () => {
    const atk = getSkillCapeEmote('Attack');
    expect(atk).toBeDefined();
    expect(atk?.emoteName).toBe('Bladestorm Flurry');

    const necro = getSkillCapeEmote('NECROMANCY');
    expect(necro).toBeDefined();
    expect(necro?.emoteName).toBe('Reaper Soul Reave');

    const max = getSkillCapeEmote('max');
    expect(max).toBeDefined();
    expect(max?.emoteName).toBe('Grandmaster Celestial Convergence');
  });

  it('getAllCapeEmotes returns full array of 29 entries', () => {
    const list = getAllCapeEmotes();
    expect(list.length).toBe(29);
    expect(list.some((e) => e.slug === 'prayer')).toBe(true);
    expect(list.some((e) => e.slug === 'magic')).toBe(true);
  });
});
