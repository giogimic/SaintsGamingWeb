package bootstrap_test

import (
	"path/filepath"
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/bootstrap"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/db"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

func TestEnsureDemo(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	sqlDB, err := db.OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()

	wm := world.NewManager(50)
	if err := bootstrap.EnsureDemo(sqlDB, wm); err != nil {
		t.Fatal(err)
	}
	def, ok := wm.GetDef(protocol.DemoMapID)
	if !ok || def.Width != protocol.DemoMapW {
		t.Fatalf("def=%v ok=%v", def, ok)
	}
	var n int
	if err := sqlDB.QueryRow(`SELECT COUNT(1) FROM WorldMap WHERE id=?`, protocol.DemoMapID).Scan(&n); err != nil || n != 1 {
		t.Fatalf("worldmap n=%d err=%v", n, err)
	}
	var tiles int
	_ = sqlDB.QueryRow(`SELECT COUNT(1) FROM MapLogicTile`).Scan(&tiles)
	if tiles < 5 {
		t.Fatalf("expected logic tiles, got %d", tiles)
	}
}
