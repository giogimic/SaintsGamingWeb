package httpapi_test

import (
	"database/sql"
	"os"
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/httpapi"
	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) (*sql.DB, func()) {
	f, err := os.CreateTemp("", "lobby-map-test-*.db")
	if err != nil {
		t.Fatal(err)
	}
	f.Close()

	db, err := sql.Open("sqlite", f.Name())
	if err != nil {
		t.Fatal(err)
	}

	// Create minimal schema
	_, err = db.Exec(`
		CREATE TABLE WorldMap (
			id TEXT PRIMARY KEY,
			name TEXT,
			publishedVersion INTEGER,
			mapType TEXT
		);
		CREATE TABLE WorldMapVersion (
			mapId TEXT,
			version INTEGER,
			name TEXT,
			data TEXT,
			PRIMARY KEY(mapId, version)
		);
	`)
	if err != nil {
		t.Fatal(err)
	}

	return db, func() {
		db.Close()
		os.Remove(f.Name())
	}
}

func TestLoadMapDefFromDB_Success(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Insert authored data
	snapshotJSON := `{
		"mapType": "VOXEL",
		"gridData": "[[-1,-1],[-1,-1]]",
		"gatesData": "{\"spawnPoint\":{\"x\":32,\"y\":32},\"gates\":[]}"
	}`

	_, err := db.Exec(`INSERT INTO WorldMap (id, name, publishedVersion, mapType) VALUES ('STARTING_MEADOW', 'Starting Meadow', 1, 'VOXEL')`)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.Exec(`INSERT INTO WorldMapVersion (mapId, version, name, data) VALUES ('STARTING_MEADOW', 1, 'Starting Meadow', ?)`, snapshotJSON)
	if err != nil {
		t.Fatal(err)
	}

	def, err := httpapi.LoadMapDefFromDB(db, nil, "STARTING_MEADOW")
	if err != nil {
		t.Fatalf("Expected success, got %v", err)
	}

	if def.ID != "STARTING_MEADOW" {
		t.Errorf("Expected ID 'STARTING_MEADOW', got '%s'", def.ID)
	}
	if def.SpawnX != 32 || def.SpawnY != 32 {
		t.Errorf("Expected Spawn (32, 32), got (%f, %f)", def.SpawnX, def.SpawnY)
	}
}

func TestLoadMapDefFromDB_MissingPublishedVersion(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	// Missing publishedVersion (0 or null)
	_, err := db.Exec(`INSERT INTO WorldMap (id, name, publishedVersion, mapType) VALUES ('UNPUBLISHED_MAP', 'Unpublished', 0, 'VOXEL')`)
	if err != nil {
		t.Fatal(err)
	}

	_, err = httpapi.LoadMapDefFromDB(db, nil, "UNPUBLISHED_MAP")
	if err == nil {
		t.Fatal("Expected error for missing publishedVersion, got nil")
	}
	if err.Error() != "published map version not found for UNPUBLISHED_MAP" {
		t.Errorf("Expected specific missing version error, got: %v", err)
	}
}

func TestLoadMapDefFromDB_MalformedSnapshot(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	snapshotJSON := `{ malformed_json... `

	_, err := db.Exec(`INSERT INTO WorldMap (id, name, publishedVersion, mapType) VALUES ('MALFORMED_MAP', 'Malformed', 1, 'VOXEL')`)
	if err != nil {
		t.Fatal(err)
	}

	_, err = db.Exec(`INSERT INTO WorldMapVersion (mapId, version, name, data) VALUES ('MALFORMED_MAP', 1, 'Malformed', ?)`, snapshotJSON)
	if err != nil {
		t.Fatal(err)
	}

	_, err = httpapi.LoadMapDefFromDB(db, nil, "MALFORMED_MAP")
	if err == nil {
		t.Fatal("Expected error for malformed snapshot, got nil")
	}
}
