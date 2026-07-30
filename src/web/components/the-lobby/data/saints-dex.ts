export type ElementType = 'Solar' | 'Hydro' | 'Bio' | 'Volt' | 'Geo' | 'Cryo' | 'Aero' | 'Cyber' | 'None';

export interface CreatureStatProfile {
  HP: number;
  ATK: number;
  DEF: number;
  SPD: number;
}

export interface CreatureSchema {
  id: string; // e.g., "001"
  name: string;
  type_primary: ElementType;
  type_secondary: ElementType;
  stat_profile: CreatureStatProfile;
  passive_ability: string;
  world_skill: string;
  assetPath?: string; // Optional for now until we generate all 151 images
}

export const SAINTS_DEX: CreatureSchema[] = [
  {
    id: "001",
    name: "Sparkhare",
    type_primary: "Volt",
    type_secondary: "None",
    stat_profile: { HP: 45, ATK: 60, DEF: 35, SPD: 85 },
    passive_ability: "Overcharge: Deals 15% extra damage if it moves first in a combat round.",
    world_skill: "Short-Circuit: Can temporarily power down security lasers or activate dead elevators on Cyber/City maps.",
    assetPath: "/game-assets/daemon_data.png" // Reusing generated asset
  },
  {
    id: "002",
    name: "Mosshell",
    type_primary: "Bio",
    type_secondary: "Geo",
    stat_profile: { HP: 60, ATK: 50, DEF: 95, SPD: 25 },
    passive_ability: "Photosynthesis: Regenerates 5% HP every turn if weather/map status is 'Sunny' or 'Solar Flare'.",
    world_skill: "Root Anchor: Allows the player to hook onto structural points to cross raging Hydro rivers.",
    assetPath: "/game-assets/daemon_vaccine.png" // Reusing generated asset
  },
  {
    id: "003",
    name: "Vaporid",
    type_primary: "Hydro",
    type_secondary: "Aero",
    stat_profile: { HP: 60, ATK: 70, DEF: 50, SPD: 60 },
    passive_ability: "Condensation: Automatically evades the first attack from any Solar-type enemy.",
    world_skill: "Mist Cloud: Shrouds the player, allowing them to bypass aggressive wild creatures without triggering encounters on any map.",
    assetPath: "/game-assets/daemon_virus.png" // Reusing generated asset
  },
  {
    id: "004",
    name: "Pyrox",
    type_primary: "Solar",
    type_secondary: "Geo",
    stat_profile: { HP: 55, ATK: 80, DEF: 65, SPD: 40 },
    passive_ability: "Molten Core: Physical attackers take slight burn damage upon hitting Pyrox.",
    world_skill: "Magma Melt: Clears out solid Cryo blocks obstructing mountain passages."
  },
  {
    id: "005",
    name: "Lumifly",
    type_primary: "Solar",
    type_secondary: "Aero",
    stat_profile: { HP: 35, ATK: 45, DEF: 30, SPD: 95 },
    passive_ability: "Blinding Flash: Lowers enemy accuracy for the first 2 turns of combat.",
    world_skill: "Illuminate: Disperses heavy fog in dense map sections like the Overgrown Foundry."
  },
  {
    id: "006",
    name: "Aquabot",
    type_primary: "Hydro",
    type_secondary: "Cyber",
    stat_profile: { HP: 70, ATK: 55, DEF: 80, SPD: 35 },
    passive_ability: "Liquid Cooling: Immune to overheating or burn status effects.",
    world_skill: "Pump Hack: Restores pressure to broken hydro-valves to drain flooded rooms."
  },
  {
    id: "007",
    name: "Terratank",
    type_primary: "Geo",
    type_secondary: "None",
    stat_profile: { HP: 90, ATK: 75, DEF: 100, SPD: 15 },
    passive_ability: "Fortress: Incoming non-critical damage is reduced by a flat 10%.",
    world_skill: "Boulder Smash: Crushes massive rocks blocking standard pathways."
  },
  {
    id: "008",
    name: "Frostbite",
    type_primary: "Cryo",
    type_secondary: "Volt",
    stat_profile: { HP: 50, ATK: 85, DEF: 40, SPD: 75 },
    passive_ability: "Static Chill: 10% chance to freeze OR paralyze an enemy on contact.",
    world_skill: "Flash Freeze: Creates temporary walkable ice paths across small bodies of water."
  },
  {
    id: "009",
    name: "Galehawk",
    type_primary: "Aero",
    type_secondary: "None",
    stat_profile: { HP: 55, ATK: 85, DEF: 45, SPD: 90 },
    passive_ability: "Tailwind: Always strikes first on the opening turn regardless of SPD stat.",
    world_skill: "Thermal Glide: Carries the player across massive chasms using updrafts."
  },
  {
    id: "010",
    name: "Neongrub",
    type_primary: "Bio",
    type_secondary: "Cyber",
    stat_profile: { HP: 40, ATK: 30, DEF: 35, SPD: 50 },
    passive_ability: "Data Leech: Heals for 20% of the damage dealt to Cyber-type enemies.",
    world_skill: "Wire Crawl: Can bypass locked doors by squeezing through maintenance conduits."
  },
  {
    id: "011",
    name: "Glitchhound",
    type_primary: "Cyber",
    type_secondary: "Volt",
    stat_profile: { HP: 60, ATK: 90, DEF: 40, SPD: 85 },
    passive_ability: "Packet Sniffer: Deals 20% more damage to enemies with active buffs.",
    world_skill: "Firewall Bypass: Hacks into regional security gates granting access to new Biomaps."
  },
  {
    id: "012",
    name: "Abyssworm",
    type_primary: "Hydro",
    type_secondary: "Geo",
    stat_profile: { HP: 85, ATK: 65, DEF: 75, SPD: 20 },
    passive_ability: "Deep Pressure: Unaffected by terrain hazards or weather effects.",
    world_skill: "Trench Dive: Allows traversal through deep, dark water channels that normal Hydro types cannot cross."
  },
  {
    id: "013",
    name: "Solarflare",
    type_primary: "Solar",
    type_secondary: "None",
    stat_profile: { HP: 65, ATK: 100, DEF: 55, SPD: 70 },
    passive_ability: "Supernova: When HP drops below 20%, ATK is boosted by 50%.",
    world_skill: "Desert Bloom: Activates dried out checkpoints in arid maps by providing intense solar energy."
  },
  {
    id: "014",
    name: "Aerodart",
    type_primary: "Aero",
    type_secondary: "Volt",
    stat_profile: { HP: 45, ATK: 75, DEF: 35, SPD: 105 },
    passive_ability: "Tailwind Strike: Critical hits grant a 10% speed boost for the rest of the battle.",
    world_skill: "Static Lift: Uses electromagnetic currents to carry the player up steep metallic cliffs."
  },
  {
    id: "015",
    name: "Mudsludge",
    type_primary: "Bio",
    type_secondary: "Hydro",
    stat_profile: { HP: 95, ATK: 60, DEF: 85, SPD: 20 },
    passive_ability: "Swamp Armor: Immune to debuffs applied by Volt or Aero enemies.",
    world_skill: "Bog Walk: Grants safe passage through toxic or slowing mud pits without movement penalties."
  },
  {
    id: "016",
    name: "Geocore",
    type_primary: "Geo",
    type_secondary: "Solar",
    stat_profile: { HP: 80, ATK: 85, DEF: 90, SPD: 25 },
    passive_ability: "Thermal Shell: Defending against physical attacks has a chance to burn the attacker.",
    world_skill: "Magma Bridge: Cools lava streams to create temporary walking paths."
  },
  {
    id: "017",
    name: "Frostfang",
    type_primary: "Cryo",
    type_secondary: "None",
    stat_profile: { HP: 60, ATK: 90, DEF: 55, SPD: 85 },
    passive_ability: "Predator: Deals extra damage to enemies with less than 50% HP.",
    world_skill: "Shatter Howl: Breaks apart ice barriers blocking secret glacial caverns."
  },
  {
    id: "018",
    name: "Wirebug",
    type_primary: "Cyber",
    type_secondary: "Bio",
    stat_profile: { HP: 40, ATK: 65, DEF: 40, SPD: 95 },
    passive_ability: "Overclock: Can attack twice in one turn, but loses 10% HP when doing so.",
    world_skill: "Circuit Tap: Can interface with broken terminals to reveal hidden map nodes."
  },
  {
    id: "019",
    name: "Surgebot",
    type_primary: "Volt",
    type_secondary: "Cyber",
    stat_profile: { HP: 50, ATK: 70, DEF: 60, SPD: 80 },
    passive_ability: "Battery Drain: Absorbs incoming Volt damage to heal itself instead of taking damage.",
    world_skill: "Power Surge: Restores power to abandoned facilities, turning on the lights and unlocking doors."
  },
  {
    id: "020",
    name: "Solarion",
    type_primary: "Solar",
    type_secondary: "Cryo",
    stat_profile: { HP: 70, ATK: 95, DEF: 50, SPD: 75 },
    passive_ability: "Paradox: Attacks have a chance to either burn or freeze the target unpredictably.",
    world_skill: "Thermal Shift: Melts thick ice blocks or freezes boiling geysers depending on the obstacle."
  },
  {
    id: "021",
    name: "Aquamanta",
    type_primary: "Hydro",
    type_secondary: "Aero",
    stat_profile: { HP: 75, ATK: 65, DEF: 60, SPD: 80 },
    passive_ability: "Slipstream: Evasion increases by 15% when the weather is rainy or windy.",
    world_skill: "Waterfall Climb: Can carry the player vertically up massive rushing waterfalls."
  },
  {
    id: "022",
    name: "Terrahorn",
    type_primary: "Geo",
    type_secondary: "Bio",
    stat_profile: { HP: 85, ATK: 90, DEF: 80, SPD: 40 },
    passive_ability: "Unstoppable: Immune to being stunned, paralyzed, or frozen.",
    world_skill: "Charge: Bashes down weakened walls to open shortcuts across the map."
  },
  {
    id: "023",
    name: "Cybergeist",
    type_primary: "Cyber",
    type_secondary: "Cryo",
    stat_profile: { HP: 55, ATK: 85, DEF: 45, SPD: 90 },
    passive_ability: "Ghost in the Machine: Has a 20% chance to completely phase through any physical attack.",
    world_skill: "Data Phase: Allows the player to pass through seemingly solid laser grids."
  }
];

export const getCreatureById = (id: string) => SAINTS_DEX.find(c => c.id === id);

export const getRandomEncounter = () => {
  const randomIndex = Math.floor(Math.random() * SAINTS_DEX.length);
  return SAINTS_DEX[randomIndex];
};
