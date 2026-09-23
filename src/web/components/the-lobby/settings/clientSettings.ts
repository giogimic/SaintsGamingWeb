import { ClientSettingsSchema, ClientSettings, DEFAULT_CLIENT_SETTINGS } from './clientSettingsSchema';
import { MOBILE_CONTROL_STORAGE_KEY } from '../store/types';

export const CLIENT_SETTINGS_STORAGE_KEY = 'saints-client-settings-v1';

export function loadClientSettings(): ClientSettings {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_SETTINGS;

  try {
    const stored = localStorage.getItem(CLIENT_SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate and fill in defaults with zod
      const result = ClientSettingsSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      } else {
        console.warn('Failed to parse client settings, falling back to migrated/default', result.error);
      }
    }

    // Migration from legacy settings
    return migrateLegacySettings();
  } catch (error) {
    console.error('Error loading client settings:', error);
    return DEFAULT_CLIENT_SETTINGS;
  }
}

function migrateLegacySettings(): ClientSettings {
  const settings = { ...DEFAULT_CLIENT_SETTINGS };
  let hasMigrated = false;

  try {
    // Migrate mobile controls
    const legacyMobile = localStorage.getItem(MOBILE_CONTROL_STORAGE_KEY);
    if (legacyMobile === 'dpad' || legacyMobile === 'floating') {
      settings.controls.mobileControlMode = legacyMobile;
      hasMigrated = true;
    }

    // Migrate camera settings
    const legacyCamera = localStorage.getItem('saints_camera_settings');
    if (legacyCamera) {
      const parsed = JSON.parse(legacyCamera);
      if (parsed.profile) {
        settings.camera.profile = parsed.profile;
        hasMigrated = true;
      }
    }

    if (hasMigrated) {
      saveClientSettings(settings);
    }
  } catch (e) {
    console.error('Error migrating legacy settings', e);
  }

  return settings;
}

export function saveClientSettings(settings: ClientSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLIENT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving client settings', e);
  }
}
