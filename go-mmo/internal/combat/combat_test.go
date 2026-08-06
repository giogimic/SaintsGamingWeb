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

func TestTBSubmit(t *testing.T) {
	m := combat.NewManager()
	s := m.StartTB("p1", "c1", "DEMO_ch1", 100, 30)
	s = m.SubmitTB("p1", "attack", "strike")
	if s.CreatureHP >= 30 {
		t.Fatalf("expected damage %+v", s)
	}
	// Flee is chance-based; End always clears.
	m.End("p1")
	if m.GetByPlayer("p1") != nil {
		t.Fatal("expected cleared after End")
	}
}

func TestTBFormulaDamage(t *testing.T) {
	m := combat.NewManager()
	ps := combat.Stats{PhysicalPower: 40, PhysicalDefense: 10, AbilityPower: 10, AbilityDefense: 10, CombatTempo: 120, Level: 10}
	cs := combat.Stats{PhysicalPower: 5, PhysicalDefense: 5, AbilityPower: 5, AbilityDefense: 5, CombatTempo: 80, Level: 2}
	s := m.StartTBWithStats("p1", "c1", "DEMO_ch1", 100, 200, ps, cs)
	s = m.SubmitTB("p1", "attack", "strike")
	if s.LastDamage < 5 {
		t.Fatalf("expected meaningful damage got %d", s.LastDamage)
	}
}
