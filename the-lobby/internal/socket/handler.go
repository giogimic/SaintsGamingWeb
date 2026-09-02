package socket

import (
	"encoding/json"
	"log"
	"strings"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/aoi"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/auth"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/combat"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/config"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/craft"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/dialogue"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/economy"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/encounter"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/engine"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/inventory"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/party"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/player"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/quest"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/shop"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/skill"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
	"github.com/zishang520/socket.io/v2/socket"
)

// Deps bundles gameplay managers for the hub.
type Deps struct {
	Parties    *party.Manager
	Inventory  *inventory.Manager
	Combat     *combat.Manager
	Encounters *encounter.Manager
	Dialogue   *dialogue.Manager
	Quests     *quest.Manager
	Craft      *craft.Manager
	GTC        *economy.Manager
	Skills     *skill.Manager
	Loot       *world.LootManager
	SaveMap    func(id, name, grid, npcs, tiles, tilesets string) error
}

// Hub bridges Engine Emitter to Socket.IO rooms.
type Hub struct {
	cfg   config.Config
	eng   *engine.Engine
	deps  Deps
	io    *socket.Server

	mu      sync.RWMutex
	sockets map[string]*socket.Socket
	rooms   map[string]map[string]struct{}
	userOf  map[string]string
}

func NewHub(cfg config.Config, eng *engine.Engine, deps Deps) *Hub {
	if deps.Parties == nil {
		deps.Parties = party.NewManager()
	}
	if deps.Inventory == nil {
		deps.Inventory = inventory.NewManager(nil)
	}
	if deps.Combat == nil {
		deps.Combat = combat.NewManager()
	}
	if deps.Encounters == nil {
		deps.Encounters = encounter.NewManager(nil)
	}
	if deps.Dialogue == nil {
		deps.Dialogue = dialogue.NewManager(nil)
	}
	if deps.Quests == nil {
		deps.Quests = quest.NewManager(nil)
	}
	if deps.Craft == nil {
		deps.Craft = craft.NewManager()
	}
	if deps.GTC == nil {
		deps.GTC = economy.NewManager()
	}
	if deps.Skills == nil {
		deps.Skills = skill.NewManager(nil)
	}
	if deps.Loot == nil {
		deps.Loot = world.NewLootManager()
	}
	return &Hub{
		cfg:     cfg,
		eng:     eng,
		deps:    deps,
		sockets: make(map[string]*socket.Socket),
		rooms:   make(map[string]map[string]struct{}),
		userOf:  make(map[string]string),
	}
}

func (h *Hub) Attach(io *socket.Server) {
	h.io = io
	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		h.onConnect(client)
	})
}

func (h *Hub) onConnect(client *socket.Socket) {
	sid := string(client.Id())
	accountID := h.authenticate(client)
	if accountID == "" {
		log.Printf("[socket] reject unauthenticated %s", sid)
		client.Emit("error", map[string]string{"message": "unauthorized"})
		client.Disconnect(true)
		return
	}

	h.mu.Lock()
	h.sockets[sid] = client
	h.userOf[sid] = accountID
	h.mu.Unlock()

	if prev := h.eng.Players().SocketIDForAccount(accountID); prev != "" && prev != sid {
		h.EmitToSocket(prev, protocol.EvSessionReplaced, map[string]string{"reason": "new_session"})
		if prevSock := h.getSocket(prev); prevSock != nil {
			prevSock.Disconnect(true)
		}
		// Seamlessly migrate world seat to new socket without destroying player state
		if p := h.eng.Players().GetByAccount(accountID); p != nil {
			h.eng.Players().UpdateSocket(accountID, sid)
			h.JoinRoom(sid, p.MapID)
			h.joinAOI(sid, p)
			log.Printf("[socket] SESSION_MIGRATED account=%s oldSid=%s newSid=%s map=%s", accountID, prev, sid, p.MapID)
		}
	}

	log.Printf("[socket] connected account=%s sid=%s", accountID, sid)
	h.JoinRoom(sid, "user:"+accountID)
	h.deps.Inventory.Ensure(accountID)
	h.EmitToSocket(sid, protocol.EvPresenceUpdated, map[string]any{
		"accountId": accountID, "status": "online",
	})
	h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": h.deps.Inventory.List(accountID)})
	h.EmitToSocket(sid, protocol.EvSyncCredits, map[string]any{"credits": h.deps.Inventory.Credits(accountID)})

	client.On(protocol.EvJoinMap, func(datas ...any) {
		h.handleJoinMap(client, accountID, decodeJoin(datas))
	})
	client.On(protocol.EvInput, func(datas ...any) {
		in := decodeInput(datas)
		h.eng.Players().EnqueueInput(accountID, in)
		if in.Type == "ATTACK" {
			h.handleAttack(accountID, in.TargetID)
		}
	})
	client.On("move", func(datas ...any) {
		h.handleDirectMove(accountID, datas)
	})
	client.On("player_move", func(datas ...any) {
		h.handleDirectMove(accountID, datas)
	})
	client.On(protocol.EvCombatAction, func(datas ...any) {
		h.handleCombatAction(accountID, datas)
	})
	client.On(protocol.EvEncounterCheck, func(datas ...any) {
		h.handleEncounter(accountID)
	})
	client.On(protocol.EvGlobalChat, func(datas ...any) {
		h.broadcastChat(accountID, sid, asString(datas, 0), true)
	})
	client.On(protocol.EvChatMessage, func(datas ...any) {
		h.broadcastChat(accountID, sid, asString(datas, 0), false)
	})
	client.On(protocol.EvPartyInvite, func(datas ...any) {
		h.handlePartyInvite(accountID, datas)
	})
	client.On("party_invite_send", func(datas ...any) {
		h.handlePartyInvite(accountID, datas)
	})
	client.On(protocol.EvPartyInviteAccept, func(datas ...any) {
		h.handlePartyAccept(accountID)
	})
	client.On("party_invite_accept", func(datas ...any) {
		h.handlePartyAccept(accountID)
	})
	client.On(protocol.EvPartyInviteDecline, func(datas ...any) {
		h.deps.Parties.Decline(accountID)
	})
	client.On("party_invite_decline", func(datas ...any) {
		h.deps.Parties.Decline(accountID)
	})
	client.On(protocol.EvPartyJoin, func(datas ...any) {
		leader := asString(datas, 0)
		if leader != "" {
			h.deps.Parties.Invite(leader, accountID)
			h.handlePartyAccept(accountID)
		}
	})
	client.On(protocol.EvPartyLeave, func(datas ...any) {
		h.handlePartyLeave(accountID)
	})
	client.On("party_leave", func(datas ...any) {
		h.handlePartyLeave(accountID)
	})
	client.On("battle_invite_send", func(datas ...any) {
		h.handleBattleInvite(accountID, datas)
	})
	client.On("accept_battle", func(datas ...any) {
		h.handleAcceptBattle(accountID, datas)
	})
	client.On(protocol.EvNPCInteract, func(datas ...any) {
		h.handleNPCInteractFull(accountID, datas)
	})
	client.On(protocol.EvDialogueSelect, func(datas ...any) {
		h.handleDialogueSelectFull(accountID, datas)
	})
	client.On(protocol.EvShopCatalog, func(datas ...any) {
		h.EmitToSocket(sid, "shop_catalog", map[string]any{"items": shop.DefaultCatalog()})
	})
	client.On(protocol.EvShopBuy, func(datas ...any) {
		h.handleShopBuy(accountID, datas)
	})
	client.On(protocol.EvShopSell, func(datas ...any) {
		h.handleShopSell(accountID, datas)
	})
	client.On(protocol.EvClaimStarter, func(datas ...any) {
		items := h.deps.Inventory.AddItem(accountID, "starter_creature", "Starter", 1)
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Starter claimed (Go backend)"})
		h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": items})
	})
	client.On(protocol.EvForceDisconnect, func(datas ...any) {
		client.Disconnect(true)
	})
	h.registerGameplay(client, accountID, sid)
	client.On("disconnect", func(datas ...any) {
		h.onDisconnect(sid, accountID)
	})
}

func (h *Hub) authenticate(client *socket.Socket) string {
	if h.cfg.DevAuthBypass {
		if authData := client.Handshake().Auth; authData != nil {
			if m, ok := authData.(map[string]any); ok {
				if tok, ok := m["token"].(string); ok && tok != "" {
					if s := auth.DevBypassToken(tok); s != nil {
						return s.UserID
					}
				}
			}
		}
	}
	if ctx := client.Request(); ctx != nil {
		if s, err := auth.SessionFromRequest(ctx.Request(), h.cfg.AuthSecret); err == nil {
			return s.UserID
		}
	}
	if h.cfg.DevAuthBypass {
		return "dev_" + string(client.Id())
	}
	return ""
}

func isSamePolicy(instanceID, baseMapID, accountID string, isPrivate, pie bool) bool {
	if pie {
		return world.IsStudioPIE(instanceID)
	}
	if isPrivate {
		return instanceID == world.PrivateInstanceID(baseMapID, accountID)
	}
	return world.IsPublicChannel(instanceID)
}

func (h *Hub) handleJoinMap(client *socket.Socket, accountID string, req protocol.JoinMapRequest) {
	sid := string(client.Id())
	base := world.ResolvePlayableBase(req.MapID, req.Lobby, req.ForceDemo)
	if _, ok := h.eng.World().GetDef(base); !ok {
		h.eng.World().EnsureDemoDef()
		base = protocol.DemoMapID
	}

	// 1. Character ownership validation: Reject if character is actively controlled by another account
	if req.CharacterID != "" {
		if existing := h.eng.Players().GetByCharacter(req.CharacterID); existing != nil && existing.AccountID != accountID {
			log.Printf("[socket] JOIN_REJECT account=%s char=%s reason=character_owned_by_other targetAccount=%s", accountID, req.CharacterID, existing.AccountID)
			h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Character is currently active on another account."})
			return
		}
	}

	// 2. Check for existing player on this account
	if prev := h.eng.Players().GetByAccount(accountID); prev != nil {
		sameChar := req.CharacterID == "" || req.CharacterID == prev.CharacterID
		sameBase := prev.BaseMapID == base
		samePolicy := isSamePolicy(prev.MapID, base, accountID, req.IsPrivate, req.PIE)

		if sameChar && sameBase && samePolicy {
			// IDEMPOTENT RE-JOIN / RECOVERY:
			// Do NOT leave AOI, do NOT broadcast player_left, do NOT destroy state.
			if prev.SocketID != sid {
				// Reconnect case: transfer socket to new connection
				oldSid := prev.SocketID
				h.eng.Players().UpdateSocket(accountID, sid)
				if oldSid != "" {
					h.leaveAOI(oldSid, prev)
					h.LeaveRoom(oldSid, prev.MapID)
				}
				h.JoinRoom(sid, prev.MapID)
				h.joinAOI(sid, prev)
			}

			// Update name/sprite/character if provided
			if req.Name != "" {
				prev.Name = req.Name
			}
			if req.SpriteID != "" {
				prev.SpriteID = req.SpriteID
			} else if req.AssetProfileID != "" {
				prev.SpriteID = req.AssetProfileID
			}
			if req.CharacterID != "" {
				prev.CharacterID = req.CharacterID
			}

			h.EmitToSocket(sid, protocol.EvMapJoined, protocol.MapJoinedPayload{
				InstanceID: prev.MapID,
				MapID:      prev.BaseMapID,
				X:          prev.X,
				Y:          prev.Y,
				JoinSeq:    req.JoinSeq,
			})
			h.EmitToSocket(sid, protocol.EvMapPlayers, h.eng.Players().SnapshotPeers(prev.MapID, accountID))
			log.Printf("[socket] JOIN_IDEMPOTENT account=%s char=%s base=%s instance=%s seq=%d", accountID, prev.CharacterID, base, prev.MapID, req.JoinSeq)
			return
		}

		// TRANSITION CASE: Cleanly leave old world seat
		log.Printf("[socket] JOIN_TRANSITION account=%s oldMap=%s oldChar=%s newBase=%s newChar=%s", accountID, prev.MapID, prev.CharacterID, base, req.CharacterID)
		h.leaveAOI(prev.SocketID, prev)
		h.LeaveRoom(prev.SocketID, prev.MapID)
		h.eng.World().LeaveInstance(prev.MapID)
		h.EmitToRoom(prev.MapID, protocol.EvPlayerLeft, map[string]string{"socketId": prev.SocketID, "entityId": prev.EntityID})
		h.eng.Players().Remove(prev.SocketID)
	}

	inst, err := h.eng.World().JoinMap(base, accountID, req.IsPrivate, req.PIE)
	if err != nil {
		log.Printf("[socket] JOIN_REJECT account=%s reason=%v", accountID, err)
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "join failed: " + err.Error()})
		return
	}

	def, _ := h.eng.World().GetDef(base)
	x, y := def.SpawnX, def.SpawnY
	hot := h.eng.Players().LoadHot(accountID)
	if hot.OK && req.X == nil && req.Y == nil {
		// Prefer saved seat when rejoining the same base map without an explicit spawn.
		if hot.MapID == "" || hot.MapID == base {
			x, y = hot.X, hot.Y
		}
	}
	if req.X != nil {
		x = *req.X
	}
	if req.Y != nil {
		y = *req.Y
	}
	name := req.Name
	if name == "" {
		name = "Traveler"
	}
	sprite := req.SpriteID
	if sprite == "" {
		sprite = req.AssetProfileID
	}
	if sprite == "" {
		sprite = "player_default"
	}

	p := h.eng.Players().CreateWithCharacter(accountID, req.CharacterID, sid, name, sprite, inst.InstanceID, base, x, y)
	if hot.OK && hot.Credits > 0 {
		p.Credits = hot.Credits
	}
	h.deps.Inventory.Ensure(accountID)
	h.JoinRoom(sid, inst.InstanceID)
	h.joinAOI(sid, p)

	if inst.PlayerCount == 1 && world.IsPublicChannel(inst.InstanceID) && base == protocol.DemoMapID {
		h.eng.Creatures().SeedDemoSpawns(inst.InstanceID)
	}

	h.EmitToSocket(sid, protocol.EvMapJoined, protocol.MapJoinedPayload{
		InstanceID: inst.InstanceID,
		MapID:      base,
		X:          p.X,
		Y:          p.Y,
		JoinSeq:    req.JoinSeq,
	})
	h.EmitToSocket(sid, protocol.EvMapPlayers, h.eng.Players().SnapshotPeers(inst.InstanceID, accountID))
	h.EmitToRoom(inst.InstanceID, protocol.EvPlayerJoined, p.Peer())
	for _, c := range h.eng.Creatures().List(inst.InstanceID) {
		h.EmitToSocket(sid, protocol.EvCreatureSpawned, c)
	}
	log.Printf("[socket] JOIN_ACCEPTED account=%s char=%s base=%s instance=%s seq=%d", accountID, req.CharacterID, base, inst.InstanceID, req.JoinSeq)
}

func (h *Hub) handleEncounter(accountID string) {
	p := h.eng.Players().GetByAccount(accountID)
	if p == nil {
		return
	}
	tile := protocol.TileGrass
	if def, ok := h.eng.World().GetDef(p.BaseMapID); ok {
		ix, iy := int(p.X), int(p.Y)
		if iy >= 0 && iy < len(def.Grid) && ix >= 0 && ix < len(def.Grid[iy]) {
			tile = def.Grid[iy][ix]
		}
	}
	res := h.deps.Encounters.Check(accountID, tile)
	if !res.Triggered {
		return
	}
	maxHP := res.BaseHP
	if maxHP < 1 {
		maxHP = 40 + res.Level*5
	}
	spawned := h.eng.Creatures().Spawn(p.MapID, creature.Entity{
		Species: res.Species, Name: res.Species, X: p.X + 1, Y: p.Y,
		Sprite: res.Species, Hostile: true, Level: res.Level, MaxHP: maxHP,
	})
	ps := combat.DefaultPlayerStats(p.HP)
	cs := combat.DefaultCreatureStats(res.Level, maxHP)
	sess := h.deps.Combat.StartTBWithStats(accountID, spawned.ID, p.MapID, p.HP, spawned.HP, ps, cs)
	h.EmitToSocket(p.SocketID, protocol.EvBattleStarted, map[string]any{
		"combatId": sess.ID, "species": res.Species, "level": res.Level, "mode": "tb",
		"creatureId": spawned.ID, "hp": spawned.HP, "maxHp": spawned.MaxHP,
	})
	h.EmitToRoom(p.MapID, protocol.EvCreatureSpawned, spawned)
}

func (h *Hub) handleAttack(accountID, targetID, abilityID string) {
	p := h.eng.Players().GetByAccount(accountID)
	if p == nil {
		return
	}
	sess := h.deps.Combat.GetByPlayer(accountID)
	if sess == nil && targetID != "" {
		sess = h.deps.Combat.Start(accountID, targetID, p.MapID, p.HP, 50)
		h.EmitToSocket(p.SocketID, protocol.EvCombatUpdate, map[string]any{"combatId": sess.ID, "phase": "start"})
	}
	if sess == nil {
		return
	}
	
	sess = h.deps.Combat.ApplyPlayerHit(accountID, abilityID)
	h.EmitToRoom(p.MapID, protocol.EvCombatUpdate, map[string]any{
		"combatId": sess.ID, "attackerHp": sess.PlayerHP, "targetHp": sess.CreatureHP, "ended": sess.Ended, "winner": sess.Winner,
		"attackerId": accountID, "targetId": sess.CreatureID, "damage": sess.LastDamage, "isCrit": sess.LastCrit,
	})
	
	if sess.Ended {
		h.finishCombat(accountID, p.SocketID, p.MapID, sess.CreatureID, sess.Winner)
		return
	}
	
	sess = h.deps.Combat.ApplyCreatureHit(accountID, "strike")
	h.EmitToRoom(p.MapID, protocol.EvCombatUpdate, map[string]any{
		"combatId": sess.ID, "attackerHp": sess.CreatureHP, "targetHp": sess.PlayerHP, "ended": sess.Ended, "winner": sess.Winner,
		"attackerId": sess.CreatureID, "targetId": accountID, "damage": sess.LastDamage, "isCrit": sess.LastCrit,
	})
	
	if sess.Ended {
		h.finishCombat(accountID, p.SocketID, p.MapID, sess.CreatureID, sess.Winner)
	}
}

func (h *Hub) handleCombatAction(accountID string, datas []any) {
	action := "attack"
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if a, ok := m["action"].(string); ok {
				action = a
			}
			if t, ok := m["targetId"].(string); ok {
				h.handleAttack(accountID, t)
				return
			}
		}
	}
	if action == "flee" {
		h.deps.Combat.End(accountID)
		if p := h.eng.Players().GetByAccount(accountID); p != nil {
			h.EmitToSocket(p.SocketID, protocol.EvBattleEnded, map[string]any{"winner": "flee"})
		}
		return
	}
	h.handleAttack(accountID, "")
}

func (h *Hub) handleShopBuy(accountID string, datas []any) {
	id, qty := "potion", 1
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["itemId"].(string); ok {
				id = v
			}
			if v, ok := m["id"].(string); ok {
				id = v
			}
			if v, ok := m["qty"].(float64); ok {
				qty = int(v)
			}
		}
	}
	cat, ok := shop.Find(id)
	p := h.eng.Players().GetByAccount(accountID)
	sid := ""
	if p != nil {
		sid = p.SocketID
	} else {
		sid = h.eng.Players().SocketIDForAccount(accountID)
	}
	if !ok {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "unknown item"})
		return
	}
	okBuy, credits, items := h.deps.Inventory.Buy(accountID, cat.ID, cat.Name, cat.Price, qty)
	if !okBuy {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "not enough credits"})
		return
	}
	h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": items})
	h.EmitToSocket(sid, protocol.EvSyncCredits, map[string]any{"credits": credits})
}

func (h *Hub) handleShopSell(accountID string, datas []any) {
	id, qty := "potion", 1
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["itemId"].(string); ok {
				id = v
			}
			if v, ok := m["qty"].(float64); ok {
				qty = int(v)
			}
		}
	}
	p := h.eng.Players().GetByAccount(accountID)
	sid := ""
	if p != nil {
		sid = p.SocketID
	}
	okSell, credits, items := h.deps.Inventory.Sell(accountID, id, 10, qty)
	if !okSell {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "cannot sell"})
		return
	}
	h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": items})
	h.EmitToSocket(sid, protocol.EvSyncCredits, map[string]any{"credits": credits})
}

func (h *Hub) onDisconnect(sid, accountID string) {
	p := h.eng.Players().GetBySocket(sid)
	if p != nil && p.SocketID == sid {
		h.eng.Players().Remove(sid)
		h.leaveAOI(sid, p)
		h.LeaveRoom(sid, p.MapID)
		h.eng.World().LeaveInstance(p.MapID)
		h.EmitToRoom(p.MapID, protocol.EvPlayerLeft, map[string]string{"socketId": p.SocketID, "entityId": p.EntityID})
	}
	h.deps.Combat.End(accountID)
	h.mu.Lock()
	delete(h.sockets, sid)
	delete(h.userOf, sid)
	h.mu.Unlock()
	log.Printf("[socket] disconnect account=%s sid=%s", accountID, sid)
}

func (h *Hub) joinAOI(sid string, p *player.State) {
	h.JoinRoom(sid, aoi.RoomName(p.MapID, p.ZoneX, p.ZoneY))
}

func (h *Hub) leaveAOI(sid string, p *player.State) {
	h.LeaveRoom(sid, aoi.RoomName(p.MapID, p.ZoneX, p.ZoneY))
}

func (h *Hub) broadcastChat(accountID, sid, msg string, global bool) {
	msg = strings.TrimSpace(msg)
	if msg == "" {
		return
	}
	p := h.eng.Players().GetByAccount(accountID)
	payload := map[string]any{
		"accountId": accountID,
		"message":   msg,
		"socketId":  sid,
	}
	if p != nil {
		payload["name"] = p.Name
		payload["sender"] = p.Name
		if p.SocketID != "" {
			payload["socketId"] = p.SocketID
		}
	}
	if global {
		h.broadcastAll(protocol.EvGlobalChatMsg, payload)
		return
	}
	if p != nil {
		h.EmitToRoom(p.MapID, protocol.EvPlayerChat, payload)
	}
}

func (h *Hub) handlePartyInvite(leader string, datas []any) {
	targetName := ""
	if len(datas) > 0 {
		if s, ok := datas[0].(string); ok {
			targetName = s
		} else {
			b, _ := json.Marshal(datas[0])
			var m map[string]any
			if json.Unmarshal(b, &m) == nil {
				if v, ok := m["targetName"].(string); ok && v != "" {
					targetName = v
				}
				if v, ok := m["targetId"].(string); ok && targetName == "" {
					targetName = v
				}
			}
		}
	}
	if targetName == "" {
		return
	}
	sender := h.eng.Players().GetByAccount(leader)
	if sender == nil {
		return
	}
	var targetPlayer *player.State
	h.eng.Players().ForEach(func(st *player.State) {
		if strings.EqualFold(st.Name, targetName) || st.AccountID == targetName || st.SocketID == targetName {
			targetPlayer = st
		}
	})
	if targetPlayer == nil || targetPlayer.AccountID == leader {
		h.EmitToSocket(sender.SocketID, protocol.EvShowToast, map[string]string{"message": "Player not found or offline."})
		return
	}
	h.deps.Parties.Invite(leader, targetPlayer.AccountID)
	h.EmitToSocket(targetPlayer.SocketID, protocol.EvPartyInviteEvt, map[string]any{
		"fromName": sender.Name,
		"fromAccountId": leader,
	})
	h.EmitToSocket(sender.SocketID, protocol.EvShowToast, map[string]string{"message": "Sent party invitation to " + targetPlayer.Name})
}

func (h *Hub) handlePartyAccept(accountID string) {
	p := h.deps.Parties.Accept(accountID)
	if p == nil {
		return
	}
	for _, mid := range p.Members {
		if st := h.eng.Players().GetByAccount(mid); st != nil {
			h.EmitToSocket(st.SocketID, protocol.EvPartyUpdate, map[string]any{
				"type": "UPDATE",
				"leaderId": p.LeaderID,
				"members": p.Members,
			})
			h.EmitToSocket(st.SocketID, protocol.EvShowToast, map[string]string{"message": "Party updated"})
		}
	}
}

func (h *Hub) handlePartyLeave(accountID string) {
	p := h.deps.Parties.Get(accountID)
	h.deps.Parties.Leave(accountID)
	if p != nil {
		for _, mid := range p.Members {
			if st := h.eng.Players().GetByAccount(mid); st != nil {
				h.EmitToSocket(st.SocketID, protocol.EvPartyUpdate, map[string]any{
					"type": "LEFT",
					"members": []string{},
				})
			}
		}
	}
}

func (h *Hub) handleBattleInvite(accountID string, datas []any) {
	targetName := ""
	if len(datas) > 0 {
		if s, ok := datas[0].(string); ok {
			targetName = s
		} else {
			b, _ := json.Marshal(datas[0])
			var m map[string]any
			if json.Unmarshal(b, &m) == nil {
				if v, ok := m["targetName"].(string); ok && v != "" {
					targetName = v
				}
				if v, ok := m["targetId"].(string); ok && targetName == "" {
					targetName = v
				}
			}
		}
	}
	sender := h.eng.Players().GetByAccount(accountID)
	if sender == nil || targetName == "" {
		return
	}
	var targetPlayer *player.State
	h.eng.Players().ForEach(func(st *player.State) {
		if strings.EqualFold(st.Name, targetName) || st.AccountID == targetName || st.SocketID == targetName {
			targetPlayer = st
		}
	})
	if targetPlayer == nil || targetPlayer.AccountID == accountID {
		h.EmitToSocket(sender.SocketID, protocol.EvShowToast, map[string]string{"message": "Tamer not found or offline."})
		return
	}
	h.EmitToSocket(targetPlayer.SocketID, "battle_invite_received", map[string]any{
		"from": accountID,
		"name": sender.Name,
	})
	h.EmitToSocket(sender.SocketID, protocol.EvShowToast, map[string]string{"message": "Challenged " + targetPlayer.Name + " to a battle!"})
}

func (h *Hub) handleAcceptBattle(accountID string, datas []any) {
	challengerID := asString(datas, 0)
	if challengerID == "" {
		return
	}
	p1 := h.eng.Players().GetByAccount(accountID)
	p2 := h.eng.Players().GetByAccount(challengerID)
	if p1 == nil || p2 == nil {
		return
	}
	sess := h.deps.Combat.StartTB(challengerID, accountID, p1.MapID, p2.HP, p1.HP)
	h.EmitToSocket(p1.SocketID, protocol.EvBattleStarted, map[string]any{
		"combatId": sess.ID, "mode": "tb", "creatureId": challengerID, "opponentName": p2.Name,
		"hp": p1.HP, "maxHp": p1.MaxHP, "opponentHp": p2.HP, "opponentMaxHp": p2.MaxHP,
	})
	h.EmitToSocket(p2.SocketID, protocol.EvBattleStarted, map[string]any{
		"combatId": sess.ID, "mode": "tb", "creatureId": accountID, "opponentName": p1.Name,
		"hp": p2.HP, "maxHp": p2.MaxHP, "opponentHp": p1.HP, "opponentMaxHp": p1.MaxHP,
	})
}

func (h *Hub) EmitToSocket(socketID, event string, payload any) {
	s := h.getSocket(socketID)
	if s == nil {
		return
	}
	_ = s.Emit(event, payload)
}

func (h *Hub) EmitToRoom(room, event string, payload any) {
	if strings.HasPrefix(room, "aoi-broadcast:") {
		parts := strings.Split(room, ":")
		if len(parts) == 4 {
			inst := parts[1]
			zx := atoi(parts[2])
			zy := atoi(parts[3])
			for _, r := range aoi.NeighborRooms(inst, zx, zy) {
				h.emitRoomRaw(r, event, payload)
			}
			return
		}
	}
	h.emitRoomRaw(room, event, payload)
}

func (h *Hub) emitRoomRaw(room, event string, payload any) {
	h.mu.RLock()
	members := h.rooms[room]
	ids := make([]string, 0, len(members))
	for id := range members {
		ids = append(ids, id)
	}
	h.mu.RUnlock()
	for _, id := range ids {
		h.EmitToSocket(id, event, payload)
	}
}

func (h *Hub) broadcastAll(event string, payload any) {
	h.mu.RLock()
	ids := make([]string, 0, len(h.sockets))
	for id := range h.sockets {
		ids = append(ids, id)
	}
	h.mu.RUnlock()
	for _, id := range ids {
		h.EmitToSocket(id, event, payload)
	}
}

// BroadcastAll fans an event to every connected socket (e.g. map_reloaded from Next sync).
func (h *Hub) BroadcastAll(event string, payload any) {
	h.broadcastAll(event, payload)
}

func (h *Hub) JoinRoom(socketID, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.joinRoomLocked(socketID, room)
	if s := h.sockets[socketID]; s != nil {
		s.Join(socket.Room(room))
	}
}

func (h *Hub) joinRoomLocked(socketID, room string) {
	members, ok := h.rooms[room]
	if !ok {
		members = make(map[string]struct{})
		h.rooms[room] = members
	}
	members[socketID] = struct{}{}
}

func (h *Hub) LeaveRoom(socketID, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if members, ok := h.rooms[room]; ok {
		delete(members, socketID)
		if len(members) == 0 {
			delete(h.rooms, room)
		}
	}
	if s := h.sockets[socketID]; s != nil {
		s.Leave(socket.Room(room))
	}
}

func (h *Hub) getSocket(id string) *socket.Socket {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.sockets[id]
}

func decodeJoin(datas []any) protocol.JoinMapRequest {
	var req protocol.JoinMapRequest
	if len(datas) == 0 {
		return req
	}
	b, _ := json.Marshal(datas[0])
	_ = json.Unmarshal(b, &req)
	return req
}

func decodeInput(datas []any) protocol.PlayerInput {
	var in protocol.PlayerInput
	if len(datas) == 0 {
		return in
	}
	b, _ := json.Marshal(datas[0])
	_ = json.Unmarshal(b, &in)
	return in
}

func asString(datas []any, i int) string {
	if i >= len(datas) || datas[i] == nil {
		return ""
	}
	switch v := datas[i].(type) {
	case string:
		return v
	default:
		b, _ := json.Marshal(v)
		return strings.Trim(string(b), `"`)
	}
}

func atoi(s string) int {
	n := 0
	neg := false
	for i, c := range s {
		if i == 0 && c == '-' {
			neg = true
			continue
		}
		if c < '0' || c > '9' {
			break
		}
		n = n*10 + int(c-'0')
	}
	if neg {
		return -n
	}
	return n
}

func (h *Hub) handleDirectMove(accountID string, datas []any) {
	if len(datas) == 0 {
		return
	}
	var req struct {
		X         *float64 `json:"x"`
		Y         *float64 `json:"y"`
		Direction string   `json:"direction"`
		Moving    bool     `json:"moving"`
		Seq       uint64   `json:"seq"`
	}
	b, err := json.Marshal(datas[0])
	if err != nil {
		return
	}
	if err := json.Unmarshal(b, &req); err != nil {
		return
	}
	p := h.eng.Players().GetByAccount(accountID)
	if p == nil {
		return
	}
	nx, ny := p.X, p.Y
	if req.X != nil {
		nx = *req.X
	}
	if req.Y != nil {
		ny = *req.Y
	}
	dir := req.Direction
	if dir == "" {
		dir = p.Direction
	}
	if h.eng.World().IsWalkable(p.BaseMapID, int(nx), int(ny)) {
		h.eng.Players().ApplyMove(accountID, nx, ny, dir, int64(req.Seq))
	}
}
