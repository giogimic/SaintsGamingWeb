package protocol

// Shared wire constants matching the TypeScript SocketHandler / client.

const (
	DemoMapID       = "DEMO_SANDBOX"
	RetiredVillage  = "SAINTS_VILLAGE"
	DefaultSpawnX   = 14
	DefaultSpawnY   = 15
	DemoMapW        = 30
	DemoMapH        = 30
	DefaultGroundGID = 17
)

// Tile logic ids (MapLogicTile).
const (
	TileWalk     = 0
	TileWall     = 1
	TileGrass    = 2
	TileTree     = 5
	TileOre      = 6
	TileShop     = 7
	TileClinic   = 8
	TileCraft    = 9
	TileFish     = 10
	TileBramble  = 11
)

// Client → server event names.
const (
	EvJoinMap           = "join_map"
	EvInput             = "input"
	EvCombatAction      = "combat_action"
	EvCombatCast        = "combat_cast"
	EvEncounterCheck    = "encounter_check"
	EvBattleSubmit      = "battle_submit_action"
	EvVoxelEdit         = "voxel_edit"
	
	EvAdminSaveMap      = "admin_save_map"
	EvAdminReloadMap    = "admin_reload_map"
	EvAdminReloadContent = "admin_reload_content"

	EvStudioSpawnNPC    = "studio_spawn_npc"
	EvStudioDespawnNPC  = "studio_despawn_npc"
	EvNPCInteract       = "npc_interact"
	EvDialogueSelect    = "dialogue_select"
	EvGatherInteract    = "gather_interact"
	EvPickupLoot        = "pickup_loot"
	EvPartyChat         = "party_chat"
	EvPartyInvite       = "party_invite"
	EvPartyInviteAccept = "party_invite_accept"
	EvPartyInviteDecline = "party_invite_decline"
	EvPartyJoin         = "party_join"
	EvPartyLeave        = "party_leave"
	EvGlobalChat        = "global_chat"
	EvChatMessage       = "chat_message"
	EvStaffAnnounce     = "staff_announce"
	EvStaffKick         = "staff_kick"
	EvCraftItem         = "craft_item"
	EvShopBuy           = "shop_buy"
	EvShopSell          = "shop_sell"
	EvShopCatalog       = "shop_catalog"
	EvClaimStarter      = "claim_starter"
	EvGTCCreateListing  = "gtc_create_listing"
	EvGTCPurchaseListing = "gtc_purchase_listing"
	EvJoinRoom          = "join_room"
	EvLeaveRoom         = "leave_room"
	EvForceDisconnect   = "force_disconnect"
	EvRequestChunk      = "request_chunk"
	EvRequestChunks     = "request_chunks"
)

// Server → client event names.
const (
	EvMapJoined           = "map_joined"
	EvMapPlayers          = "map_players"
	EvPlayerJoined        = "player_joined"
	EvPlayerLeft          = "player_left"
	EvPlayerMoved         = "player_moved"
	EvMoveAck             = "move_ack"
	EvPositionCorrection  = "position_correction"
	EvSessionReplaced     = "session_replaced"
	EvPlayerDefeated      = "player_defeated"
	EvCreatureSpawned     = "creature_spawned"
	EvCreatureDespawned   = "creature_despawned"
	EvCreatureMoved       = "creature_moved"
	EvCreatureHPUpdate    = "creature_hp_update"
	EvCombatUpdate        = "combat_update"
	EvBattleStarted       = "battle_started"
	EvBattleUpdate        = "battle_update"
	EvBattleEnded         = "battle_ended"
	EvMapReloaded         = "map_reloaded"
	EvContentReload       = "content_reload"
	EvShowToast           = "show_toast"
	EvPlayerChat          = "player_chat"
	EvGlobalChatMsg       = "global_chat_msg"
	EvInventorySync       = "inventory_sync"
	EvSyncCredits         = "sync_credits"
	EvDialogueStart       = "dialogue_start"
	EvDialogueEnd         = "dialogue_end"
	EvPartyUpdate         = "party_update"
	EvPartyInviteEvt      = "party_invite"
	EvPresenceUpdated     = "presence.updated"
	EvChunkData           = "chunk_data"
	EvGTCSuccess          = "gtc_transaction_success"
	EvGTCError            = "gtc_transaction_error"
	EvLootSpawned         = "loot_spawned"
	EvLootRemoved         = "loot_removed"
	EvStudioLock          = "studio_lock"
	EvStudioUnlock        = "studio_unlock"
	EvStudioPresence      = "studio_presence"
	EvQuestUpdate         = "quest_update"
	EvSkillXP             = "skill_xp_gained"
	EvNPCSpawned          = "npc_spawned"
	EvNPCDespawned        = "npc_despawned"
	EvUseItem             = "use_item"
	EvDropItem            = "drop_item"
	EvFishAttempt         = "fish_attempt"
	EvClinicHeal          = "clinic_heal"
	EvSyncHP              = "sync_hp"
)

// JoinMapRequest is the client join_map payload.
type JoinMapRequest struct {
	AccountID   string   `json:"accountId"`
	CharacterID string   `json:"characterId"`
	MapID       string   `json:"mapId"`
	Lobby       bool     `json:"lobby"`
	ForceDemo   bool     `json:"forceDemo"`
	IsPrivate   bool     `json:"isPrivate"`
	PIE         bool     `json:"pie"`
	X           *float64 `json:"x"`
	Y           *float64 `json:"y"`
	Name           string   `json:"name"`
	SpriteID       string   `json:"spriteId"`
	AssetProfileID string   `json:"assetProfileId"`
	JoinSeq        uint64   `json:"joinSeq"`
}

// PlayerInput matches PlayerInput on the TS wire.
type PlayerInput struct {
	EntityID  string   `json:"entityId"`
	Sequence  int64    `json:"sequence"`
	Type      string   `json:"type"` // MOVE | MOVE_3D | ATTACK | USE_ITEM | FLEE
	Direction *string  `json:"direction,omitempty"`
	X         *float64 `json:"x,omitempty"`
	Y         *float64 `json:"y,omitempty"`
	Z         *float64 `json:"z,omitempty"`
	VX        *float64 `json:"vx,omitempty"`
	VY        *float64 `json:"vy,omitempty"`
	VZ        *float64 `json:"vz,omitempty"`
	TargetID  string   `json:"targetId,omitempty"`
	AbilityID string   `json:"abilityId,omitempty"`
	ItemID    string   `json:"itemId,omitempty"`
	Timestamp int64    `json:"timestamp"`
}

// VoxelEditPayload is emitted by the client to modify a voxel.
type VoxelEditPayload struct {
	MapID    string `json:"mapId"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
	Z        int    `json:"z"`
	WordLow  uint32 `json:"wordLow"`
	WordHigh uint32 `json:"wordHigh"`
}

// PeerSnapshot is one entry in map_players / player_joined.
type PeerSnapshot struct {
	SocketID  string  `json:"socketId"`
	EntityID  string  `json:"entityId"`
	AccountID string  `json:"accountId,omitempty"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Z         float64 `json:"z"`
	VX        float64 `json:"vx"`
	VY        float64 `json:"vy"`
	VZ        float64 `json:"vz"`
	Direction string  `json:"direction"`
	Name      string  `json:"name"`
	SpriteID  string  `json:"spriteId"`
	IsMoving  bool    `json:"isMoving"`
	HP        int     `json:"hp"`
	MaxHP     int     `json:"maxHp"`
}

// MapJoinedPayload is emitted after successful seat.
type MapJoinedPayload struct {
	InstanceID string  `json:"instanceId"`
	MapID      string  `json:"mapId"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	JoinSeq    uint64  `json:"joinSeq,omitempty"`
}

// CreatureSpawn is creature_spawned payload.
type CreatureSpawn struct {
	ID         string  `json:"id"`
	EntityID   string  `json:"entityId,omitempty"`
	Species    string  `json:"species"`
	TemplateID string  `json:"templateId,omitempty"`
	Name       string  `json:"name"`
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	HP         int     `json:"hp"`
	MaxHP      int     `json:"maxHp"`
	Level      int     `json:"level"`
	Sprite     string  `json:"sprite"`
	SpriteKey  string  `json:"spriteKey,omitempty"`
	MapID      string  `json:"mapId"`
	Hostile    bool    `json:"hostile"`
	EntityType string  `json:"entityType,omitempty"`
}

// ToBaseMapID strips _chN and private suffixes that are instance ids.
func ToBaseMapID(id string) string {
	if id == "" {
		return DemoMapID
	}
	// DEMO_SANDBOX_ch3 → DEMO_SANDBOX
	for i := len(id) - 1; i >= 0; i-- {
		if id[i] == '_' && i+3 < len(id) && id[i+1] == 'c' && id[i+2] == 'h' {
			return id[:i]
		}
	}
	return id
}
