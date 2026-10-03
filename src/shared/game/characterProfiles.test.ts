import { describe, expect, it } from 'vitest';
import {
  CHARACTER_MODEL_PROFILES,
  getCharacterModelProfile,
  isWardrobeItemCompatibleWithProfile,
} from './characterProfiles';

describe('character model profiles', () => {
  it('returns undefined for non-existent profiles', () => {
    expect(getCharacterModelProfile('asian_girl')).toBeUndefined();
    expect(getCharacterModelProfile('leoverse')).toBeUndefined();
  });

  it('uses the shipped Quaternius rig and sex-specific wardrobe compatibility', () => {
    const male = getCharacterModelProfile('quat-quaternius_base_male');
    const female = getCharacterModelProfile('/models/quaternius/quaternius_base_female.glb');
    expect(male?.modelUrl).toBe('/models/quaternius/quaternius_base_male.glb');
    expect(male?.skeleton).toBe('quaternius_universal');
    expect(female?.skeleton).toBe('quaternius_universal');
    expect(male?.defaultAnimationProfileId).toBe('quaternius_native');
    expect(female?.defaultAnimationProfileId).toBe('quaternius_native');
    expect(isWardrobeItemCompatibleWithProfile(male, {
      pack: 'quaternius', baseBodyType: 'male', skeleton: 'quaternius_universal', tags: [],
    })).toBe(true);
    expect(isWardrobeItemCompatibleWithProfile(male, {
      pack: 'quaternius', baseBodyType: 'female', skeleton: 'quaternius_universal', tags: [],
    })).toBe(false);
    expect(isWardrobeItemCompatibleWithProfile(female, {
      pack: 'quaternius', baseBodyType: 'male', skeleton: 'quaternius_universal', tags: [],
    })).toBe(false);
  });
});
