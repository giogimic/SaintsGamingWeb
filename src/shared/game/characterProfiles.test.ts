import { describe, expect, it } from 'vitest';
import { CHARACTER_MODEL_PROFILES, getCharacterModelProfile } from './characterProfiles';

describe('character model profiles', () => {
  it('uses actual bundled Asian Girl mesh names and exposes each current outfit piece', () => {
	const profile = CHARACTER_MODEL_PROFILES.asian_girl;
	const parts = new Set(profile.modularParts.map((part) => part.meshName));

	expect(profile.modularParts).toHaveLength(13);
	expect(parts).toContain('4_+Shirt1_01_0_0');
	expect(parts).toContain('4_+Pants|Default_01_0_0007');
	expect(parts).toContain('4_-Katana|Hand_01_0_0001');
	expect(parts).toContain('6_+HolsterScabbard_01_0_0001');
	expect(getCharacterModelProfile('asian_girl')?.id).toBe('asian_girl');
	  expect(getCharacterModelProfile('asian_girl')?.defaultAnimationProfileId).toBeUndefined();
  });

  it('does not treat the static Red Runner prop as a character wardrobe profile', () => {
	expect(getCharacterModelProfile('leoverse')).toBeUndefined();
  });
});
