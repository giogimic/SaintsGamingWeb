package socket

import (
	"encoding/json"
	"log"
	"strings"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/aoi"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/auth"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/combat"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/config"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/craft"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/dialogue"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/economy"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/encounter"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/engine"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/inventory"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/party"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/player"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/quest"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/shop"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/skill"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/world"
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
		deps.Inventory = inventory.NewManager()
	}
	if deps.Combat == nil {
		deps.Combat = combat.NewManager()
	}
	if deps.Encounters == nil {
		deps.Encounters = encounter.NewManager()
	}
	if deps.Dialogue == nil {
		deps.Dialogue = dialogue.NewManager()
	}
	if deps.Quests == nil {
		deps.Quests = quest.NewManager()
	}
	if deps.Craft == nil {
		deps.Craft = craft.NewManager()
	}
	if deps.GTC == nil {
		deps.GTC = economy.NewManager()
	}
	if deps.Skills == nil {
		deps.Skills = skill.NewManager()
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
	client.On(protocol.EvCombatAction, func(datas ...any) {
		h.handleCombatAction(accountID, datas)
	})
	client.On(protocol.EvEncounterCheck, func(datas ...any) {
		h.handleEncounter(accountID)
	})
	client.On(protocol.EvGlobalChat, func(datas ...any) {
		h.broadcastChat(accountID, asString(datas, 0), true)
	})
	client.On(protocol.EvChatMessage, func(datas ...any) {
		h.broadcastChat(accountID, asString(datas, 0), false)
	})
	client.On(protocol.EvPartyInvite, func(datas ...any) {
		h.handlePartyInvite(accountID, asString(datas, 0))
	})
	client.On(protocol.EvPartyInviteAccept, func(datas ...any) {
		h.handlePartyAccept(accountID)
	})
	client.On(protocol.EvPartyInviteDecline, func(datas ...any) {
		h.deps.Parties.Decline(accountID)
	})
	client.On(protocol.EvPartyJoin, func(datas ...any) {
		// Treat as invite-accept toward named leader
		leader := asString(datas, 0)
		if leader != "" {
			h.deps.Parties.Invite(leader, accountID)
			h.handlePartyAccept(accountID)
		}
	})
	client.On(protocol.EvPartyLeave, func(datas ...any) {
		h.deps.Parties.Leave(accountID)
		h.EmitToSocket(sid, protocol.EvPartyUpdate, map[string]any{"members": []string{}})
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

func (h *Hub) handleJoinMap(client *socket.Socket, accountID string, req protocol.JoinMapRequest) {
	sid := string(client.Id())
	base := world.ResolvePlayableBase(req.MapID, req.Lobby, req.ForceDemo)
	if _, ok := h.eng.World().GetDef(base); !ok {
		h.eng.World().EnsureDemoDef()
		base = protocol.DemoMapID
	}

	if prev := h.eng.Players().GetByAccount(accountID); prev != nil {
		h.leaveAOI(sid, prev)
		h.LeaveRoom(sid, prev.MapID)
		h.eng.World().LeaveInstance(prev.MapID)
		h.EmitToRoom(prev.MapID, protocol.EvPlayerLeft, map[string]string{"socketId": prev.SocketID, "entityId": prev.EntityID})
		h.eng.Players().Remove(prev.SocketID)
	}

	inst, err := h.eng.World().JoinMap(base, accountID, req.IsPrivate, req.PIE)
	if err != nil {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "join failed: " + err.Error()})
		return
	}

	def, _ := h.eng.World().GetDef(base)
	x, y := def.SpawnX, def.SpawnY
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
		sprite = "player_default"
	}

	p := h.eng.Players().Create(accountID, sid, name, sprite, inst.InstanceID, base, x, y)
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
	})
	h.EmitToSocket(sid, protocol.EvMapPlayers, h.eng.Players().SnapshotPeers(inst.InstanceID, accountID))
	h.EmitToRoom(inst.InstanceID, protocol.EvPlayerJoined, p.Peer())
	for _, c := range h.eng.Creatures().List(inst.InstanceID) {
		h.EmitToSocket(sid, protocol.EvCreatureSpawned, c)
	}
	log.Printf("[socket] join_map account=%s base=%s instance=%s", accountID, base, inst.InstanceID)
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
	spawned := h.eng.Creatures().Spawn(p.MapID, creature.Entity{
		Species: res.Species, Name: res.Species, X: p.X + 1, Y: p.Y,
		Sprite: res.Species, Hostile: true, Level: res.Level, MaxHP: 40 + res.Level*5,
	})
	sess := h.deps.Combat.StartTB(accountID, spawned.ID, p.MapID, p.HP, spawned.HP)
	h.EmitToSocket(p.SocketID, protocol.EvBattleStarted, map[string]any{
		"combatId": sess.ID, "species": res.Species, "level": res.Level, "mode": "tb",
		"creatureId": spawned.ID, "hp": spawned.HP, "maxHp": spawned.MaxHP,
	})
	h.EmitToRoom(p.MapID, protocol.EvCreatureSpawned, spawned)
}

func (h *Hub) handleAttack(accountID, targetID string) {
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
	sess = h.deps.Combat.ApplyPlayerHit(accountID, 10)
	h.EmitToSocket(p.SocketID, protocol.EvCombatUpdate, map[string]any{
		"combatId": sess.ID, "creatureHp": sess.CreatureHP, "playerHp": sess.PlayerHP, "ended": sess.Ended, "winner": sess.Winner,
	})
	if sess.Ended {
		h.finishCombat(accountID, p.SocketID, p.MapID, sess.CreatureID, sess.Winner)
		return
	}
	sess = h.deps.Combat.ApplyCreatureHit(accountID, 6)
	h.EmitToSocket(p.SocketID, protocol.EvCombatUpdate, map[string]any{
		"combatId": sess.ID, "creatureHp": sess.CreatureHP, "playerHp": sess.PlayerHP, "ended": sess.Ended, "winner": sess.Winner,
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
	p := h.eng.Players().Remove(sid)
	if p != nil {
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

func (h *Hub) broadcastChat(accountID, msg string, global bool) {
	msg = strings.TrimSpace(msg)
	if msg == "" {
		return
	}
	p := h.eng.Players().GetByAccount(accountID)
	payload := map[string]any{"accountId": accountID, "message": msg}
	if p != nil {
		payload["name"] = p.Name
		payload["socketId"] = p.SocketID
	}
	if global {
		h.broadcastAll(protocol.EvGlobalChatMsg, payload)
		return
	}
	if p != nil {
		h.EmitToRoom(p.MapID, protocol.EvPlayerChat, payload)
	}
}

func (h *Hub) handlePartyInvite(leader, targetName string) {
	h.mu.RLock()
	accounts := make([]string, 0, len(h.userOf))
	for _, aid := range h.userOf {
		accounts = append(accounts, aid)
	}
	h.mu.RUnlock()
	for _, aid := range accounts {
		st := h.eng.Players().GetByAccount(aid)
		if st == nil {
			continue
		}
		if st.Name == targetName || aid == targetName {
			h.deps.Parties.Invite(leader, aid)
			h.EmitToSocket(st.SocketID, protocol.EvPartyInviteEvt, map[string]string{"from": leader})
			return
		}
	}
}

func (h *Hub) handlePartyAccept(accountID string) {
	p := h.deps.Parties.Accept(accountID)
	if p == nil {
		return
	}
	for _, mid := range p.Members {
		if st := h.eng.Players().GetByAccount(mid); st != nil {
			h.EmitToSocket(st.SocketID, protocol.EvPartyUpdate, map[string]any{
				"leaderId": p.LeaderID, "members": p.Members,
			})
		}
	}
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
