package quest_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/quest"
)

func TestQuestAcceptAdvance(t *testing.T) {
	m := quest.NewManager(nil)
	p := m.Accept("a1", "saints_trail_intro")
	if p == nil || p.Status != "active" {
		t.Fatal(p)
	}
	m.Advance("a1", "gather_scrap", 1)
	m.Advance("a1", "craft_field_kit", 1)
	m.Advance("a1", "talk_guide", 1)
	
	p = m.Accept("a1", "saints_trail_intro") // Accept on completed quest just returns the existing progress
	if p == nil || p.Status != "complete" {
		t.Fatalf("%+v", p)
	}
}
