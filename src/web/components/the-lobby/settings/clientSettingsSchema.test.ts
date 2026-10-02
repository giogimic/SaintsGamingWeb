import { describe, expect, it } from 'vitest';
import { ClientSettingsSchema, DEFAULT_CLIENT_SETTINGS } from './clientSettingsSchema';

describe('client camera profile settings', () => {
  it('defaults to third-person', () => {
	expect(DEFAULT_CLIENT_SETTINGS.camera.profile).toBe('follow45');
  });

  it.each(['dynamic', 'isometric', 'topdown', 'free'])('normalizes unsupported profile %s to third-person', (profile) => {
	const result = ClientSettingsSchema.safeParse({
	  ...DEFAULT_CLIENT_SETTINGS,
	  camera: { ...DEFAULT_CLIENT_SETTINGS.camera, profile },
	});

	expect(result.success).toBe(true);
	if (result.success) expect(result.data.camera.profile).toBe('follow45');
  });

  it('preserves first-person profile', () => {
	const result = ClientSettingsSchema.safeParse({
	  ...DEFAULT_CLIENT_SETTINGS,
	  camera: { ...DEFAULT_CLIENT_SETTINGS.camera, profile: 'firstperson' },
	});

	expect(result.success).toBe(true);
	if (result.success) expect(result.data.camera.profile).toBe('firstperson');
  });
});
