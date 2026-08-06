package persist_test

import (
	"path/filepath"
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/db"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/inventory"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/persist"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/quest"
)

func TestPersistInventoryAndQuestRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hot.db")
	sqlDB, err := db.OpenSQLite("file:" + path)
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()

	inv := inventory.NewManager(sqlDB)
	inv.AddItem("acc1", "scrap", "Scrap", 2)
	inv.AddCredits("acc1", 50)

	inv2 := inventory.NewManager(sqlDB)
	if inv2.Credits("acc1") != 150 {
		t.Fatalf("credits=%d", inv2.Credits("acc1"))
	}
	items := inv2.List("acc1")
	found := false
	for _, it := range items {
		if it.ID == "scrap" && it.Qty == 2 {
			found = true
		}
	}
	if !found {
		t.Fatalf("items=%v", items)
	}

	q := quest.NewManager(sqlDB)
	q.Accept("acc1", "saints_trail_intro")
	q.Advance("acc1", "gather_scrap", 1)

	q2 := quest.NewManager(sqlDB)
	list := q2.List("acc1")
	if len(list) != 1 || list[0].Objective["gather_scrap"] != 1 {
		t.Fatalf("%+v", list)
	}

	store := &persist.Store{DB: sqlDB}
	store.SavePlayer("acc1", "DEMO_SANDBOX_ch2", 9, 4, 150)
	hot := store.LoadPlayer("acc1")
	if !hot.OK || hot.X != 9 || hot.Y != 4 || hot.MapID != "DEMO_SANDBOX" {
		t.Fatalf("%+v", hot)
	}
}
