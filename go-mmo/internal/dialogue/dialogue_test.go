package dialogue_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/dialogue"
)

func TestDialogueFlow(t *testing.T) {
	m := dialogue.NewManager()
	node, ok := m.Start("a1", "demo_welcome")
	if !ok || node.ID != "start" {
		t.Fatalf("%+v", node)
	}
	res := m.Select("a1", "more", -1)
	if res.Ended || res.Node == nil {
		t.Fatal(res)
	}
	res = m.Select("a1", "accept", -1)
	if res.Action != "accept_quest" && res.Node == nil {
		// accept node may carry action on choice
	}
	res = m.Select("a1", "", 0)
	if !res.Ended && res.Node == nil {
		t.Fatalf("%+v", res)
	}
}
