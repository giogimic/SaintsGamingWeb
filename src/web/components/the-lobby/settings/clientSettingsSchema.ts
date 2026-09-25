import { z } from 'zod';

export const ClientSettingsSchema = z.object({
  version: z.literal(1),
  
  controls: z.object({
    mobileControlMode: z.enum(['floating', 'dpad']).default('floating'),
    invertY: z.boolean().default(false),
    mouseSensitivity: z.number().min(0.1).max(5.0).default(1.0),
    keybinds: z.record(z.string()).default({}), // Map of action to key (e.g. 'inventory': 'i')
  }).default({}),

  camera: z.object({
    profile: z.enum(['firstperson', 'follow45', 'isometric', 'dynamic']).default('dynamic'),
    fov: z.number().min(60).max(120).default(90),
    thirdPersonDistance: z.number().min(2).max(20).default(6),
    cameraShake: z.boolean().default(true),
    smoothing: z.number().min(0).max(1).default(0.35),
    borderClamping: z.boolean().default(true),
    vignetteEnabled: z.boolean().default(true),
  }).default({}),

  graphics: z.object({
    quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
    shadows: z.boolean().default(true),
    postProcessing: z.boolean().default(true),
    maxFps: z.number().default(60),
    resolutionScale: z.number().min(0.5).max(2.0).default(1.0),
  }).default({}),

  audio: z.object({
    masterVolume: z.number().min(0).max(1).default(1.0),
    musicVolume: z.number().min(0).max(1).default(0.8),
    sfxVolume: z.number().min(0).max(1).default(1.0),
    ambienceVolume: z.number().min(0).max(1).default(0.6),
    uiVolume: z.number().min(0).max(1).default(1.0),
    muteWhenUnfocused: z.boolean().default(true),
  }).default({}),

  interface: z.object({
    showChat: z.boolean().default(true),
    chatTimestamps: z.boolean().default(false),
    uiScale: z.number().min(0.5).max(1.5).default(1.0),
    // HUD config like 'saints-hud-config-v1' is kept in hudSlice.ts for now, 
    // but we can put overarching interface settings here.
  }).default({}),

  gameplay: z.object({
    autoRun: z.boolean().default(false),
    showNames: z.boolean().default(true),
    damageNumbers: z.boolean().default(true),
  }).default({}),

  accessibility: z.object({
    colorblindMode: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']).default('none'),
    reduceMotion: z.boolean().default(false),
    highContrastText: z.boolean().default(false),
  }).default({}),
});

export type ClientSettings = z.infer<typeof ClientSettingsSchema>;

export const DEFAULT_CLIENT_SETTINGS: ClientSettings = {
  version: 1,
  controls: {
    mobileControlMode: 'floating',
    invertY: false,
    mouseSensitivity: 1.0,
    keybinds: {},
  },
  camera: {
    profile: 'dynamic',
    fov: 90,
    thirdPersonDistance: 6,
    cameraShake: true,
    smoothing: 0.35,
    borderClamping: true,
    vignetteEnabled: true,
  },
  graphics: {
    quality: 'high',
    shadows: true,
    postProcessing: true,
    maxFps: 60,
    resolutionScale: 1.0,
  },
  audio: {
    masterVolume: 1.0,
    musicVolume: 0.8,
    sfxVolume: 1.0,
    ambienceVolume: 0.6,
    uiVolume: 1.0,
    muteWhenUnfocused: true,
  },
  interface: {
    showChat: true,
    chatTimestamps: false,
    uiScale: 1.0,
  },
  gameplay: {
    autoRun: false,
    showNames: true,
    damageNumbers: true,
  },
  accessibility: {
    colorblindMode: 'none',
    reduceMotion: false,
    highContrastText: false,
  },
};
