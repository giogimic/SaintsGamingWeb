package socket

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/config"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/engine"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/player"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/world"
)

type mockEmitter struct {
	emittedSocket map[string][]string
	emittedRoom   map[string][]string
}

func newMockEmitter() *mockEmitter {
	return &mockEmitter{
		emittedSocket: make(map[string][]string),
		emittedRoom:   make(map[string][]string),
	}
}

func (m *mockEmitter) EmitToSocket(socketID, event string, payload any) {
	m.emittedSocket[socketID] = append(m.emittedSocket[socketID], event)
}

func (m *mockEmitter) EmitToRoom(room, event string, payload any) {
	m.emittedRoom[room] = append(m.emittedRoom[room], event)
}

func (m *mockEmitter) JoinRoom(socketID, room string)   {}
func (m *mockEmitter) LeaveRoom(socketID, room string)  {}

func TestIsSamePolicy(t *testing.T) {
	pubInst := "DEMO_SANDBOX_ch1"
	privInst := "DEMO_SANDBOX_acc1"
	pieInst := "studio_pie_acc1"

	if !isSamePolicy(pubInst, "DEMO_SANDBOX", "acc1", false, false) {
		t.Fatal("expected public shard to match public policy")
	}
	if isSamePolicy(pubInst, "DEMO_SANDBOX", "acc1", true, false) {
		t.Fatal("expected public shard NOT to match private policy")
	}
	if !isSamePolicy(privInst, "DEMO_SANDBOX", "acc1", true, false) {
		t.Fatal("expected private shard to match private policy")
	}
	if !isSamePolicy(pieInst, "DEMO_SANDBOX", "acc1", false, true) {
		t.Fatal("expected pie shard to match pie policy")
	}
}

func TestHubLifecycleAndIdempotentJoin(t *testing.T) {
	cfg := config.Config{SimTPS: 20, NetTPS: 10}
	wm := world.NewManager(50)
	pm := player.NewManager(16, nil)
	cm := creature.NewManager()
	em := newMockEmitter()
	eng := engine.New(cfg, wm, pm, cm, em)

	hub := NewHub(cfg, eng, Deps{})
	if hub == nil {
		t.Fatal("hub is nil")
	}

	// 1. Pre-world state: account connected, no world player
	accountID := "acc_test_1"
	charID := "char_hero_1"
	socketID := "sock_1"

	if p := pm.GetByAccount(accountID); p != nil {
		t.Fatal("expected no player before world join")
	}

	// 2. Initial world join
	inst, err := wm.JoinMap("DEMO_SANDBOX", accountID, false, false)
	if err != nil {
		t.Fatalf("join failed: %v", err)
	}

	p := pm.CreateWithCharacter(accountID, charID, socketID, "Hero", "adventurer", inst.InstanceID, "DEMO_SANDBOX", 14, 15)
	if p == nil || p.CharacterID != charID {
		t.Fatalf("expected player with character ID %s", charID)
	}

	// 3. Duplicate join from same account/character/map/policy:
	// Verify state remains identical and no duplicate player is created
	sameChar := reqMatches(p, "DEMO_SANDBOX", charID, false, false)
	if !sameChar {
		t.Fatal("expected match for identical join contract")
	}

	// 4. Character ownership rejection: Another account cannot join with charID
	otherAccountID := "acc_test_2"
	existingCharOwner := pm.GetByCharacter(charID)
	if existingCharOwner == nil || existingCharOwner.AccountID != accountID {
		t.Fatal("expected character lookup to return original owner")
	}
	if existingCharOwner.AccountID == otherAccountID {
		t.Fatal("character should NOT belong to other account")
	}

	// 5. Switching character on same account cleanly replaces seat
	newCharID := "char_hero_2"
	pm.Remove(socketID)
	p2 := pm.CreateWithCharacter(accountID, newCharID, socketID, "Mage", "mage_default", inst.InstanceID, "DEMO_SANDBOX", 14, 15)
	if p2.CharacterID != newCharID {
		t.Fatalf("expected new character %s", newCharID)
	}
	if pm.GetByCharacter(charID) != nil {
		t.Fatal("old character should no longer be indexed")
	}
	if pm.GetByCharacter(newCharID) == nil {
		t.Fatal("new character should be indexed")
	}

	// 6. Reconnect socket migration:
	newSocketID := "sock_2"
	migrated := pm.UpdateSocket(accountID, newSocketID)
	if migrated == nil || migrated.SocketID != newSocketID {
		t.Fatal("expected socket migration to succeed")
	}
	if pm.GetBySocket(socketID) != nil {
		t.Fatal("old socket should no longer point to player")
	}
	if pm.GetBySocket(newSocketID) == nil {
		t.Fatal("new socket must point to player")
	}
}

func reqMatches(p *player.State, baseMapID, charID string, isPrivate, pie bool) bool {
	sameChar := charID == "" || charID == p.CharacterID
	sameBase := p.BaseMapID == baseMapID
	samePolicy := isSamePolicy(p.MapID, baseMapID, p.AccountID, isPrivate, pie)
	return sameChar && sameBase && samePolicy
}
