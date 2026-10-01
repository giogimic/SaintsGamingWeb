/**
 * Saints Gaming — 3D Model Rig Taxonomy & Animation Requirements Engine
 *
 * Automatically inspects 3D model skeletons and animation tracks to:
 * 1. Classify model rig families (Humanoid, Quadruped Beast, Winged Flyer, Serpentine, Elemental, Prop).
 * 2. Analyze which model types an animation clip is compatible with.
 * 3. Extract exact bone requirements and motion characteristics (e.g., root motion vs in-place).
 * 4. Categorize animation actions and map them accurately to canonical engine slots.
 */

import type { AnimationSlot } from './animationProfiles';

export type ModelRigFamily =
  | 'HUMANOID_BIPED'
  | 'QUADRUPED_BEAST'
  | 'WINGED_FLYER'
  | 'SERPENTINE'
  | 'FLOATING_ELEMENTAL'
  | 'MECHANICAL_PROP'
  | 'GENERIC';

export interface RigFamilyDefinition {
  family: ModelRigFamily;
  label: string;
  description: string;
  essentialBones: string[];
  recommendedBones: string[];
}

export const RIG_FAMILIES: Record<ModelRigFamily, RigFamilyDefinition> = {
  HUMANOID_BIPED: {
    family: 'HUMANOID_BIPED',
    label: 'Humanoid (Biped)',
    description: 'Two-legged characters, NPCs, player heroes, skeletons, and bipedal monsters.',
    essentialBones: ['Hips', 'Spine', 'Head', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'],
    recommendedBones: ['Chest', 'Neck', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'],
  },
  QUADRUPED_BEAST: {
    family: 'QUADRUPED_BEAST',
    label: 'Quadruped (Beast / Mount)',
    description: 'Four-legged creatures, wolves, mounts, dogs, cats, horses, and beasts.',
    essentialBones: ['Hips', 'Spine', 'Head', 'FrontLeg_L', 'FrontLeg_R', 'HindLeg_L', 'HindLeg_R'],
    recommendedBones: ['Neck', 'Tail', 'Jaw', 'FrontFoot_L', 'FrontFoot_R', 'HindFoot_L', 'HindFoot_R'],
  },
  WINGED_FLYER: {
    family: 'WINGED_FLYER',
    label: 'Winged Flyer (Dragon / Bird)',
    description: 'Flying creatures, dragons, birds, bats, and winged familiars.',
    essentialBones: ['Spine', 'Head', 'Wing_L', 'Wing_R'],
    recommendedBones: ['WingMid_L', 'WingMid_R', 'WingTip_L', 'WingTip_R', 'Tail', 'Leg_L', 'Leg_R'],
  },
  SERPENTINE: {
    family: 'SERPENTINE',
    label: 'Serpentine (Snake / Worm)',
    description: 'Legless segmented creatures, snakes, sea serpents, and worms.',
    essentialBones: ['Head', 'Body_01', 'Body_02', 'Body_03'],
    recommendedBones: ['Tail_01', 'Jaw', 'Tongue'],
  },
  FLOATING_ELEMENTAL: {
    family: 'FLOATING_ELEMENTAL',
    label: 'Floating / Elemental',
    description: 'Legless floating spirits, ghosts, elemental wisps, and floating orbs.',
    essentialBones: ['Root', 'Spine'],
    recommendedBones: ['Head', 'Arm_L', 'Arm_R', 'Tail'],
  },
  MECHANICAL_PROP: {
    family: 'MECHANICAL_PROP',
    label: 'Mechanical / Prop',
    description: 'Animated objects, doors, chests, levers, turrets, and rigid structures.',
    essentialBones: ['Root'],
    recommendedBones: ['Hinge', 'Lid', 'Wheel', 'Base'],
  },
  GENERIC: {
    family: 'GENERIC',
    label: 'Generic / Custom Rig',
    description: 'Custom skeletal rig or unclassified bone hierarchy.',
    essentialBones: [],
    recommendedBones: [],
  },
};

/**
 * Standard bone alias matchers matching Mixamo, Unreal Engine (Manny/Quinn),
 * Unity Humanoid, 3ds Max / Bip01, VRoid, and Blender Rigify naming schemes.
 */
const BONE_ALIAS_PATTERNS: Record<string, RegExp[]> = {
  Root: [
    /(^|_|:)root(_|$)/i,
    /(^|_|:)armature(_|$)/i,
  ],
  // Humanoid
  Hips: [
    /(^|_|:)hips(_|$)/i,
    /(^|_|:)pelvis(_|$)/i,
    /bip0[0-9].*pelvis/i,
    /root.*pelvis/i,
    /j_bip_c_hips/i,
    /def[-_]spine/i,
  ],
  Spine: [
    /(^|_|:)spine(_|$)/i,
    /(^|_|:)spine[0-9]?(_|$)/i,
    /(^|_|:)abdomen(lower|upper)?(_|$)/i,
    /bip0[0-9].*spine/i,
    /j_bip_c_spine/i,
    /def[-_]spine001/i,
  ],
  Chest: [
    /(^|_|:)chest(_|$)/i,
    /(^|_|:)chest(lower|upper)?(_|$)/i,
    /(^|_|:)spine2(_|$)/i,
    /(^|_|:)spine3(_|$)/i,
    /j_bip_c_chest/i,
    /bip0[0-9].*spine2/i,
  ],
  Neck: [
    /(^|_|:)neck(lower|upper)?(_|$)/i,
    /bip0[0-9].*neck/i,
    /j_bip_c_neck/i,
    /def[-_]neck/i,
  ],
  Head: [
    /(^|_|:)head(_|$)/i,
    /bip0[0-9].*head/i,
    /j_bip_c_head/i,
    /def[-_]head/i,
  ],
  LeftArm: [
    /(^|_|:)(left|l)_?(arm|upperarm|shoulder|up_?arm)(_|$)/i,
    /(^|_|:)l_?shldr(bend|twist)?(_|$)/i,
    /upperarm_l/i,
    /arm_l/i,
    /bip0[0-9].*l.*upperarm/i,
    /j_bip_l_upperarm/i,
    /def[-_]upper_arm[-_]l/i,
  ],
  RightArm: [
    /(^|_|:)(right|r)_?(arm|upperarm|shoulder|up_?arm)(_|$)/i,
    /(^|_|:)r_?shldr(bend|twist)?(_|$)/i,
    /upperarm_r/i,
    /arm_r/i,
    /bip0[0-9].*r.*upperarm/i,
    /j_bip_r_upperarm/i,
    /def[-_]upper_arm[-_]r/i,
  ],
  LeftHand: [
    /(^|_|:)(left|l)_?hand(_|$)/i,
    /hand_l/i,
    /bip0[0-9].*l.*hand/i,
    /j_bip_l_hand/i,
    /def[-_]hand[-_]l/i,
  ],
  RightHand: [
    /(^|_|:)(right|r)_?hand(_|$)/i,
    /hand_r/i,
    /bip0[0-9].*r.*hand/i,
    /j_bip_r_hand/i,
    /def[-_]hand[-_]r/i,
  ],
  LeftLeg: [
    /(^|_|:)(left|l)_?(leg|upleg|thigh|up_?leg)(_|$)/i,
    /(^|_|:)l_?thigh(bend|twist)?(_|$)/i,
    /thigh_l/i,
    /upleg_l/i,
    /bip0[0-9].*l.*thigh/i,
    /j_bip_l_upperleg/i,
    /def[-_]thigh[-_]l/i,
  ],
  RightLeg: [
    /(^|_|:)(right|r)_?(leg|upleg|thigh|up_?leg)(_|$)/i,
    /(^|_|:)r_?thigh(bend|twist)?(_|$)/i,
    /thigh_r/i,
    /upleg_r/i,
    /bip0[0-9].*r.*thigh/i,
    /j_bip_r_upperleg/i,
    /def[-_]thigh[-_]r/i,
  ],
  LeftFoot: [
    /(^|_|:)(left|l)_?foot(_|$)/i,
    /foot_l/i,
    /bip0[0-9].*l.*foot/i,
    /j_bip_l_foot/i,
    /def[-_]foot[-_]l/i,
  ],
  RightFoot: [
    /(^|_|:)(right|r)_?foot(_|$)/i,
    /foot_r/i,
    /bip0[0-9].*r.*foot/i,
    /j_bip_r_foot/i,
    /def[-_]foot[-_]r/i,
  ],

  // Quadruped & Beast specific
  FrontLeg_L: [
    /front.*(leg|foot|paw|hoof).*l/i,
    /(l|left).*front.*(leg|paw|shoulder)/i,
    /foreleg.*l/i,
    /arm.*l/i,
  ],
  FrontLeg_R: [
    /front.*(leg|foot|paw|hoof).*r/i,
    /(r|right).*front.*(leg|paw|shoulder)/i,
    /foreleg.*r/i,
    /arm.*r/i,
  ],
  HindLeg_L: [
    /hind.*(leg|foot|paw|hoof).*l/i,
    /back.*(leg|foot|paw|hoof).*l/i,
    /(l|left).*hind.*(leg|paw)/i,
    /leg.*l/i,
    /thigh.*l/i,
  ],
  HindLeg_R: [
    /hind.*(leg|foot|paw|hoof).*r/i,
    /back.*(leg|foot|paw|hoof).*r/i,
    /(r|right).*hind.*(leg|paw)/i,
    /leg.*r/i,
    /thigh.*r/i,
  ],
  Tail: [
    /(^|_|:)tail/i,
    /bip0[0-9].*tail/i,
    /tail_[0-9]+/i,
  ],

  // Winged
  Wing_L: [
    /(^|_|:)(left|l)_?wing/i,
    /wing.*(l|left)/i,
    /wing_01_l/i,
  ],
  Wing_R: [
    /(^|_|:)(right|r)_?wing/i,
    /wing.*(r|right)/i,
    /wing_01_r/i,
  ],
};

/** Standardized map labels shared by rig detection and the model skeleton editor. */
export const STANDARD_BONE_NAMES = Object.keys(BONE_ALIAS_PATTERNS);

/**
 * Animation track targets can be plain node names, namespaced Mixamo names,
 * or paths such as `Armature.bones[Hips]`. Reduce them to useful candidates
 * before comparing aliases so equivalent rigs do not fail on naming prefixes.
 */
function getBoneNameCandidates(name: string): string[] {
  const candidates = new Set<string>();
  const trimmed = name.trim();
  if (!trimmed) return [];

  const bracketTarget = trimmed.match(/(?:bones|skeleton)\[([^\]]+)\]/i)?.[1];
  const propertyStripped = trimmed.replace(/\.(?:position|quaternion|rotation|scale)$/i, '');
  const leaf = (bracketTarget || propertyStripped).split(/[|/]/).at(-1)?.trim() || '';
  if (leaf) {
    candidates.add(leaf);
    candidates.add(
      leaf
        .replace(/^(?:mixamorig|mixamo|armature|skeleton|rig)[_.:| -]*/i, '')
        .replace(/^mixamorig(?=[A-Z])/i, ''),
    );
  }
  return [...candidates].filter(Boolean);
}

function getBoneAliases(name: string): string[] {
  const candidates = getBoneNameCandidates(name);
  return Object.entries(BONE_ALIAS_PATTERNS)
    .filter(([, patterns]) => candidates.some((candidate) => patterns.some((pattern) => pattern.test(candidate))))
    .map(([alias]) => alias);
}

export interface RigAnalysisResult {
  family: ModelRigFamily;
  label: string;
  description: string;
  confidence: number;
  totalBones: number;
  detectedStandardBones: Record<string, string>;
  missingEssentialBones: string[];
  hasTail: boolean;
  hasWings: boolean;
  isHumanoid: boolean;
  isQuadruped: boolean;
  isFlyer: boolean;
}

/**
 * Analyzes a list of bone names from a 3D model skeleton and classifies its rig family.
 */
export function classifySkeletonRig(boneNames: string[] = []): RigAnalysisResult {
  if (!boneNames || boneNames.length === 0) {
    return {
      family: 'MECHANICAL_PROP',
      label: RIG_FAMILIES.MECHANICAL_PROP.label,
      description: 'Static mesh or non-skeletal prop.',
      confidence: 1.0,
      totalBones: 0,
      detectedStandardBones: {},
      missingEssentialBones: [],
      hasTail: false,
      hasWings: false,
      isHumanoid: false,
      isQuadruped: false,
      isFlyer: false,
    };
  }

  const detectedStandardBones: Record<string, string> = {};

  // Map each standard bone alias to a matching bone in the model
  for (const [standardBone, patterns] of Object.entries(BONE_ALIAS_PATTERNS)) {
    for (const boneName of boneNames) {
      if (getBoneNameCandidates(boneName).some((candidate) => patterns.some((pattern) => pattern.test(candidate)))) {
        detectedStandardBones[standardBone] = boneName;
        break;
      }
    }
  }

  const hasTail = Boolean(detectedStandardBones.Tail || boneNames.some((b) => /tail/i.test(b)));
  const hasWings = Boolean((detectedStandardBones.Wing_L && detectedStandardBones.Wing_R) || boneNames.some((b) => /wing/i.test(b)));

  // Count matches for Humanoid essential bones
  const humanoidEssentials = RIG_FAMILIES.HUMANOID_BIPED.essentialBones;
  const humanoidMatched = humanoidEssentials.filter((b) => Boolean(detectedStandardBones[b]));
  const humanoidRatio = humanoidMatched.length / humanoidEssentials.length;

  // Check for quadruped indicators
  const isQuadrupedBonesPresent =
    Boolean(detectedStandardBones.FrontLeg_L && detectedStandardBones.FrontLeg_R) &&
    Boolean(detectedStandardBones.HindLeg_L && detectedStandardBones.HindLeg_R);

  const hasQuadrupedNames = boneNames.some((b) => /foreleg|hindleg|paw|quadruped|hoof/i.test(b));

  let family: ModelRigFamily = 'GENERIC';
  let confidence = 0.5;

  if (hasWings && (boneNames.some((b) => /dragon|bird|bat|fly/i.test(b)) || !humanoidMatched.includes('LeftArm'))) {
    family = 'WINGED_FLYER';
    confidence = 0.85;
  } else if ((isQuadrupedBonesPresent && hasTail) || (hasQuadrupedNames && hasTail)) {
    family = 'QUADRUPED_BEAST';
    confidence = 0.9;
  } else if (humanoidRatio >= 0.7) {
    family = 'HUMANOID_BIPED';
    confidence = humanoidRatio;
  } else if (boneNames.length >= 4 && boneNames.filter((b) => /body|segment|spine|tail/i.test(b)).length >= boneNames.length * 0.6) {
    family = 'SERPENTINE';
    confidence = 0.8;
  } else if (boneNames.length <= 4 && !humanoidMatched.includes('LeftLeg')) {
    family = 'FLOATING_ELEMENTAL';
    confidence = 0.7;
  } else if (humanoidRatio >= 0.4) {
    family = 'HUMANOID_BIPED';
    confidence = humanoidRatio;
  }

  const def = RIG_FAMILIES[family];
  const missingEssentialBones = def.essentialBones.filter((b) => !detectedStandardBones[b]);

  return {
    family,
    label: def.label,
    description: def.description,
    confidence,
    totalBones: boneNames.length,
    detectedStandardBones,
    missingEssentialBones,
    hasTail,
    hasWings,
    isHumanoid: family === 'HUMANOID_BIPED',
    isQuadruped: family === 'QUADRUPED_BEAST',
    isFlyer: family === 'WINGED_FLYER',
  };
}

export interface AnimationTrackInfo {
  name: string;
}

export interface CategorizedAnimationClip {
  clipName: string;
  duration: number;
  trackCount: number;
  targetRigFamily: ModelRigFamily;
  targetRigLabel: string;
  requiredBones: string[];
  animatedBoneNames: string[];
  isRootMotion: boolean;
  category: 'Locomotion' | 'Combat' | 'Reactions' | 'Emotes' | 'Jump' | 'Special';
  suggestedSlots: AnimationSlot[];
  requirementsSummary: string;
  compatibilityWithModel?: {
    score: number; // 0 - 100%
    isCompatible: boolean;
    missingBones: string[];
  };
}

/**
 * Extracts animated bone names from Three.js track names (e.g. "mixamorig:Hips.quaternion" -> "mixamorig:Hips")
 */
export function extractBoneNamesFromTracks(trackNames: string[] = []): string[] {
  const bones = new Set<string>();
  for (const track of trackNames) {
    const bracketTarget = track.match(/(?:bones|skeleton)\[([^\]]+)\]/i)?.[1];
    const dotIdx = track.indexOf('.');
    const rawBone = bracketTarget || (dotIdx > 0 ? track.substring(0, dotIdx) : track);
    if (rawBone) bones.add(rawBone);
  }
  return Array.from(bones);
}

/**
 * Common regex tester for animation files based on naming conventions across
 * Unreal, Mixamo, Fab, Unity, and custom DCC packages.
 */
export function isAnimationFileName(fileName: string): boolean {
  return /anim|walk|run|idle|jump|turn|jog|mocap|atk|attack|die|death|hit|react|claw|bite|cast|roar|crouch|stand|bound|deflect|cardcast|ability|recovery|targeting|dodge|roll|stumble|sprint/i.test(fileName);
}

/**
 * Enhanced heuristic for inferring semantic engine animation slots from clip name,
 * companion filename, and animated tracks.
 */
export function inferExpandedAnimationSlots(
  clipName: string,
  fileName?: string,
  isSingleClipOnActor?: boolean
): AnimationSlot[] {
  const combined = `${clipName} ${fileName || ''}`
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

  const slots = new Set<AnimationSlot>();
  const has = (pattern: RegExp) => pattern.test(combined);

  const direction = has(/(^|_)(back|backward|bwd|reverse)(_|$)/)
    ? 'bwd'
    : has(/(^|_)(left|l)(_|$)/)
      ? 'left'
      : has(/(^|_)(right|r)(_|$)/)
        ? 'right'
        : 'fwd';

  // Locomotion
  if (has(/(^|_)idle(_|$)/) || has(/stand/)) {
    slots.add(has(/combat|battle|weapon/) ? 'idle_combat' : 'idle');
  }
  if (has(/(^|_)walk|walking|trot|crawl/)) {
    slots.add(`walk_${direction}` as AnimationSlot);
  }
  if (has(/(^|_)run|running|jog|gallop|chase/)) {
    slots.add(`run_${direction}` as AnimationSlot);
  }
  if (has(/(^|_)sprint|dash|rush/)) {
    slots.add('sprint');
  }
  if (has(/crouch/)) {
    if (has(/walk|move/)) slots.add('crouch_walk');
    else slots.add('crouch_idle');
  }

  // Jump / Aerial / Bound
  if (has(/(^|_)bound(_|$)/)) {
    slots.add('bound');
  }
  if (has(/(^|_)jump|leap/)) {
    if (has(/start|takeoff|begin/)) slots.add('jump_start');
    else if (has(/land|impact/)) slots.add('jump_land');
    else if (has(/fall|glide/)) slots.add('jump_fall');
    else if (has(/mid|loop|apex/)) slots.add('jump_mid');
    else if (has(/end|recover/)) slots.add('jump_end');
    else slots.add('jump_start');
  }

  // Combat (Humanoid + Creature/Monster abilities)
  if (has(/(^|_)(attack|atk|strike|slash|punch|kick|hit_enemy|bite|claw|tail_whip|pounce|horn|sting|deflect|block|parry)(_|$)/)) {
    if (has(/heavy|strong|combo|slam|special|ult/)) {
      slots.add('attack_heavy');
    } else {
      slots.add('attack_light');
    }
  }
  if (has(/cast|magic|spell|shoot|fire|breath|roar|howl|channel|ability|cardcast|targeting/)) {
    slots.add('cast');
  }

  // Reactions
  if (has(/(^|_)(death|die|dead|faint|collapse)(_|$)/)) {
    slots.add('death');
  }
  if (has(/hit.?react|hurt|damage|take_hit|impact|stumble/)) {
    slots.add(has(/back|rear|bwd/) ? 'hit_react_back' : 'hit_react_front');
  }
  if (has(/stun|daze|freeze|sleep|sleep_idle/)) {
    slots.add('stun');
  }

  // Emotes & Social
  if (has(/emote|dance|taunt|wave|bow|cheer|laugh|flex|roar/)) {
    slots.add('emote');
  }
  if (has(/recall|teleport|tp/)) {
    slots.add('recall');
  }
  if (has(/select|hero_select|menu/)) {
    slots.add('select_screen');
  }
  if (has(/level_start|spawn|intro/)) {
    slots.add('level_start');
  }

  // If this was the only animation embedded in the file and nothing matched, default to idle
  if (slots.size === 0 && isSingleClipOnActor) {
    slots.add('idle');
  }

  return Array.from(slots);
}

/**
 * Categorizes an animation clip and determines its target model type and bone requirements.
 */
export function analyzeAnimationClip(
  clip: {
    name: string;
    duration: number;
    tracks?: Array<{ name: string }> | string[];
  },
  options?: {
    fileName?: string;
    modelBoneNames?: string[];
    isSingleClipOnActor?: boolean;
  }
): CategorizedAnimationClip {
  const clipName = clip.name || 'Unnamed Animation';
  const duration = Number.isFinite(clip.duration) ? Math.max(0, clip.duration) : 0;

  // Extract track names
  const rawTracks = clip.tracks || [];
  const trackNames = rawTracks.map((t) => (typeof t === 'string' ? t : t.name || ''));
  const animatedBoneNames = extractBoneNamesFromTracks(trackNames);
  const trackCount = trackNames.length;

  // Check for root motion (position tracks on Root/Hips/Pelvis)
  const isRootMotion = trackNames.some((t) =>
    /\.(position|pos)$/i.test(t) && /(^|_|:)(root|hips|pelvis)(_|\.)/i.test(t)
  );

  // Classify rig family target for this animation
  const skeletonAnalysis = classifySkeletonRig(animatedBoneNames);
  const targetRigFamily = skeletonAnalysis.family;
  const targetRigLabel = skeletonAnalysis.label;

  // Key required bones: essential bones found in this animation's tracks
  const requiredBones = Object.keys(skeletonAnalysis.detectedStandardBones);

  // Infer semantic slots
  const suggestedSlots = inferExpandedAnimationSlots(
    clipName,
    options?.fileName,
    options?.isSingleClipOnActor
  );

  // Assign functional category
  let category: CategorizedAnimationClip['category'] = 'Special';
  if (suggestedSlots.some((s) => s.startsWith('walk') || s.startsWith('run') || s === 'idle' || s === 'idle_combat' || s === 'sprint')) {
    category = 'Locomotion';
  } else if (suggestedSlots.some((s) => s.startsWith('attack') || s === 'cast')) {
    category = 'Combat';
  } else if (suggestedSlots.some((s) => s.startsWith('hit_react') || s === 'death' || s === 'stun')) {
    category = 'Reactions';
  } else if (suggestedSlots.some((s) => s.startsWith('jump'))) {
    category = 'Jump';
  } else if (suggestedSlots.some((s) => s === 'emote' || s === 'select_screen' || s === 'recall')) {
    category = 'Emotes';
  }

  // Human-readable requirements summary
  let requirementsSummary = `Requires ${targetRigLabel}`;
  if (requiredBones.length > 0) {
    const keyBones = requiredBones.slice(0, 4).join(', ');
    requirementsSummary += ` (${keyBones}${requiredBones.length > 4 ? ` +${requiredBones.length - 4} more` : ''})`;
  }
  if (isRootMotion) {
    requirementsSummary += ' [Root Motion]';
  }

  // Compute model compatibility if model's skeleton is provided
  let compatibilityWithModel: CategorizedAnimationClip['compatibilityWithModel'] = undefined;
  if (options?.modelBoneNames && options.modelBoneNames.length > 0) {
    const modelBoneNames = new Set(
      options.modelBoneNames.flatMap((bone) => getBoneNameCandidates(bone).map((candidate) => candidate.toLowerCase())),
    );
    const modelAliases = new Set(options.modelBoneNames.flatMap(getBoneAliases));
    const missing: string[] = [];
    const hasRecognizedAnimationBones = animatedBoneNames.some((bone) => getBoneAliases(bone).length > 0);
    let evaluatedCount = 0;
    let matchedCount = 0;

    for (const animBone of animatedBoneNames) {
      const exactMatch = getBoneNameCandidates(animBone).some((candidate) => modelBoneNames.has(candidate.toLowerCase()));
      const animationAliases = getBoneAliases(animBone);
      const aliasMatch = animationAliases.some((alias) => modelAliases.has(alias));
      const isRecognizedBone = animationAliases.length > 0 || exactMatch;

      if (!hasRecognizedAnimationBones || isRecognizedBone) evaluatedCount++;
      if (exactMatch || aliasMatch) matchedCount++;
      if (!exactMatch && !aliasMatch) {
        missing.push(animBone);
      }
    }

    const score = evaluatedCount > 0
      ? Math.round((matchedCount / evaluatedCount) * 100)
      : 100;

    compatibilityWithModel = {
      score,
      isCompatible: score >= 70, // 70%+ bone match is considered playable
      missingBones: missing,
    };
  }

  return {
    clipName,
    duration,
    trackCount,
    targetRigFamily,
    targetRigLabel,
    requiredBones,
    animatedBoneNames,
    isRootMotion,
    category,
    suggestedSlots,
    requirementsSummary,
    compatibilityWithModel,
  };
}
