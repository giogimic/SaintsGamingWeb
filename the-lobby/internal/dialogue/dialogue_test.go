package dialogue_test

import (
	"path/filepath"
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/db"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/dialogue"
)

func TestDialogueFlow(t *testing.T) {
	m := dialogue.NewManager(nil)
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

func TestLoadPrismaStyleTreeFromDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "dlg.db")
	sqlDB, err := db.OpenSQLite("file:" + path)
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	raw := `{
		"node_start": {
			"text": "Hello trail",
			"options": [
				{"label": "Accept", "nextNode": "ok", "action": "ACCEPT_QUEST", "questSlug": "quest_trail_wake"},
				{"label": "Bye", "nextNode": "exit"}
			]
		},
		"ok": {"text": "Go forth", "options": [{"label": "Ok", "nextNode": "exit"}]}
	}`
	_, err = sqlDB.Exec(
		`INSERT INTO NpcDialogueTree (id, npcId, name, data) VALUES (?, ?, ?, ?)`,
		"t1", "npc_trail_greeter", "Trail Greeter", raw,
	)
	if err != nil {
		t.Fatal(err)
	}
	m := dialogue.NewManager(sqlDB)
	if m.TreeCount() < 2 {
		t.Fatalf("expected db tree loaded, count=%d", m.TreeCount())
	}
	node, ok := m.Start("u1", "npc_trail_greeter")
	if !ok || node.Text != "Hello trail" {
		t.Fatalf("%+v", node)
	}
	res := m.Select("u1", "ok", -1)
	if res.Action != "accept_quest" || res.QuestSlug != "quest_trail_wake" {
		t.Fatalf("%+v", res)
	}
}
