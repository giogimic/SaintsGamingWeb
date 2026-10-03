import { z } from 'zod';

export const DEFAULT_HOTBAR_KEYBINDS = Object.fromEntries(
  Array.from({ length: 10 }, (_, index) => [`hotbar_${index + 1}`, String(index)]),
) as Record<string, string>;

export const DEFAULT_GAMEPLAY_KEYBINDS = {
  ...DEFAULT_HOTBAR_KEYBINDS,
  TOGGLE_CURSOR: 'Mouse1',
};

const keybindsSchema = z.preprocess(
  (value) => ({ ...DEFAULT_GAMEPLAY_KEYBINDS, ...(value && typeof value === 'object' ? value : {}) }),
  z.record(z.string()),
);

export const ClientSettingsSchema = z.object({
  version: z.literal(1),
  
  controls: z.object({
    mobileControlMode: z.enum(['floating', 'dpad']).default('floating'),
    invertY: z.boolean().default(false),
    mouseSensitivity: z.number().min(0.1).max(5.0).default(1.0),
    keyboardLookSensitivity: z.number().min(0.1).max(3.0).default(1.0),
    mouseLookEnabled: z.boolean().default(true),
    keybinds: keybindsSchema,
  }).default({}),

  camera: z.object({
    profile: z.preprocess(
      (profile) => profile === 'firstperson' ? 'firstperson' : 'follow45',
      z.enum(['firstperson', 'follow45']).default('follow45'),
    ),
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
    renderDistance: z.number().min(2).max(64).default(12),
    lodQuality: z.enum(['low', 'medium', 'high']).default('high'),
    backgroundMeshing: z.enum(['slow', 'balanced', 'fast']).default('balanced'),
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
    clickToMove: z.boolean().default(true),
    showNames: z.boolean().default(true),
    damageNumbers: z.boolean().default(true),
    showFloatingLoot: z.boolean().default(true),
    footstepDust: z.boolean().default(true),
    combatAutoTarget: z.boolean().default(true),
    autoAcceptFriendParty: z.boolean().default(false),
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
    keyboardLookSensitivity: 1.0,
    mouseLookEnabled: true,
    keybinds: DEFAULT_GAMEPLAY_KEYBINDS,
  },
  camera: {
    profile: 'follow45',
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
    renderDistance: 12,
    lodQuality: 'high',
    backgroundMeshing: 'balanced',
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
    clickToMove: true,
    showNames: true,
    damageNumbers: true,
    showFloatingLoot: true,
    footstepDust: true,
    combatAutoTarget: true,
    autoAcceptFriendParty: false,
  },
  accessibility: {
    colorblindMode: 'none',
    reduceMotion: false,
    highContrastText: false,
  },
};
