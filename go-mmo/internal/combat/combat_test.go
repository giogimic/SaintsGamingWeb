package combat_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/combat"
)

func TestCombatRound(t *testing.T) {
	m := combat.NewManager()
	s := m.Start("p1", "c1", "DEMO_ch1", 100, 20)
	s = m.ApplyPlayerHit("p1", 10)
	if s.CreatureHP != 10 {
		t.Fatalf("hp=%d", s.CreatureHP)
	}
	s = m.ApplyPlayerHit("p1", 10)
	if !s.Ended || s.Winner != "player" {
		t.Fatalf("%+v", s)
	}
}

func TestFleeEnd(t *testing.T) {
	m := combat.NewManager()
	m.Start("p1", "c1", "DEMO_ch1", 100, 20)
	m.End("p1")
	if m.GetByPlayer("p1") != nil {
		t.Fatal("expected cleared")
	}
}
