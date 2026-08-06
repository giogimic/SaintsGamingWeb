package player_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/player"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
)

func TestCreateMoveAndPeers(t *testing.T) {
	m := player.NewManager(16)
	p := m.Create("a1", "s1", "Ada", "spr", "DEMO_SANDBOX_ch1", "DEMO_SANDBOX", 5, 5)
	if p.EntityID == "" {
		t.Fatal("missing entity id")
	}
	_ = m.Create("a2", "s2", "Bob", "spr", "DEMO_SANDBOX_ch1", "DEMO_SANDBOX", 6, 6)
	peers := m.SnapshotPeers("DEMO_SANDBOX_ch1", "a1")
	if len(peers) != 1 || peers["s2"].Name != "Bob" {
		t.Fatalf("peers=%v", peers)
	}

	dir := "right"
	m.EnqueueInput("a1", protocol.PlayerInput{Type: "MOVE", Direction: &dir, Sequence: 1})
	inputs := m.TakeInputs()
	if _, ok := inputs["a1"]; !ok {
		t.Fatal("expected input")
	}

	updated, ok := m.ApplyMove("a1", 6, 5, "right", 1)
	if !ok || updated.X != 6 {
		t.Fatalf("move failed ok=%v x=%v", ok, updated)
	}
	// Occupancy: Bob is at 6,6 — moving onto Bob should fail
	_, ok = m.ApplyMove("a1", 6, 6, "down", 2)
	if ok {
		t.Fatal("expected occupied block")
	}
}

func TestSessionReplaceTracking(t *testing.T) {
	m := player.NewManager(16)
	m.Create("a1", "s1", "Ada", "spr", "DEMO_ch1", "DEMO", 1, 1)
	if m.SocketIDForAccount("a1") != "s1" {
		t.Fatal("socket map")
	}
	m.Remove("s1")
	if m.GetByAccount("a1") != nil {
		t.Fatal("should be gone")
	}
}
