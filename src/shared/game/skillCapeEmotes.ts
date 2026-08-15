/**
 * Skill Cape Emotes & Visual FX Registry
 * Definitions for all 27 Skill Mastery Capes, Max Cape of the Grandmaster, and Grandmaster Completionist Cape.
 */

export interface SkillCapeEmoteDef {
  slug: string;
  capeName: string;
  emoteName: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  particleType:
    | 'sparks'
    | 'flames'
    | 'feathers'
    | 'stars'
    | 'souls'
    | 'leaves'
    | 'bubbles'
    | 'lightning'
    | 'supernova'
    | 'swords'
    | 'ice'
    | 'holy';
  durationSeconds: number;
}

export const SKILL_CAPE_EMOTES: Record<string, SkillCapeEmoteDef> = {
  attack: {
    slug: 'attack',
    capeName: 'Cape of Attack',
    emoteName: 'Bladestorm Flurry',
    description: 'Leap skyward and summon three whirling phantom broadswords that crash into the ground causing a shockwave of crimson sparks.',
    primaryColor: '#ef4444',
    accentColor: '#f87171',
    particleType: 'swords',
    durationSeconds: 3.5,
  },
  strength: {
    slug: 'strength',
    capeName: 'Cape of Strength',
    emoteName: 'Colossus Earthshatter',
    description: 'Flex colossus muscular power to rip a giant granite boulder from the earth, toss it overhead, and shatter it into fiery dust.',
    primaryColor: '#ea580c',
    accentColor: '#fb923c',
    particleType: 'sparks',
    durationSeconds: 3.8,
  },
  defence: {
    slug: 'defence',
    capeName: 'Cape of Defence',
    emoteName: 'Adamant Aegis Bulwark',
    description: 'Slam a towering ethereal kiteshield into the soil, creating an impenetrable dome of shimmering cyan warding barriers.',
    primaryColor: '#0ea5e9',
    accentColor: '#38bdf8',
    particleType: 'sparks',
    durationSeconds: 3.4,
  },
  hitpoints: {
    slug: 'hitpoints',
    capeName: 'Cape of Hitpoints',
    emoteName: 'Phoenix Heart Rebirth',
    description: 'Burst into a radiant crimson aura shaped like a soaring phoenix heart, restoring spiritual vigor and raining life petals.',
    primaryColor: '#f43f5e',
    accentColor: '#fb7185',
    particleType: 'flames',
    durationSeconds: 4.0,
  },
  ranged: {
    slug: 'ranged',
    capeName: 'Cape of Ranged',
    emoteName: 'Skyward Arrow Volley',
    description: 'Draw an ethereal celestial longbow, fire a volley of five homing starlight arrows high into the heavens that detonate in jade fireworks.',
    primaryColor: '#10b981',
    accentColor: '#34d399',
    particleType: 'stars',
    durationSeconds: 3.6,
  },
  agility: {
    slug: 'agility',
    capeName: 'Cape of Agility',
    emoteName: 'Windrunner Acrobatics',
    description: 'Perform a triple backflip mid-air propelled by spinning emerald wind gusts, landing gracefully on a cushion of breeze.',
    primaryColor: '#06b6d4',
    accentColor: '#22d3ee',
    particleType: 'stars',
    durationSeconds: 3.2,
  },
  perception: {
    slug: 'perception',
    capeName: 'Cape of Perception',
    emoteName: 'Eagle Eye Precision',
    description: 'Summon an all-seeing astral eye glyph overhead that projects a scanning golden laser grid detecting all hidden treasures in the area.',
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
    particleType: 'lightning',
    durationSeconds: 3.5,
  },
  wisdom: {
    slug: 'wisdom',
    capeName: 'Cape of Wisdom',
    emoteName: 'Arcane Scripture Levitation',
    description: 'Levitate cross-legged while three glowing ancient tomes spin in orbit, unleashing cascading blue mana symbols.',
    primaryColor: '#6366f1',
    accentColor: '#818cf8',
    particleType: 'stars',
    durationSeconds: 4.0,
  },
  intelligence: {
    slug: 'intelligence',
    capeName: 'Cape of Intelligence',
    emoteName: 'Singularity Mind Blast',
    description: 'Channel concentrated intellect into a glowing purple singularity sphere between your palms before discharging an electric mental pulse.',
    primaryColor: '#a855f7',
    accentColor: '#c084fc',
    particleType: 'lightning',
    durationSeconds: 3.7,
  },
  farming: {
    slug: 'farming',
    capeName: 'Cape of Farming',
    emoteName: 'Verdant Harvest Sprout',
    description: 'Kneel and touch the ground, causing a magical world-tree sapling to rapidly sprout, bloom golden flowers, and shed glowing leaves.',
    primaryColor: '#22c55e',
    accentColor: '#4ade80',
    particleType: 'leaves',
    durationSeconds: 4.2,
  },
  fishing: {
    slug: 'fishing',
    capeName: 'Cape of Fishing',
    emoteName: 'Leviathan Oceanic Splash',
    description: 'Cast a golden fishing line into a summoned vortex pool and wrestle a colossal spectral leviathan that splashes crystal water droplets.',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    particleType: 'bubbles',
    durationSeconds: 3.9,
  },
  hunter: {
    slug: 'hunter',
    capeName: 'Cape of Hunter',
    emoteName: 'Saber-Kyatt Stalker Call',
    description: 'Deploy a glowing crystal box trap and summon a spectral golden Kyatt that lets out a fierce predatory roar before transforming into mist.',
    primaryColor: '#f97316',
    accentColor: '#fb923c',
    particleType: 'stars',
    durationSeconds: 3.6,
  },
  mining: {
    slug: 'mining',
    capeName: 'Cape of Mining',
    emoteName: 'Asteroid Core Strike',
    description: 'Summon a floating celestial star ore asteroid and strike it with a golden pickaxe, shattering it into glistening gem shards.',
    primaryColor: '#78716c',
    accentColor: '#a8a29e',
    particleType: 'sparks',
    durationSeconds: 3.8,
  },
  woodcutting: {
    slug: 'woodcutting',
    capeName: 'Cape of Woodcutting',
    emoteName: 'World-Tree Timber Cleave',
    description: 'Summon an ancient magic redwood tree trunk and chop it with a two-handed starlight greataxe, releasing swirling green woodcraft spirits.',
    primaryColor: '#15803d',
    accentColor: '#22c55e',
    particleType: 'leaves',
    durationSeconds: 3.7,
  },
  construction: {
    slug: 'construction',
    capeName: 'Cape of Construction',
    emoteName: 'Imperial Estate Architect',
    description: 'Unroll a glowing architectural blueprint from which miniature gilded marble palaces and crystal portals instantly materialize and rotate.',
    primaryColor: '#d97706',
    accentColor: '#f59e0b',
    particleType: 'stars',
    durationSeconds: 4.0,
  },
  cooking: {
    slug: 'cooking',
    capeName: 'Cape of Cooking',
    emoteName: 'Grand Banquet Flambé',
    description: 'Toss a frying pan creating a spectacular rainbow flambé fire column and serve a steaming plate of divine ambrosia.',
    primaryColor: '#e11d48',
    accentColor: '#fb7185',
    particleType: 'flames',
    durationSeconds: 3.5,
  },
  crafting: {
    slug: 'crafting',
    capeName: 'Cape of Crafting',
    emoteName: 'Prismatic Diamond Lapidary',
    description: 'Chisel a raw glowing onyx gemstone into a flawless multi-faceted diamond that emits dazzling prismatic rainbow light beams.',
    primaryColor: '#c026d3',
    accentColor: '#e879f9',
    particleType: 'stars',
    durationSeconds: 3.6,
  },
  firemaking: {
    slug: 'firemaking',
    capeName: 'Cape of Firemaking',
    emoteName: 'Sunfire Beacon Conflagration',
    description: 'Light a towering pyre beacon that ignites a raging vortex of solar phoenix flames encircling you in an unquenchable blaze.',
    primaryColor: '#dc2626',
    accentColor: '#ef4444',
    particleType: 'flames',
    durationSeconds: 4.1,
  },
  fletching: {
    slug: 'fletching',
    capeName: 'Cape of Fletching',
    emoteName: 'Hyperion Starlight Fletch',
    description: 'Rapidly carve five glowing starlight bolts, attach pegasus feather fletchings, and fire them into the sky in a starburst pattern.',
    primaryColor: '#65a30d',
    accentColor: '#84cc16',
    particleType: 'feathers',
    durationSeconds: 3.5,
  },
  herblore: {
    slug: 'herblore',
    capeName: 'Cape of Herblore',
    emoteName: 'Overload Supreme Alchemy',
    description: 'Mix volatile botanical extracts in a bubbling alchemical flask, chugging the elixir to radiate an emerald power surge.',
    primaryColor: '#16a34a',
    accentColor: '#22c55e',
    particleType: 'bubbles',
    durationSeconds: 3.8,
  },
  runecrafting: {
    slug: 'runecrafting',
    capeName: 'Cape of Runecrafting',
    emoteName: 'Astral Rift Infusion',
    description: 'Channel elemental essence into an astral altar rift, causing all elemental rune symbols (Air, Water, Earth, Fire, Blood, Soul) to orbit overhead.',
    primaryColor: '#eab308',
    accentColor: '#fde047',
    particleType: 'stars',
    durationSeconds: 4.0,
  },
  smithing: {
    slug: 'smithing',
    capeName: 'Cape of Smithing',
    emoteName: 'Masterwork Anvil Hammering',
    description: 'Summon a masterwork adamant anvil, striking a white-hot celestial ingot with rhythmic hammer blows that send blazing sparks in all directions.',
    primaryColor: '#94a3b8',
    accentColor: '#cbd5e1',
    particleType: 'sparks',
    durationSeconds: 3.9,
  },
  thieving: {
    slug: 'thieving',
    capeName: 'Cape of Thieving',
    emoteName: 'Shadowstep Smoke Disappearance',
    description: 'Toss a nitrogen flash powder bomb, vanishing completely into dark shadow mist before reappearing behind a shower of stolen gold coins.',
    primaryColor: '#475569',
    accentColor: '#64748b',
    particleType: 'souls',
    durationSeconds: 3.4,
  },
  summoning: {
    slug: 'summoning',
    capeName: 'Cape of Summoning',
    emoteName: 'Apex Chimera Convergence',
    description: 'Crush green, crimson, and blue summoning charms to manifest holographic avatars of the Spirit Wolf, Pack Yak, and Steel Titan.',
    primaryColor: '#059669',
    accentColor: '#10b981',
    particleType: 'stars',
    durationSeconds: 4.2,
  },
  magic: {
    slug: 'magic',
    capeName: 'Cape of Magic',
    emoteName: 'Elemental Meteor Storm',
    description: 'Wave an archmage staff to summon a swirling tri-elemental astral vortex, calling down four miniature meteors that explode in stardust.',
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    particleType: 'supernova',
    durationSeconds: 4.5,
  },
  prayer: {
    slug: 'prayer',
    capeName: 'Cape of Prayer',
    emoteName: 'Divine Ascension Archangel',
    description: 'Kneel and raise holy hands to unfurl six dazzling angel wings of pure golden sunlight, ascending into the air in a pillar of grace.',
    primaryColor: '#facc15',
    accentColor: '#fde047',
    particleType: 'holy',
    durationSeconds: 4.5,
  },
  necromancy: {
    slug: 'necromancy',
    capeName: 'Cape of Necromancy',
    emoteName: 'Reaper Soul Reave',
    description: 'Slash a giant obsidian war scythe across the fabric of reality, ripping open an underworld rift from which dozens of spectral souls erupt.',
    primaryColor: '#7c3aed',
    accentColor: '#a78bfa',
    particleType: 'souls',
    durationSeconds: 4.4,
  },
  max: {
    slug: 'max',
    capeName: 'Max Cape of the Grandmaster',
    emoteName: 'Grandmaster Celestial Convergence',
    description: 'Ascend into the sky surrounded by all 27 skill symbols rotating in a cosmic planetary orbit, bursting in a blinding supernova starburst.',
    primaryColor: '#f59e0b',
    accentColor: '#fbbf24',
    particleType: 'supernova',
    durationSeconds: 5.0,
  },
  completionist: {
    slug: 'completionist',
    capeName: 'Grandmaster Completionist Cape',
    emoteName: 'Omnipotent World Ascendance',
    description: 'Transform into a transcendent starlight deity with orbiting world fragments, rainbow leylines, and golden angelic halo bursts.',
    primaryColor: '#ec4899',
    accentColor: '#f472b6',
    particleType: 'supernova',
    durationSeconds: 5.5,
  },
};

/** Get emote definition for a skill or special cape */
export function getSkillCapeEmote(slugOrLabel: string): SkillCapeEmoteDef | null {
  const key = (slugOrLabel || '').trim().toLowerCase();
  return SKILL_CAPE_EMOTES[key] || null;
}

/** Get all registered cape emotes */
export function getAllCapeEmotes(): SkillCapeEmoteDef[] {
  return Object.values(SKILL_CAPE_EMOTES);
}
