/**
 * Saints Gaming — Animation Profile Registry
 * 
 * Maps animation profile IDs (from Paragon retargeted-to-Manny packs) to
 * their available animation clips. Each profile folder mirrors the original
 * Paragon character's animation set, converted from FBX to GLB.
 * 
 * The engine loads individual .glb clip files on demand via:
 *   /animations/Paragon/{profileId}/{clipName}.glb
 * 
 * Standard action slots are mapped to the closest available clip name
 * in each profile. If a profile doesn't have a specific clip, the engine
 * falls back to a generic default.
 */

/** Standard animation action slots used by the Saints engine */
export type AnimationSlot =
  | 'idle'
  | 'idle_combat'
  | 'walk_fwd'
  | 'walk_bwd'
  | 'walk_left'
  | 'walk_right'
  | 'run_fwd'
  | 'run_bwd'
  | 'run_left'
  | 'run_right'
  | 'sprint'
  | 'jump_start'
  | 'jump_mid'
  | 'jump_end'
  | 'jump_fall'
  | 'jump_land'
  | 'death'
  | 'hit_react_front'
  | 'hit_react_back'
  | 'attack_light'
  | 'attack_heavy'
  | 'cast'
  | 'stun'
  | 'emote'
  | 'recall'
  | 'select_screen'
  | 'level_start'
  | 'bound';

export interface AnimationClipMapping {
  /** The .glb filename (without extension) relative to the profile folder */
  clip: string;
  /** Whether this clip should loop */
  loop: boolean;
  /** Playback speed multiplier (1.0 = normal) */
  speed?: number;
}

export interface AnimationProfile {
  id: string;
  displayName: string;
  /** Base URL path prefix: /animations/Paragon/{id}/ */
  basePath: string;
  /** Maps standard engine action slots to specific clip files in this profile */
  slotMap: Partial<Record<AnimationSlot, AnimationClipMapping>>;
  /** All raw clip names available in this profile (for Studio browsing) */
  availableClips: string[];
}

/**
 * Standard slot mapping patterns shared across most Paragon profiles.
 * Individual profiles override specific slots where clip names differ.
 */
const COMMON_SLOT_MAP: Partial<Record<AnimationSlot, AnimationClipMapping>> = {
  idle:            { clip: 'Idle', loop: true },
  idle_combat:     { clip: 'Idle_Combat', loop: true },
  run_fwd:         { clip: 'Run_Fwd', loop: true },
  run_bwd:         { clip: 'Run_Bwd', loop: true },
  run_left:        { clip: 'Run_Left', loop: true },
  run_right:       { clip: 'Run_Right', loop: true },
  jump_start:      { clip: 'Jump_Start', loop: false },
  jump_mid:        { clip: 'Jump_Mid', loop: false },
  jump_end:        { clip: 'Jump_End', loop: false },
  jump_fall:       { clip: 'Jump_Fall_Loop', loop: true },
  jump_land:       { clip: 'Jump_InPlace_Land', loop: false },
  death:           { clip: 'Death', loop: false },
  hit_react_front: { clip: 'HitReact_Front', loop: false },
  hit_react_back:  { clip: 'HitReact_Back', loop: false },
  cast:            { clip: 'Cast', loop: false },
  stun:            { clip: 'Stun_Idle', loop: true },
  recall:          { clip: 'Recall', loop: false },
  bound:           { clip: 'Bound', loop: false },
  level_start:     { clip: 'LevelStart', loop: false },
};

/**
 * All registered animation profiles.
 * Each profile corresponds to a Paragon hero animation set retargeted to the Manny skeleton.
 */
export const ANIMATION_PROFILES: AnimationProfile[] = [
  {
    id: 'AuroraManny',
    displayName: 'Aurora',
    basePath: '/animations/Paragon/AuroraManny/',
    slotMap: {
      ...COMMON_SLOT_MAP,
      idle:        { clip: 'Idle', loop: true },
      death:       { clip: 'Death', loop: false },
      stun:        { clip: 'Stun_Loop', loop: true },
      level_start: { clip: 'Level_Start', loop: false },
      select_screen: { clip: 'Select_Screen', loop: false },
    },
    availableClips: [
      'Idle', 'Idle_Noise_A', 'Idle_Noise_B', 'Idle_Straight',
      'Bound', 'Cast', 'Death', 'FrontEndPose',
      'Level_Start', 'Recall', 'Select_Screen',
      'Stun_Loop', 'Stun_Start',
    ],
  },
  {
    id: 'BelicaManny',
    displayName: 'Belica',
    basePath: '/animations/Paragon/BelicaManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'CountessManny',
    displayName: 'Countess',
    basePath: '/animations/Paragon/CountessManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'CrunchManny',
    displayName: 'Crunch',
    basePath: '/animations/Paragon/CrunchManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'DekkerManny',
    displayName: 'Dekker',
    basePath: '/animations/Paragon/DekkerManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'DrongoManny',
    displayName: 'Drongo',
    basePath: '/animations/Paragon/DrongoManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'FengMaoManny',
    displayName: 'Feng Mao',
    basePath: '/animations/Paragon/FengMaoManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'FeyManny',
    displayName: 'The Fey',
    basePath: '/animations/Paragon/FeyManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'GreystoneManny',
    displayName: 'Greystone',
    basePath: '/animations/Paragon/GreystoneManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'GruxManny',
    displayName: 'Grux',
    basePath: '/animations/Paragon/GruxManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'KallariManny',
    displayName: 'Kallari',
    basePath: '/animations/Paragon/KallariManny/',
    slotMap: {
      ...COMMON_SLOT_MAP,
      idle:        { clip: 'Idle_Combat', loop: true },
      idle_combat: { clip: 'Idle_Combat', loop: true },
      run_fwd:     { clip: 'Run_Fwd', loop: true },
      run_bwd:     { clip: 'Run_Bwd', loop: true },
      run_left:    { clip: 'Run_Left', loop: true },
      run_right:   { clip: 'Run_Right', loop: true },
      walk_fwd:    { clip: 'WalkSneaky_Fwd', loop: true },
      walk_bwd:    { clip: 'WalkSneaky_Bwd', loop: true },
      walk_left:   { clip: 'WalkSneaky_Left', loop: true },
      walk_right:  { clip: 'WalkSneaky_Right', loop: true },
      death:       { clip: 'Death_A', loop: false },
    },
    availableClips: [
      'Idle_Combat', 'Idle_Combat_NonAdditive', 'Idle_Combat_Static',
      'Idle_TravelMode', 'Idle_TravelMode_Static',
      'Run_Fwd', 'Run_Bwd', 'Run_Left', 'Run_Right', 'Run_Combat',
      'WalkSneaky_Fwd', 'WalkSneaky_Bwd', 'WalkSneaky_Left', 'WalkSneaky_Right',
      'Jump_Start', 'Jump_Mid', 'Jump_End', 'Jump_Fall_Loop',
      'Jump_InPlace_Apex', 'Jump_InPlace_FallLoop', 'Jump_InPlace_Land',
      'Jump_InPlace_Recover', 'Jump_InPlace_Start',
      'Death_A', 'Death_B', 'HitReact_Front', 'HitReact_Back',
      'HitReact_Left', 'HitReact_Right',
      'Cast', 'Stun_Idle', 'Bound', 'Recall', 'LevelStart',
      'SelectScreen_Loop', 'SelectScreen_Start', 'SelectScreen_Emote',
      'Victory_Emote', 'MeleeFail',
    ],
  },
  {
    id: 'KhaimeraManny',
    displayName: 'Khaimera',
    basePath: '/animations/Paragon/KhaimeraManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'KwangManny',
    displayName: 'Kwang',
    basePath: '/animations/Paragon/KwangManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'MurdockManny',
    displayName: 'Murdock',
    basePath: '/animations/Paragon/MurdockManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'MurielManny',
    displayName: 'Muriel',
    basePath: '/animations/Paragon/MurielManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'NarbashManny',
    displayName: 'Narbash',
    basePath: '/animations/Paragon/NarbashManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'PhaseManny',
    displayName: 'Phase',
    basePath: '/animations/Paragon/PhaseManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'RevenantManny',
    displayName: 'Revenant',
    basePath: '/animations/Paragon/RevenantManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'RiktorManny',
    displayName: 'Riktor',
    basePath: '/animations/Paragon/RiktorManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'SerathManny',
    displayName: 'Serath',
    basePath: '/animations/Paragon/SerathManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'SparrowManny',
    displayName: 'Sparrow',
    basePath: '/animations/Paragon/SparrowManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'TwinBlastManny',
    displayName: 'TwinBlast',
    basePath: '/animations/Paragon/TwinBlastManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'WraithManny',
    displayName: 'Wraith',
    basePath: '/animations/Paragon/WraithManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'YinManny',
    displayName: 'Yin',
    basePath: '/animations/Paragon/YinManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'ZinxManny',
    displayName: 'Zinx',
    basePath: '/animations/Paragon/ZinxManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'gadgetManny',
    displayName: 'Gadget',
    basePath: '/animations/Paragon/gadgetManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'gideonManny',
    displayName: 'Gideon',
    basePath: '/animations/Paragon/gideonManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'minionsManny',
    displayName: 'Minions',
    basePath: '/animations/Paragon/minionsManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'morigoshManny',
    displayName: 'Morigesh',
    basePath: '/animations/Paragon/morigoshManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'steelmanny',
    displayName: 'Steel',
    basePath: '/animations/Paragon/steelmanny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'terramanny',
    displayName: 'Terra',
    basePath: '/animations/Paragon/terramanny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
  {
    id: 'wukongManny',
    displayName: 'Wukong',
    basePath: '/animations/Paragon/wukongManny/',
    slotMap: { ...COMMON_SLOT_MAP },
    availableClips: [],
  },
];

/** Look up a profile by its ID */
export function getAnimationProfile(profileId: string): AnimationProfile | undefined {
  return ANIMATION_PROFILES.find(p => p.id === profileId);
}

/** Resolve the full URL for a specific animation slot in a profile */
export function resolveAnimationUrl(profileId: string, slot: AnimationSlot): string | null {
  const profile = getAnimationProfile(profileId);
  if (!profile) return null;
  const mapping = profile.slotMap[slot];
  if (!mapping) return null;
  return `${profile.basePath}${mapping.clip}.glb`;
}

/** Get all available slot URLs for a profile (for preloading) */
export function getProfileSlotUrls(profileId: string): Record<string, string> {
  const profile = getAnimationProfile(profileId);
  if (!profile) return {};
  const urls: Record<string, string> = {};
  for (const [slot, mapping] of Object.entries(profile.slotMap)) {
    if (mapping) {
      urls[slot] = `${profile.basePath}${mapping.clip}.glb`;
    }
  }
  return urls;
}
