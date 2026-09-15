package db

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
)

func TestMigration(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "saints-db-test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	defer db.Close()

	// 1. Simulate legacy V1 DB exactly as it used to be.
	legacyTables := []string{
		`CREATE TABLE WorldMapVersion (
			id TEXT PRIMARY KEY,
			mapId TEXT NOT NULL,
			version INTEGER NOT NULL,
			name TEXT NOT NULL,
			createdAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE WorldMapVersionRegion (
			id TEXT PRIMARY KEY,
			mapId TEXT NOT NULL,
			version INTEGER NOT NULL,
			regionX INTEGER NOT NULL,
			regionZ INTEGER NOT NULL,
			artifactChecksum TEXT NOT NULL,
			persistedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
	}
	for _, q := range legacyTables {
		if _, err := db.Exec(q); err != nil {
			t.Fatalf("failed to create legacy tables: %v", err)
		}
	}

	// Insert some legacy data
	_, err = db.Exec(`INSERT INTO WorldMapVersion (id, mapId, version, name) VALUES ('ver1', 'STARTING_MEADOW', 1, 'Meadow')`)
	if err != nil {
		t.Fatalf("failed to insert legacy map version: %v", err)
	}

	_, err = db.Exec(`INSERT INTO WorldMapVersionRegion (id, mapId, version, regionX, regionZ, artifactChecksum) VALUES ('reg1', 'STARTING_MEADOW', 1, 0, 0, 'abc123chk')`)
	if err != nil {
		t.Fatalf("failed to insert legacy region: %v", err)
	}

	// 2. Run the migration system
	if err := migrate(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	// 3. Verify V2 constraints (v.data exists)
	var data sql.NullString
	if err := db.QueryRow(`SELECT data FROM WorldMapVersion WHERE id = 'ver1'`).Scan(&data); err != nil {
		t.Errorf("failed to select data from WorldMapVersion: %v", err)
	}

	// 4. Verify V3 constraints (r.versionId exists, migrated correctly)
	var versionId string
	if err := db.QueryRow(`SELECT versionId FROM WorldMapVersionRegion WHERE id = 'reg1'`).Scan(&versionId); err != nil {
		t.Errorf("failed to select versionId from migrated region: %v", err)
	}
	if versionId != "ver1" {
		t.Errorf("expected versionId 'ver1', got '%s'", versionId)
	}

	// 5. Test idempotency
	if err := migrate(db); err != nil {
		t.Fatalf("second migration run failed: %v", err)
	}
}

func TestVerifySchemaFailsCorrectly(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "saints-db-test2")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "test2.db")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	defer db.Close()

	if err := verifySchema(db); err == nil {
		t.Fatalf("verifySchema should have failed on an empty database")
	}
}


