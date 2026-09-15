package socket

import (
	"log"
	"time"
	"fmt"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/player"
	"github.com/zishang520/socket.io/v2/socket"
)

// handlePortalRequestNodes handles the "portal_request_nodes" event.
// It queries the active WorldRelease connection registry and returns valid destinations.
func (h *Hub) handlePortalRequestNodes(client *socket.Socket, accountID string, gateID string) {
	p := h.eng.Players().GetByAccount(accountID)
	if p == nil {
		return
	}

	// Validate proximity to gate (if gate location is known)
	// For now, we trust the client's interaction state as handled by the engine, 
	// but we must validate the gate exists on the map.
	def, err := h.eng.World().GetDef(p.BaseMapID)
	if err != nil {
		return
	}
	
	gateExists := false
	for _, g := range def.Gates {
		if g.ID == gateID {
			gateExists = true
			break
		}
	}
	if !gateExists {
		log.Printf("[Portal] account=%s requested nodes for invalid gate=%s on map=%s", accountID, gateID, p.BaseMapID)
		return
	}

	nodes := make([]map[string]any, 0)
	
	// Query active connections for this map and gate
	conns, ok := h.eng.World().Connections[p.BaseMapID][gateID]
	if ok {
		for _, c := range conns {
			// Only expose internal traversal for Phase 6.
			if c.Type == "internal" {
				nodes = append(nodes, map[string]any{
					"connectionId":    c.ConnectionID,
					"destinationName": c.DestinationName,
					"description":     c.Description,
					"icon":            c.Icon,
				})
			}
		}
	}

	h.EmitToSocket(string(client.Id()), "portal_request_nodes", nodes)
}

// handlePortalDial handles the "portal_dial" event when a player selects a destination.
func (h *Hub) handlePortalDial(client *socket.Socket, accountID string, connectionID string) {
	// For testing compatibility, we safely resolve sid
	var sid string
	if client != nil {
		sid = string(client.Id())
	} else {
		sid = "mock_sid" // Fallback for tests if client is nil
	}

	p := h.eng.Players().GetByAccount(accountID)
	if p == nil {
		log.Printf("[Portal] handlePortalDial: player not found for account %s", accountID)
		return
	}

	// 1. Authoritatively check the map the player is CURRENTLY in.
	activeMapID := p.BaseMapID
	connsMap := h.eng.World().Connections[activeMapID]

	var activeConn *world.WorldConnection
	if connsMap != nil {
		// Search all gates on this map for the connection (the player could be at any gate)
		for _, gateConns := range connsMap {
			for _, c := range gateConns {
				if c.ConnectionID == connectionID {
					activeConn = &c
					break
				}
			}
			if activeConn != nil {
				break
			}
		}
	}

	if activeConn == nil {
		log.Printf("[Portal] account=%s attempted to dial invalid connection=%s", accountID, connectionID)
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Invalid portal destination."})
		return
	}

	// 2. We have the connection. Let's execute the first-class Map Transition.
	err := h.TransitionPlayer(p, sid, activeConn.TargetMapReleaseID, activeConn.TargetEntryPointID)
	if err != nil {
		log.Printf("[Portal] TransitionPlayer failed for account=%s: %v", accountID, err)
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Portal transition failed."})
	}
}

// TransitionPlayer executes a clean, authoritative transfer of a player from their current map instance to a target map.
func (h *Hub) TransitionPlayer(p *player.State, sid string, targetMapReleaseID string, targetEntryPointID string) error {
	// 1. Resolve exact destination
	def, err := h.eng.World().GetDef(targetMapReleaseID)
	if err != nil {
		return fmt.Errorf("target map %s not found", targetMapReleaseID)
	}

	var spawnX, spawnY, spawnZ float64
	foundEntry := false

	for _, gate := range def.Gates {
		if gate.ID == targetEntryPointID {
			spawnX = float64(gate.X)
			spawnY = float64(gate.Y)
			spawnZ = def.SpawnZ // Gates don't have Z yet
			foundEntry = true
			break
		}
	}

	if !foundEntry {
		return fmt.Errorf("target entry point '%s' not found on map %s", targetEntryPointID, targetMapReleaseID)
	}

	// 2. Resolve/create target map instance
	inst, err := h.eng.World().JoinMap(targetMapReleaseID, p.AccountID, false, false)
	if err != nil {
		return fmt.Errorf("failed to join target instance: %w", err)
	}

	// 3. Leave current map instance cleanly
	h.leaveAOI(sid, p)
	h.LeaveRoom(sid, p.MapID)
	h.eng.World().LeaveInstance(p.MapID)
	h.EmitToRoom(p.MapID, protocol.EvPlayerLeft, map[string]string{"socketId": sid, "entityId": p.EntityID})

	// 4. Update player's authoritative session state
	p.MapID = inst.InstanceID
	p.BaseMapID = targetMapReleaseID
	p.X = spawnX
	p.Y = spawnY
	p.Z = spawnZ

	// 5. Join new room and AOI
	h.JoinRoom(sid, inst.InstanceID)
	h.joinAOI(sid, p)

	// Seed spawns if first player in public instance
	if inst.PlayerCount == 1 && world.IsPublicChannel(inst.InstanceID) && h.deps.Registry != nil {
		var spawns []creature.SpawnDef
		for _, n := range def.NPCs {
			if _, ok := h.deps.Registry.GetCreature(n.SchemaDef.Slug); ok {
				spawns = append(spawns, creature.SpawnDef{
					ID: n.ID, Slug: n.SchemaDef.Slug, X: n.X, Y: n.Y,
				})
			}
		}
		h.eng.Creatures().SeedSpawns(inst.InstanceID, spawns, h.deps.Registry)
	}

	// 6. Notify Client
	h.EmitToSocket(sid, protocol.EvMapJoined, protocol.MapJoinedPayload{
		InstanceID: inst.InstanceID,
		MapID:      targetMapReleaseID,
		X:          p.X,
		Y:          p.Y,
		Z:          p.Z,
		ServerTime: time.Now().UnixMilli(),
		JoinSeq:    0, // Transitions don't have a specific client sequence ID
	})

	log.Printf("[Portal] Transition successful: account=%s -> map=%s @ (%.2f, %.2f)", p.AccountID, targetMapReleaseID, spawnX, spawnY)
	return nil
}
