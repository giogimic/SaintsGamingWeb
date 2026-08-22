import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLAYER_IDENTITY,
  DEFAULT_PLAYER_IDENTITY_PLURAL,
  DEFAULT_CHAT_TITLE,
  DEFAULT_CREATURE_IDENTITY,
  DEFAULT_CREATURE_IDENTITY_PLURAL,
  DEFAULT_CAPTURE_TOOL_NAME,
  DEFAULT_CAPTURE_AMMO_NAME,
  getPlayerClassName,
  getPlayerClassNamePlural,
  getChatTitle,
  getCreatureIdentity,
  getCreatureIdentityPlural,
  getCaptureToolName,
  getCaptureAmmoName,
  formatPlayerIdentity,
  DEFAULT_REALM_SETTINGS,
} from './realmSettings';

describe('realmSettings', () => {
  it('defaults canonical player class name to Saint / Saints', () => {
    expect(DEFAULT_PLAYER_IDENTITY).toBe('Saint');
    expect(DEFAULT_PLAYER_IDENTITY_PLURAL).toBe('Saints');
    expect(getPlayerClassName()).toBe('Saint');
    expect(getPlayerClassName(null)).toBe('Saint');
    expect(getPlayerClassName('')).toBe('Saint');
    expect(getPlayerClassName('   ')).toBe('Saint');
    expect(getPlayerClassNamePlural()).toBe('Saints');
    expect(getPlayerClassNamePlural('Heroes')).toBe('Heroes');
  });

  it('defaults chat title to Soul Link', () => {
    expect(DEFAULT_CHAT_TITLE).toBe('Soul Link');
    expect(getChatTitle()).toBe('Soul Link');
    expect(getChatTitle('Comm Link')).toBe('Comm Link');
  });

  it('defaults creature and capture tool conventions', () => {
    expect(DEFAULT_CREATURE_IDENTITY).toBe('Soul');
    expect(DEFAULT_CREATURE_IDENTITY_PLURAL).toBe('Souls');
    expect(DEFAULT_CAPTURE_TOOL_NAME).toBe('Camera');
    expect(DEFAULT_CAPTURE_AMMO_NAME).toBe('Film');
    expect(getCreatureIdentity()).toBe('Soul');
    expect(getCreatureIdentityPlural()).toBe('Souls');
    expect(getCaptureToolName()).toBe('Camera');
    expect(getCaptureAmmoName()).toBe('Film');
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
    expect(DEFAULT_REALM_SETTINGS.chatTitle).toBe('Soul Link');
    expect(DEFAULT_REALM_SETTINGS.creatureIdentity).toBe('Soul');
    expect(DEFAULT_REALM_SETTINGS.captureToolName).toBe('Camera');
    expect(DEFAULT_REALM_SETTINGS.captureAmmoName).toBe('Film');
  });
});
