package socket

import (
	"encoding/json"
	"log"
	"strings"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/aoi"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/auth"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/config"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/engine"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/party"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/player"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/world"
	"github.com/zishang520/socket.io/v2/socket"
)

// Hub bridges Engine Emitter to Socket.IO rooms.
type Hub struct {
	cfg    config.Config
	eng    *engine.Engine
	parties *party.Manager
	io     *socket.Server

	mu       sync.RWMutex
	sockets  map[string]*socket.Socket // socketID -> socket
	rooms    map[string]map[string]struct{} // room -> socketIDs
	userOf   map[string]string // socketID -> accountID
}

func NewHub(cfg config.Config, eng *engine.Engine, parties *party.Manager) *Hub {
	return &Hub{
		cfg:     cfg,
		eng:     eng,
		parties: parties,
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
		_ = client.Disconnect(true)
		return
	}

	h.mu.Lock()
	h.sockets[sid] = client
	h.userOf[sid] = accountID
	h.mu.Unlock()

	// One account = one lobby seat
	if prev := h.eng.Players().SocketIDForAccount(accountID); prev != "" && prev != sid {
		h.EmitToSocket(prev, protocol.EvSessionReplaced, map[string]string{"reason": "new_session"})
		if prevSock := h.getSocket(prev); prevSock != nil {
			_ = prevSock.Disconnect(true)
		}
	}

	log.Printf("[socket] connected account=%s sid=%s", accountID, sid)
	h.joinRoomLocked(sid, "user:"+accountID)
	h.EmitToSocket(sid, protocol.EvPresenceUpdated, map[string]any{
		"accountId": accountID, "status": "online",
	})

	client.On(protocol.EvJoinMap, func(datas ...any) {
		req := decodeJoin(datas)
		h.handleJoinMap(client, accountID, req)
	})
	client.On(protocol.EvInput, func(datas ...any) {
		in := decodeInput(datas)
		h.eng.Players().EnqueueInput(accountID, in)
	})
	client.On(protocol.EvGlobalChat, func(datas ...any) {
		msg := asString(datas, 0)
		h.broadcastChat(accountID, msg, true)
	})
	client.On(protocol.EvChatMessage, func(datas ...any) {
		msg := asString(datas, 0)
		h.broadcastChat(accountID, msg, false)
	})
	client.On(protocol.EvPartyInvite, func(datas ...any) {
		target := asString(datas, 0)
		h.handlePartyInvite(accountID, target)
	})
	client.On(protocol.EvPartyInviteAccept, func(datas ...any) {
		h.handlePartyAccept(accountID)
	})
	client.On(protocol.EvPartyInviteDecline, func(datas ...any) {
		h.parties.Decline(accountID)
	})
	client.On(protocol.EvPartyLeave, func(datas ...any) {
		h.parties.Leave(accountID)
		h.EmitToSocket(sid, protocol.EvPartyUpdate, map[string]any{"members": []string{}})
	})
	client.On(protocol.EvNPCInteract, func(datas ...any) {
		h.EmitToSocket(sid, protocol.EvDialogueStart, map[string]any{
			"id": "demo_welcome",
			"lines": []string{"Welcome to the Go MMO sandbox.", "Walk with WASD / arrows. Peers share your shard."},
		})
	})
	client.On(protocol.EvDialogueSelect, func(datas ...any) {
		h.EmitToSocket(sid, protocol.EvDialogueEnd, map[string]any{})
	})
	client.On(protocol.EvShopCatalog, func(datas ...any) {
		h.EmitToSocket(sid, "shop_catalog", map[string]any{
			"items": []map[string]any{
				{"id": "potion", "name": "Potion", "price": 25},
				{"id": "revive", "name": "Revive Dust", "price": 100},
			},
		})
	})
	client.On(protocol.EvClaimStarter, func(datas ...any) {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Starter claimed (Go backend)"})
		h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{
			"items": []map[string]any{{"id": "starter_creature", "qty": 1}},
		})
	})
	client.On(protocol.EvForceDisconnect, func(datas ...any) {
		_ = client.Disconnect(true)
	})
	client.On("disconnect", func(datas ...any) {
		h.onDisconnect(sid, accountID)
	})
}

func (h *Hub) authenticate(client *socket.Socket) string {
	// Handshake auth.token (dev bypass)
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
	// Cookie JWT from request headers
	if ctx := client.Request(); ctx != nil {
		if s, err := auth.SessionFromRequest(ctx.Request(), h.cfg.AuthSecret); err == nil {
			return s.UserID
		}
	}
	if h.cfg.DevAuthBypass {
		// Last resort for local smoke: anonymous ephemeral id
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

	// Leave prior instance
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

	// Seed creatures once per public shard when first player arrives
	if inst.PlayerCount == 1 && world.IsPublicChannel(inst.InstanceID) && base == protocol.DemoMapID {
		h.eng.Creatures().SeedDemoSpawns(inst.InstanceID)
	}

	h.EmitToSocket(sid, protocol.EvMapJoined, protocol.MapJoinedPayload{
		InstanceID: inst.InstanceID,
		MapID:      base,
		X:          p.X,
		Y:          p.Y,
	})
	peers := h.eng.Players().SnapshotPeers(inst.InstanceID, accountID)
	h.EmitToSocket(sid, protocol.EvMapPlayers, peers)
	h.EmitToRoom(inst.InstanceID, protocol.EvPlayerJoined, p.Peer())

	for _, c := range h.eng.Creatures().List(inst.InstanceID) {
		h.EmitToSocket(sid, protocol.EvCreatureSpawned, c)
	}

	log.Printf("[socket] join_map account=%s base=%s instance=%s", accountID, base, inst.InstanceID)
}

func (h *Hub) onDisconnect(sid, accountID string) {
	p := h.eng.Players().Remove(sid)
	if p != nil {
		h.leaveAOI(sid, p)
		h.LeaveRoom(sid, p.MapID)
		h.eng.World().LeaveInstance(p.MapID)
		h.EmitToRoom(p.MapID, protocol.EvPlayerLeft, map[string]string{"socketId": p.SocketID, "entityId": p.EntityID})
	}
	h.mu.Lock()
	delete(h.sockets, sid)
	delete(h.userOf, sid)
	h.mu.Unlock()
	log.Printf("[socket] disconnect account=%s sid=%s", accountID, sid)
}

func (h *Hub) joinAOI(sid string, p *player.State) {
	room := aoi.RoomName(p.MapID, p.ZoneX, p.ZoneY)
	h.JoinRoom(sid, room)
}

func (h *Hub) leaveAOI(sid string, p *player.State) {
	room := aoi.RoomName(p.MapID, p.ZoneX, p.ZoneY)
	h.LeaveRoom(sid, room)
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
	// Resolve target by display name (simple scan)
	h.mu.RLock()
	defer h.mu.RUnlock()
	var targetAccount string
	for _, p := range h.eng.Players().ListOnInstance("") {
		_ = p
	}
	// Fallback: treat targetName as account id
	targetAccount = targetName
	for _, sock := range h.sockets {
		aid := h.userOf[string(sock.Id())]
		st := h.eng.Players().GetByAccount(aid)
		if st != nil && (st.Name == targetName || aid == targetName) {
			targetAccount = aid
			h.parties.Invite(leader, targetAccount)
			h.EmitToSocket(st.SocketID, protocol.EvPartyInviteEvt, map[string]string{"from": leader})
			return
		}
	}
	_ = targetAccount
}

func (h *Hub) handlePartyAccept(accountID string) {
	p := h.parties.Accept(accountID)
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

// --- Emitter interface ---

func (h *Hub) EmitToSocket(socketID, event string, payload any) {
	s := h.getSocket(socketID)
	if s == nil {
		return
	}
	s.Emit(event, payload)
}

func (h *Hub) EmitToRoom(room, event string, payload any) {
	if strings.HasPrefix(room, "aoi-broadcast:") {
		// aoi-broadcast:instance:zx:zy
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

// --- decode helpers ---

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
