import { describe, expect, it } from 'vitest';
import { CHARACTER_MODEL_PROFILES, getCharacterModelProfile } from './characterProfiles';

describe('character model profiles', () => {
  it('returns undefined for non-existent profiles', () => {
    expect(getCharacterModelProfile('asian_girl')).toBeUndefined();
    expect(getCharacterModelProfile('leoverse')).toBeUndefined();
  });
});
