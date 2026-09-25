import { ANIMATION_PROFILES } from './animationProfiles';
import type { AnimationProfile, AnimationSlot } from './animationProfiles';

export const ANIMATION_ACTIONS: ReadonlyArray<{ key: AnimationSlot; label: string; group: string }> = [
  { key: 'idle', label: 'Idle', group: 'Locomotion' },
  { key: 'idle_combat', label: 'Combat Idle', group: 'Locomotion' },
  { key: 'walk_fwd', label: 'Walk Forward', group: 'Locomotion' },
  { key: 'walk_bwd', label: 'Walk Backward', group: 'Locomotion' },
  { key: 'walk_left', label: 'Walk Left', group: 'Locomotion' },
  { key: 'walk_right', label: 'Walk Right', group: 'Locomotion' },
  { key: 'run_fwd', label: 'Run Forward', group: 'Locomotion' },
  { key: 'run_bwd', label: 'Run Backward', group: 'Locomotion' },
  { key: 'run_left', label: 'Run Left', group: 'Locomotion' },
  { key: 'run_right', label: 'Run Right', group: 'Locomotion' },
  { key: 'sprint', label: 'Sprint', group: 'Locomotion' },
  { key: 'jump_start', label: 'Jump Start', group: 'Jump' },
  { key: 'jump_mid', label: 'Jump Midair', group: 'Jump' },
  { key: 'jump_end', label: 'Jump End', group: 'Jump' },
  { key: 'jump_fall', label: 'Fall', group: 'Jump' },
  { key: 'jump_land', label: 'Land', group: 'Jump' },
  { key: 'attack_light', label: 'Light Attack', group: 'Combat' },
  { key: 'attack_heavy', label: 'Heavy Attack', group: 'Combat' },
  { key: 'hit_react_front', label: 'Hit React: Front', group: 'Combat' },
  { key: 'hit_react_back', label: 'Hit React: Back', group: 'Combat' },
  { key: 'cast', label: 'Cast', group: 'Combat' },
  { key: 'stun', label: 'Stun', group: 'Combat' },
  { key: 'death', label: 'Death', group: 'Reactions' },
  { key: 'emote', label: 'Emote', group: 'Reactions' },
  { key: 'recall', label: 'Recall', group: 'Reactions' },
  { key: 'select_screen', label: 'Select Screen', group: 'Reactions' },
  { key: 'level_start', label: 'Level Start', group: 'Reactions' },
  { key: 'bound', label: 'Bound', group: 'Reactions' },
];

export interface AnimationClipChoice {
  id: string;
  clip: string;
  sourceKind: 'embedded' | 'animation-set';
  sourceId: string;
  sourceLabel: string;
  sourcePath?: string;
  rigFamily: string;
  slots: AnimationSlot[];
  loop?: boolean;
  speed?: number;
  duration?: number;
}

/** Make a stable selection key for a clip embedded in the currently uploaded model. */
export function embeddedAnimationChoiceId(clip: string): string {
  return `embedded:${encodeURIComponent(clip)}`;
}

/** Make a stable selection key for a clip referenced by a reusable animation set. */
export function animationSetChoiceId(profileId: string, clip: string): string {
  return `set:${encodeURIComponent(profileId)}:${encodeURIComponent(clip)}`;
}

/** Suggest semantic actions from common clip filename conventions. */
export function inferAnimationSlots(clipName: string): AnimationSlot[] {
  const name = clipName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  const slots = new Set<AnimationSlot>();
  const has = (pattern: RegExp) => pattern.test(name);
  const direction = has(/(^|_)(back|backward|bwd|reverse)(_|$)/)
    ? 'bwd'
    : has(/(^|_)(left|l)(_|$)/)
      ? 'left'
      : has(/(^|_)(right|r)(_|$)/)
        ? 'right'
        : 'fwd';

  if (has(/(^|_)idle(_|$)/)) {
    slots.add(has(/combat/) ? 'idle_combat' : 'idle');
  }
  if (has(/(^|_)walk|walking/)) slots.add(`walk_${direction}` as AnimationSlot);
  if (has(/(^|_)run|running/)) slots.add(`run_${direction}` as AnimationSlot);
  if (has(/sprint/)) slots.add('sprint');

  if (has(/jump/)) {
    if (has(/start|begin/)) slots.add('jump_start');
    else if (has(/land|landing/)) slots.add('jump_land');
    else if (has(/fall|falling/)) slots.add('jump_fall');
    else if (has(/mid|loop|apex/)) slots.add('jump_mid');
    else if (has(/end|recover/)) slots.add('jump_end');
    else slots.add('jump_start');
  }
  if (has(/(^|_)(death|die|dying)(_|$)/)) slots.add('death');
  if (has(/hit.?react|hit_reaction/)) {
    slots.add(has(/back|rear/) ? 'hit_react_back' : 'hit_react_front');
  }
  if (has(/attack|atk/)) slots.add(has(/heavy|strong/)? 'attack_heavy' : 'attack_light');
  if (has(/cast|casting/)) slots.add('cast');
  if (has(/stun/)) slots.add('stun');
  if (has(/emote|dance|wave/)) slots.add('emote');
  if (has(/recall/)) slots.add('recall');
  if (has(/select.?screen|select/)) slots.add('select_screen');
  if (has(/level.?start/)) slots.add('level_start');
  if (has(/bound|restrain/)) slots.add('bound');

  return Array.from(slots);
}

/**
 * Build a single browser catalog from uploaded GLB clips and reusable set metadata.
 * Set entries are references from the registry; the consumer must validate/load the
 * referenced file before claiming it can preview or play it.
 */
export function buildAnimationClipCatalog(
  embeddedClips: Array<{ name: string; duration?: number }> = [],
  profiles: AnimationProfile[] = ANIMATION_PROFILES,
): AnimationClipChoice[] {
  const choices: AnimationClipChoice[] = embeddedClips.map((clip) => ({
    id: embeddedAnimationChoiceId(clip.name),
    clip: clip.name,
    sourceKind: 'embedded',
    sourceId: 'uploaded-model',
    sourceLabel: 'Uploaded model',
    rigFamily: 'model-rig',
    slots: inferAnimationSlots(clip.name),
    loop: undefined,
    duration: clip.duration,
  }));

  for (const profile of profiles) {
    const profileClips = new Map<string, { slots: Set<AnimationSlot>; loop?: boolean; speed?: number }>();
    const addClip = (clip: string, slot?: AnimationSlot, loop?: boolean, speed?: number) => {
      const entry = profileClips.get(clip) || { slots: new Set<AnimationSlot>() };
      if (slot) entry.slots.add(slot);
      if (loop !== undefined) entry.loop = loop;
      if (speed !== undefined) entry.speed = speed;
      profileClips.set(clip, entry);
    };

    profile.availableClips.forEach((clip) => {
      inferAnimationSlots(clip).forEach((slot) => addClip(clip, slot));
      addClip(clip);
    });
    for (const [slot, mapping] of Object.entries(profile.slotMap) as [AnimationSlot, NonNullable<AnimationProfile['slotMap'][AnimationSlot]>][]) {
      addClip(mapping.clip, slot, mapping.loop, mapping.speed);
    }

    for (const [clip, metadata] of profileClips) {
      const inferredSlots = Array.from(metadata.slots);
      if (inferredSlots.length === 0) inferredSlots.push(...inferAnimationSlots(clip));
      choices.push({
        id: animationSetChoiceId(profile.id, clip),
        clip,
        sourceKind: 'animation-set',
        sourceId: profile.id,
        sourceLabel: profile.displayName,
        sourcePath: `${profile.basePath}${encodeURIComponent(clip)}.glb`,
        rigFamily: 'Manny',
        slots: inferredSlots,
        loop: metadata.loop,
        speed: metadata.speed,
      });
    }
  }

  return choices.sort((a, b) =>
    a.clip.localeCompare(b.clip) || a.sourceLabel.localeCompare(b.sourceLabel),
  );
}

export function getAnimationChoicesForSlot(
  choices: AnimationClipChoice[],
  slot: AnimationSlot,
): AnimationClipChoice[] {
  return choices.filter((choice) =>
    choice.sourceKind === 'embedded' || choice.slots.includes(slot) || choice.slots.length === 0,
  );
}
