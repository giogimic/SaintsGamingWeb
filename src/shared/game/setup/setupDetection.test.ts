import { describe, it, expect } from 'vitest';
import { evaluateSetupStatus, DEFAULT_REALM_NAME, DEFAULT_FALLBACK_MAP_ID } from './setupDetection';

describe('evaluateSetupStatus', () => {
  it('detects fresh install when setup is not completed and mapCount is 0', () => {
    const status = evaluateSetupStatus({
      setupSettingVal: null,
      mapCount: 0,
      userCount: 0,
      adminCount: 0,
    });

    expect(status.isFreshInstall).toBe(true);
    expect(status.isSetupCompleted).toBe(false);
    expect(status.mapCount).toBe(0);
    expect(status.hasAdmin).toBe(false);
    expect(status.realmName).toBe(DEFAULT_REALM_NAME);
    expect(status.realmDescription).toBe('The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~');
    expect(status.defaultMapId).toBeNull();
  });

  it('detects existing install when maps already exist even if setup setting is missing', () => {
    const status = evaluateSetupStatus({
      setupSettingVal: null,
      mapCount: 5,
      userCount: 10,
      adminCount: 2,
      realmNameSettingVal: 'Custom Realm',
      realmDescriptionSettingVal: 'Custom Tagline',
      defaultMapIdSettingVal: 'TOWN_CENTER',
    });

    expect(status.isFreshInstall).toBe(false);
    expect(status.isSetupCompleted).toBe(false);
    expect(status.mapCount).toBe(5);
    expect(status.hasAdmin).toBe(true);
    expect(status.realmName).toBe('Custom Realm');
    expect(status.realmDescription).toBe('Custom Tagline');
    expect(status.defaultMapId).toBe('TOWN_CENTER');
  });

  it('detects setup completed state when SETUP_COMPLETED is true', () => {
    const status = evaluateSetupStatus({
      setupSettingVal: 'true',
      mapCount: 1,
      userCount: 1,
      adminCount: 1,
      defaultMapIdSettingVal: 'DEMO_SANDBOX',
    });

    expect(status.isFreshInstall).toBe(false);
    expect(status.isSetupCompleted).toBe(true);
    expect(status.defaultMapId).toBe('DEMO_SANDBOX');
  });
});
