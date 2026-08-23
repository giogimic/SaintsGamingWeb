package bootstrap

import (
	"database/sql"
	"encoding/json"
	"log"
	"os"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

// EnsureDemo seeds DEMO_SANDBOX into SQLite + in-memory world manager.
func EnsureDemo(db *sql.DB, wm *world.Manager) error {
	force := os.Getenv("FORCE_DEMO_MAP") == "1"
	def := world.BuildDemoMapDef()
	wm.RegisterDef(def)

	if err := ensureLogicTiles(db); err != nil {
		return err
	}

	var count int
	_ = db.QueryRow(`SELECT COUNT(1) FROM WorldMap WHERE id = ?`, protocol.DemoMapID).Scan(&count)
	if count > 0 && !force {
		log.Printf("[bootstrap] DEMO_SANDBOX already present (set FORCE_DEMO_MAP=1 to rewrite)")
		_ = loadExisting(db, wm)
		return nil
	}

	gridJSON, err := def.GridJSON()
	if err != nil {
		return err
	}
	npcs, _ := json.Marshal(def.NPCs)
	tilesets := `[{"firstgid":1,"name":"demo","tilewidth":16,"tileheight":16,"tilecount":64,"columns":8}]`
	// Solid grass GID 17 in a filled Ground layer (matches TS DEFAULT_STUDIO_GROUND_GID).
	ground := make([]int, def.Width*def.Height)
	for i := range ground {
		ground[i] = protocol.DefaultGroundGID
	}
	groundJSON, _ := json.Marshal(ground)
	tileLayers := `[{"name":"Ground","width":` + itoa(def.Width) + `,"height":` + itoa(def.Height) + `,"data":` + string(groundJSON) + `}]`

	if count > 0 {
		_, err = db.Exec(`UPDATE WorldMap SET name=?, gridData=?, npcsData=?, tileLayersData=?, tilesetsData=?, version=version+1, updatedAt=datetime('now') WHERE id=?`,
			def.Name, gridJSON, string(npcs), tileLayers, tilesets, protocol.DemoMapID)
	} else {
		_, err = db.Exec(`INSERT INTO WorldMap (id, gameId, name, gridData, gatesData, npcsData, encountersData, tileLayersData, tilesetsData, version)
			VALUES (?, 'saints', ?, ?, '{}', ?, '[]', ?, ?, 1)`,
			protocol.DemoMapID, def.Name, gridJSON, string(npcs), tileLayers, tilesets)
	}
	if err != nil {
		return err
	}

	_, _ = db.Exec(`INSERT INTO GameMap (id, name, width, height, tilesetData, gates, npcs, encounters)
		VALUES (?, ?, ?, ?, ?, '{}', ?, '[]')
		ON CONFLICT(id) DO UPDATE SET name=excluded.name, width=excluded.width, height=excluded.height, tilesetData=excluded.tilesetData, npcs=excluded.npcs`,
		protocol.DemoMapID, def.Name, def.Width, def.Height, tilesets, string(npcs))

	log.Printf("[bootstrap] seeded DEMO_SANDBOX %dx%d", def.Width, def.Height)
	return nil
}

func loadExisting(db *sql.DB, wm *world.Manager) error {
	rows, err := db.Query(`SELECT id, name, gridData, npcsData FROM WorldMap`)
	if err != nil {
		return nil
	}
	defer rows.Close()

	for rows.Next() {
		var id, name, gridData, npcsData string
		if err := rows.Scan(&id, &name, &gridData, &npcsData); err != nil {
			continue
		}
		grid, _ := world.ParseGridJSON(gridData)
		h := len(grid)
		w := 0
		if h > 0 {
			w = len(grid[0])
		}
		if w == 0 {
			w = 64
		}
		if h == 0 {
			h = 64
		}
		var npcs []world.NPCDef
		if npcsData != "" && npcsData != "[]" {
			_ = json.Unmarshal([]byte(npcsData), &npcs)
		}
		wm.RegisterDef(&world.MapDef{
			ID: id, Name: name, Width: w, Height: h, Grid: grid, NPCs: npcs,
			SpawnX: float64(protocol.DefaultSpawnX), SpawnY: float64(protocol.DefaultSpawnY),
		})
	}
	return nil
}

func ensureLogicTiles(db *sql.DB) error {
	tiles := []struct {
		ID     int
		Name   string
		Color  string
		Solid  int
		Inter  int
	}{
		{protocol.TileWalk, "Walk", "#4ade80", 0, 0},
		{protocol.TileWall, "Wall", "#64748b", 1, 0},
		{protocol.TileGrass, "Grass", "#22c55e", 0, 0},
		{protocol.TileTree, "Tree", "#166534", 1, 1},
		{protocol.TileOre, "Ore", "#a8a29e", 1, 1},
		{protocol.TileShop, "Shop", "#f59e0b", 0, 1},
		{protocol.TileClinic, "Clinic", "#ef4444", 0, 1},
		{protocol.TileCraft, "Craft", "#8b5cf6", 0, 1},
		{protocol.TileFish, "Fish", "#0ea5e9", 0, 1},
		{protocol.TileBramble, "Bramble", "#854d0e", 1, 0},
	}
	for _, t := range tiles {
		_, err := db.Exec(`INSERT INTO MapLogicTile (id, name, color, isSolid, interactable)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT(id) DO NOTHING`, t.ID, t.Name, t.Color, t.Solid, t.Inter)
		if err != nil {
			return err
		}
	}
	return nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
