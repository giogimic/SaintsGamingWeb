/**
 * Logic tile definitions.
 */
export const DEMO_LOGIC_TILES = [
  { id: 0, name: "Walkable", color: "bg-emerald-900", isSolid: false, interactable: false, onInteractAction: null as string | null, onInteractPayload: null as string | null, onStepAction: null as string | null, onStepPayload: null as string | null },
  { id: 1, name: "Solid Wall", color: "bg-red-600", isSolid: true, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 2, name: "Tall Grass", color: "bg-green-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "ENCOUNTER", onStepPayload: '{"chance":0.5}' },
  { id: 3, name: "Gate A", color: "bg-amber-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 4, name: "Gate B", color: "bg-amber-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 5, name: "Wood Tree", color: "bg-amber-800", isSolid: true, interactable: true, onInteractAction: "HARVEST_WOOD", onInteractPayload: '{"xp":25,"resource":"wood"}', onStepAction: null, onStepPayload: null },
  { id: 6, name: "Ore Rock", color: "bg-[#8d6e63]", isSolid: true, interactable: true, onInteractAction: "HARVEST_ORE", onInteractPayload: '{"xp":25,"resource":"ore"}', onStepAction: null, onStepPayload: null },
  { id: 7, name: "Shop Tile", color: "bg-yellow-400", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "OPEN_SHOP", onStepPayload: null },
  { id: 8, name: "Clinic Tile", color: "bg-pink-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "CLINIC_HEAL", onStepPayload: null },
  { id: 9, name: "Crafting Table", color: "bg-gray-500", isSolid: true, interactable: true, onInteractAction: "OPEN_CRAFTING", onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 10, name: "Fishing", color: "bg-sky-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "FISHING", onStepPayload: null },
  { id: 11, name: "Bramble Wall", color: "bg-lime-800", isSolid: true, interactable: true, onInteractAction: "CLEAR_BRAMBLE", onInteractPayload: '{"requiresTool":"axe_bronze"}', onStepAction: null, onStepPayload: null },
  { id: 12, name: "Base Hub", color: "bg-indigo-800", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "OPEN_BASE", onStepPayload: null },
  { id: 13, name: "Monster Spawner", color: "bg-rose-700", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "MONSTER_SPAWN_ZONE", onStepPayload: '{"monsterPool":"rockitten","maxPopulation":3,"level":1}' },
  { id: 14, name: "North Gate", color: "bg-sky-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_NORTH_GATE", onStepPayload: '{"spawnX":-1,"spawnY":-1}' },
  { id: 15, name: "East Gate", color: "bg-cyan-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_EAST_GATE", onStepPayload: '{"spawnX":0,"spawnY":-1}' },
  { id: 16, name: "South Gate", color: "bg-blue-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_SOUTH_GATE", onStepPayload: '{"spawnX":-1,"spawnY":0}' },
  { id: 17, name: "West Gate", color: "bg-indigo-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_WEST_GATE", onStepPayload: '{"spawnX":-1,"spawnY":-1}' },
  { id: 18, name: "Dungeon Entrance", color: "bg-purple-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_DUNGEON_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":6,"spawnY":2,"category":"DUNGEON"}' },
  { id: 19, name: "Raid Gate", color: "bg-amber-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_RAID_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":10,"spawnY":10,"category":"RAID"}' },
  { id: 20, name: "Event Gate", color: "bg-fuchsia-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_EVENT_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"EVENT"}' },
  { id: 21, name: "Mine Shaft Gate", color: "bg-orange-800", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_MINE_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"MINE"}' },
  { id: 22, name: "Deep Forest Gate", color: "bg-emerald-700", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_FOREST_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"DEEP_FOREST"}' },
  { id: 23, name: "Realm Portal", color: "bg-teal-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_PORTAL_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"PORTAL"}' },
];
