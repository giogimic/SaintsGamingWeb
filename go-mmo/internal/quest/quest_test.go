package quest_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/quest"
)

func TestQuestAcceptAdvance(t *testing.T) {
	m := quest.NewManager()
	p := m.Accept("a1", "saints_trail_intro")
	if p == nil || p.Status != "active" {
		t.Fatal(p)
	}
	m.Advance("a1", "gather_scrap", 1)
	m.Advance("a1", "craft_field_kit", 1)
	out := m.Advance("a1", "talk_guide", 1)
	if len(out) == 0 || out[0].Status != "complete" {
		t.Fatalf("%+v", out)
	}
}
