import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLAYER_IDENTITY,
  getPlayerClassName,
  formatPlayerIdentity,
  DEFAULT_REALM_SETTINGS,
} from './realmSettings';

describe('realmSettings', () => {
  it('defaults canonical player class name to Saint', () => {
    expect(DEFAULT_PLAYER_IDENTITY).toBe('Saint');
    expect(getPlayerClassName()).toBe('Saint');
    expect(getPlayerClassName(null)).toBe('Saint');
    expect(getPlayerClassName('')).toBe('Saint');
    expect(getPlayerClassName('   ')).toBe('Saint');
  });

  it('honors customized realm player class name', () => {
    expect(getPlayerClassName('Hunter')).toBe('Hunter');
    expect(getPlayerClassName('Operative')).toBe('Operative');
  });

  it('formats player identity with fallback to configured class name', () => {
    expect(formatPlayerIdentity('GioGimic')).toBe('GioGimic');
    expect(formatPlayerIdentity(null)).toBe('Saint');
    expect(formatPlayerIdentity('', 'Tamer')).toBe('Tamer');
    expect(formatPlayerIdentity(undefined, 'Operative')).toBe('Operative');
  });

  it('contains valid default realm settings structure', () => {
    expect(DEFAULT_REALM_SETTINGS.playerClassName).toBe('Saint');
    expect(DEFAULT_REALM_SETTINGS.realmName).toBe('Saints Realm');
  });
});
