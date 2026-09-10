/**
 * Saints Gaming — Game Client Socket Protocol Schema
 *
 * Single source of truth for every socket event between the Go MMO server
 * and the browser game client. Mirrors `the-lobby/internal/protocol/protocol.go`.
 *
 * Keep this file in sync with Go `protocol.go` constants + struct definitions.
 * Any Go server change that adds/removes/renames an event or changes a payload
 * shape MUST be reflected here first — TypeScript compilation will then flag
 * every callsite that needs updating.
 */

// ─── Scalar Helpers ───────────────────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'left' | 'right';
export type Point2D = { x: number; y: number };

// ─── Server → Client Payloads ────────────────────────────────────────────────

export interface MapJoinedPayload {
  instanceId: string;
  mapId: string;
  x: number;
  y: number;
  joinSeq?: number;
}

export interface PeerSnapshot {
  socketId: string;
  accountId?: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  vz?: number;
  direction?: Direction;
  name: string;
  assetProfileId: string;
  spriteId?: string;
  isMoving?: boolean;
  hp?: number;
  maxHp?: number;
  chatMessage?: string;
  customization?: PlayerCustomization;
  lastUpdateMs?: number;
}

export interface PlayerCustomization {
  skinTone: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
}

/** player_moved — may arrive as JSON or compact binary (handled by movementCodec). */
export interface PlayerMovedPayload {
  socketId: string;
  x: number;
  y: number;
  direction?: Direction;
  isMoving?: boolean;
  hp?: number;
  maxHp?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  lastUpdateMs?: number;
  customization?: PlayerCustomization;
}

export interface MoveAckPayload {
  seq: number;
  x: number;
  y: number;
  direction?: Direction;
}

export interface PositionCorrectionPayload {
  seq: number;
  x: number;
  y: number;
  direction: Direction;
  reason?: string;
}

export interface SessionReplacedPayload {
  reason?: string;
}

export interface PlayerDefeatedPayload {
  mapId?: string;
  instanceId?: string;
  x?: number;
  y?: number;
}

export interface CreatureSpawnPayload {
  id?: string;
  entityId?: string;
  species?: string;
  templateId?: string;
  name?: string;
  x: number;
  y: number;
  hp?: number;
  maxHp?: number;
  level?: number;
  sprite?: string;
  spriteKey?: string;
  mapId?: string;
  hostile?: boolean;
  entityType?: 'NPC' | 'MONSTER' | 'ANIMAL';
  direction?: string;
  isMoving?: boolean;
  dialogueNpcId?: string;
  type?: string;
}

export interface CreatureMovedPayload {
  entityId: string;
  x: number;
  y: number;
  direction?: string;
  isMoving?: boolean;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface CreatureDespawnedPayload {
  entityId?: string;
  id?: string;
}

export interface CreatureHpUpdatePayload {
  entityId?: string;
  id?: string;
  hp?: number;
  maxHp?: number;
  hpPercent?: number;
}

export interface BattleStartPayload {
  id?: string;
  combatId?: string;
  accountId?: string;
  phase?: string;
  turn?: string;
  isTrainer?: boolean;
  trainerName?: string;
  opponentName?: string;
  wildCreature?: BattleCreaturePayload;
  playerCreature?: BattleCreaturePayload;
  creatureId?: string;
  creatureName?: string;
  creatureHp?: number;
  creatureMaxHp?: number;
  opponentHp?: number;
  opponentMaxHp?: number;
  hp?: number;
  maxHp?: number;
  playerHp?: number;
  playerMaxHp?: number;
  level?: number;
  spriteKey?: string;
  log?: string[];
}

export interface BattleCreaturePayload {
  id?: string;
  templateId?: string;
  hp: number;
  maxHp: number;
  level: number;
  spriteKey: string;
  name: string;
  isShiny?: boolean;
  tags?: string[];
}

export interface BattleUpdatePayload {
  id?: string;
  combatId?: string;
  accountId?: string;
  phase?: string;
  turn?: string;
  wildCreature?: Partial<BattleCreaturePayload>;
  playerCreature?: Partial<BattleCreaturePayload>;
  creatureHp?: number;
  creatureMaxHp?: number;
  opponentHp?: number;
  opponentMaxHp?: number;
  playerHp?: number;
  playerMaxHp?: number;
  damage?: number;
  crit?: boolean;
  log?: string[];
}

export interface BattleEndPayload {
  result?: 'CAPTURE' | 'WIN' | 'LOSE' | 'FLEE';
  winner?: string;
  accountId?: string;
  capture?: {
    isRemarkable?: boolean;
    isFirstOfSpecies?: boolean;
    name?: string;
    speciesSlug?: string;
  };
}

export interface CombatUpdatePayload {
  [key: string]: any;
}

export interface DialogueStartPayload {
  npcId: string;
  npcName?: string;
  node?: string;
  text: string;
  options?: { label: string; nextNode: string }[];
}

export interface PlayerChatPayload {
  socketId: string;
  accountId?: string;
  sender?: string;
  message: string;
  channel?: string;
}

export interface GlobalChatMsgPayload {
  socketId?: string;
  accountId?: string;
  sender?: string;
  name?: string;
  message: string;
  timestamp?: number;
}

export interface PartyChatMsgPayload {
  socketId?: string;
  accountId?: string;
  sender?: string;
  name?: string;
  message: string;
  timestamp?: number;
}

export interface WhisperMsgPayload {
  sender?: string;
  message: string;
  timestamp?: number;
  recipient?: string;
  accountId?: string;
  socketId?: string;
}

export interface ChatMessagePayload {
  channel?: string;
  senderName?: string;
  sender?: string;
  message?: string;
  timestamp?: number;
  accountId?: string;
  socketId?: string;
}

export interface ShowToastPayload {
  message: string;
  kind?: string;
}

export interface SkillXpPayload {
  skillSlug: string;
  totalXp: number;
  level: number;
}

export interface SyncCreditsPayload {
  credits: number;
}

export interface SyncHpPayload {
  hp: number;
  maxHp?: number;
}

export interface InventorySyncPayload {
  items: { id: string; qty: number }[];
}

export interface QuestUpdatePayload {
  quests: { slug: string; [key: string]: any }[];
}

export interface PartyInvitePayload {
  fromName?: string;
  fromAccountId?: string;
}

export interface PartyUpdatePayload {
  type?: 'UPDATE' | 'DISBANDED' | 'LEFT';
  members?: string[];
}

export interface TileChangedPayload {
  x: number;
  y: number;
  tileId?: number;
  mapId?: string;
}

export interface VoxelEditPayload {
  mapId?: string;
  x: number;
  y: number;
  z: number;
  wordLow: number;
  wordHigh: number;
}

export interface ContentReloadPayload {
  type: 'map' | 'map_entities';
  mapId?: string;
  id?: string;
}

export interface StarterClaimedPayload {
  creature?: {
    id?: string;
    speciesSlug?: string;
    nickname?: string;
    level?: number;
    xp?: number;
    currentHp?: number;
    maxHp?: number;
    stats?: any;
    abilities?: any;
  };
  def?: { name?: string };
}

export interface LootDroppedPayload {
  [key: string]: any;
}

export interface LootDespawnedPayload {
  [key: string]: any;
}

export interface NodeDepletedPayload {
  [key: string]: any;
}

export interface NodeRespawnedPayload {
  [key: string]: any;
}

export interface StudioLockPayload {
  resource: string;
  userId?: string;
  displayName?: string;
  at?: string;
  expiresAt?: string;
}

export interface StudioUnlockPayload {
  resource: string;
}

export interface RuleTracePayload {
  ruleId: string;
  nodeType: string;
  expected?: any;
  actual?: any;
  passed: boolean;
  timestamp: number;
}

export interface ForceDisconnectPayload {
  reason?: string;
}

export interface ChunkDataPayload {
  [key: string]: any;
}

// ─── Client → Server Payloads ────────────────────────────────────────────────

export interface JoinMapRequest {
  accountId?: string;
  characterId?: string;
  mapId: string;
  lobby?: boolean;
  isPrivate?: boolean;
  pie?: boolean;
  x?: number;
  y?: number;
  name?: string;
  assetProfileId?: string;
  spriteId?: string;
  neighborMapIds?: string[];
  joinSeq?: number;
}

export interface PlayerInputPayload {
  entityId?: string;
  sequence: number;
  type: 'MOVE' | 'MOVE_3D' | 'ATTACK' | 'USE_ITEM' | 'FLEE';
  direction?: Direction;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  targetId?: string;
  abilityId?: string;
  itemId?: string;
  timestamp: number;
}

export interface BattleSubmitPayload {
  action: string;
  abilityIndex?: number;
  itemId?: string;
}

export interface ChatSendPayload {
  message: string;
  channel?: 'LOCAL' | 'GLOBAL' | 'PARTY' | 'WHISPER';
  recipient?: string;
}

export interface CombatCastPayload {
  targetId: string;
  abilityId: string;
}

export interface GatherInteractPayload {
  entityId: string;
  toolId?: string;
}

export interface ShopBuyPayload {
  itemId: string;
  quantity?: number;
}

export interface ShopSellPayload {
  itemId: string;
  quantity?: number;
}

export interface CraftItemPayload {
  recipeId: string;
  quantity?: number;
}

export interface ClaimStarterPayload {
  speciesSlug: string;
}

export interface VoxelEditRequest {
  mapId: string;
  x: number;
  y: number;
  z: number;
  wordLow: number;
  wordHigh: number;
}

// ─── Typed Socket.IO Event Maps ──────────────────────────────────────────────

/** Events emitted BY the server TO the client. */
export interface ServerToClientEvents {
  // Shard & Lifecycle
  map_joined: (data: MapJoinedPayload) => void;
  map_players: (players: Record<string, PeerSnapshot>) => void;
  player_joined: (data: PeerSnapshot) => void;
  player_left: (data: { socketId: string } | string) => void;
  session_replaced: (data: SessionReplacedPayload) => void;
  force_disconnect: (data: ForceDisconnectPayload) => void;

  // Movement & Prediction
  player_moved: (data: PlayerMovedPayload | ArrayBuffer) => void;
  move_ack: (data: MoveAckPayload) => void;
  position_correction: (data: PositionCorrectionPayload) => void;
  player_defeated: (data: PlayerDefeatedPayload) => void;

  // Entities
  creature_spawned: (data: CreatureSpawnPayload) => void;
  creature_despawned: (data: CreatureDespawnedPayload | string) => void;
  creature_moved: (data: CreatureMovedPayload | ArrayBuffer) => void;
  creature_hp_update: (data: CreatureHpUpdatePayload) => void;

  // Combat
  combat_update: (data: CombatUpdatePayload) => void;
  battle_started: (data: BattleStartPayload) => void;
  battle_update: (data: BattleUpdatePayload) => void;
  battle_ended: (data: BattleEndPayload) => void;
  battle_invite_received: (data: { from: string; name: string }) => void;

  // Chat & Social
  player_chat: (data: PlayerChatPayload) => void;
  global_chat_msg: (data: GlobalChatMsgPayload) => void;
  party_chat_msg: (data: PartyChatMsgPayload) => void;
  whisper_msg: (data: WhisperMsgPayload) => void;
  chat_message: (data: ChatMessagePayload) => void;

  // Economy & Inventory
  sync_credits: (data: SyncCreditsPayload) => void;
  sync_hp: (data: SyncHpPayload) => void;
  inventory_sync: (data: InventorySyncPayload) => void;
  skill_xp_gained: (data: SkillXpPayload) => void;
  show_toast: (data: ShowToastPayload) => void;

  // Quests & Dialogue
  quest_update: (data: QuestUpdatePayload) => void;
  dialogue_start: (data: DialogueStartPayload) => void;
  dialogue_end: () => void;
  demo_open_lab: () => void;

  // Party
  party_invite: (data: PartyInvitePayload) => void;
  party_update: (data: PartyUpdatePayload) => void;

  // Creatures & Starters
  starter_claimed: (data: StarterClaimedPayload) => void;

  // World & Map Sync
  tile_changed: (data: TileChangedPayload) => void;
  voxel_edit: (data: VoxelEditPayload) => void;
  content_reload: (data: ContentReloadPayload) => void;
  chunk_data: (data: ChunkDataPayload) => void;
  chunk_loaded: (data: { chunks: any }) => void;

  // Gathering & Loot
  loot_dropped: (data: LootDroppedPayload) => void;
  loot_despawned: (data: LootDespawnedPayload) => void;
  node_depleted: (data: NodeDepletedPayload) => void;
  node_respawned: (data: NodeRespawnedPayload) => void;

  // Studio Collaboration
  studio_lock: (data: StudioLockPayload) => void;
  studio_unlock: (data: StudioUnlockPayload) => void;
  studio_presence: (data: any) => void;
  rule_trace: (data: RuleTracePayload) => void;

  // Diagnostics
  pong: () => void;
}

/** Events emitted BY the client TO the server. */
export interface ClientToServerEvents {
  // Shard & Lifecycle
  join_map: (data: JoinMapRequest) => void;
  join_room: (room: string) => void;
  leave_room: (room: string) => void;

  // Movement
  input: (data: PlayerInputPayload) => void;

  // Combat
  combat_action: (data: any) => void;
  combat_cast: (data: any) => void;
  encounter_check: (data: any) => void;
  battle_invite_send: (data: { targetId: string; targetName: string }) => void;
  battle_submit_action: (data: any) => void;
  accept_battle: (from: string) => void;

  // Chat
  global_chat: (message: string) => void;
  chat_message: (data: any) => void;
  party_chat: (message: string) => void;

  // NPC & Dialogue
  npc_interact: (data: { entityId: string }) => void;
  dialogue_select: (data: any) => void;

  // Economy & Inventory
  use_item: (data: { itemId: string }) => void;
  drop_item: (data: { itemId: string }) => void;
  gather_interact: (data: any) => void;
  pickup_loot: (data: { lootId: string }) => void;
  craft_item: (recipeSlug: string) => void;
  shop_buy: (data: { itemSlug: string; quantity: number }) => void;
  shop_sell: (data: { itemSlug: string; quantity: number }) => void;
  shop_catalog: (data: any) => void;
  claim_starter: (data: any) => void;
  gtc_create_listing: (data: any) => void;
  gtc_purchase_listing: (data: any) => void;

  // Party
  party_invite_send: (data: { targetName: string }) => void;
  party_invite: (data: any) => void;
  party_invite_accept: () => void;
  party_invite_decline: () => void;
  party_join: (data: any) => void;
  party_leave: () => void;

  // World / Map
  voxel_edit: (data: VoxelEditRequest) => void;
  request_chunk: (data: any) => void;

  // Studio
  studio_spawn_npc: (data: any) => void;
  studio_despawn_npc: (data: any) => void;
  studio_lock: (data: any) => void;
  studio_unlock: (data: any) => void;
  studio_presence: (data: any) => void;

  // Admin
  admin_save_map: (data: any) => void;
  admin_reload_map: (data: any) => void;
  admin_reload_content: (data: any) => void;
  staff_announce: (message: string) => void;
  staff_kick: (socketId: string) => void;

  // Diagnostics
  ping: (data: { clientTime: number }) => void;
}
