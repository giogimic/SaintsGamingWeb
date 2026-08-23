import { describe, it, expect } from 'vitest';
import {
  evaluateSetupStatus,
  DEFAULT_GAME_NAME,
  DEFAULT_GAME_DESCRIPTION,
  DEFAULT_GAME_GENRE,
  DEFAULT_GAME_STYLE,
  DEFAULT_GAME_CAMERA,
  DEFAULT_GROUND_GID_VALUE,
} from './setupDetection';

describe('evaluateSetupStatus', () => {
  it('detects fresh pristine game setup when uninitialized and mapCount is 0', () => {
    const status = evaluateSetupStatus({
      gameInitializedVal: null,
      setupSettingVal: null,
      mapCount: 0,
      userCount: 0,
      adminCount: 0,
    });

    expect(status.isFreshInstall).toBe(true);
    expect(status.isSetupCompleted).toBe(false);
    expect(status.isGameInitialized).toBe(false);
    expect(status.mapCount).toBe(0);
    expect(status.hasAdmin).toBe(false);
    expect(status.gameName).toBe(DEFAULT_GAME_NAME);
    expect(status.gameDescription).toBe(DEFAULT_GAME_DESCRIPTION);
    expect(status.gameGenre).toBe(DEFAULT_GAME_GENRE);
    expect(status.gameStyle).toBe(DEFAULT_GAME_STYLE);
    expect(status.gameCamera).toBe(DEFAULT_GAME_CAMERA);
    expect(status.defaultMapId).toBeNull();
    expect(status.defaultGroundGid).toBe(DEFAULT_GROUND_GID_VALUE);
  });

  it('detects existing game when maps already exist even if setup flag is missing (Update Protection)', () => {
    const status = evaluateSetupStatus({
      gameInitializedVal: null,
      setupSettingVal: null,
      mapCount: 3,
      userCount: 12,
      adminCount: 2,
      gameNameSettingVal: 'Custom RPG',
      gameDescriptionSettingVal: 'Custom Description',
      defaultMapIdSettingVal: 'STARTING_MEADOW',
    });

    expect(status.isFreshInstall).toBe(false);
    expect(status.isSetupCompleted).toBe(true);
    expect(status.isGameInitialized).toBe(true);
    expect(status.mapCount).toBe(3);
    expect(status.hasAdmin).toBe(true);
    expect(status.gameName).toBe('Custom RPG');
    expect(status.gameDescription).toBe('Custom Description');
    expect(status.defaultMapId).toBe('STARTING_MEADOW');
  });

  it('detects game initialization completed state with custom genre, style, and default ground GID', () => {
    const status = evaluateSetupStatus({
      gameInitializedVal: 'true',
      mapCount: 1,
      userCount: 1,
      adminCount: 1,
      gameNameSettingVal: 'Kingdom of Valor',
      gameDescriptionSettingVal: 'Action RPG Adventure',
      gameGenreSettingVal: 'ARPG',
      gameStyleSettingVal: 'ACTION_REALTIME',
      gameCameraSettingVal: 'ISOMETRIC_25D',
      defaultMapIdSettingVal: 'CASTLE_GATES',
      defaultGroundGidSettingVal: '25',
    });

    expect(status.isFreshInstall).toBe(false);
    expect(status.isSetupCompleted).toBe(true);
    expect(status.isGameInitialized).toBe(true);
    expect(status.gameName).toBe('Kingdom of Valor');
    expect(status.gameGenre).toBe('ARPG');
    expect(status.defaultMapId).toBe('CASTLE_GATES');
    expect(status.defaultGroundGid).toBe(25);
  });

  it('preserves backward compatibility with legacy SETUP_COMPLETED setting', () => {
    const status = evaluateSetupStatus({
      setupSettingVal: 'true',
      mapCount: 1,
      userCount: 1,
      adminCount: 1,
      realmNameSettingVal: 'Legacy Realm',
      realmDescriptionSettingVal: 'Legacy Tagline',
      defaultMapIdSettingVal: 'DEMO_SANDBOX',
    });

    expect(status.isFreshInstall).toBe(false);
    expect(status.isSetupCompleted).toBe(true);
    expect(status.gameName).toBe('Legacy Realm');
    expect(status.realmName).toBe('Legacy Realm');
    expect(status.defaultMapId).toBe('DEMO_SANDBOX');
  });
});

