package db

import (
	"database/sql"
	"fmt"
	"log"
)

// migrate handles the database schema migrations safely and non-destructively.
func migrate(db *sql.DB) error {
	log.Println("[DB] Checking schema migrations...")
	
	// Create schema_migrations table
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)`); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	var version int
	err := db.QueryRow(`SELECT COALESCE(MAX(version), 0) FROM schema_migrations`).Scan(&version)
	if err != nil {
		return fmt.Errorf("failed to read schema_migrations: %w", err)
	}

	log.Printf("[DB] Current schema version: %d", version)

	if version < 1 {
		if err := migrateV1(db); err != nil {
			return err
		}
		setVersion(db, 1)
	}

	if version < 2 {
		if err := migrateV2(db); err != nil {
			return err
		}
		setVersion(db, 2)
	}

	if version < 3 {
		if err := migrateV3(db); err != nil {
			return err
		}
		setVersion(db, 3)
	}

	if version < 4 {
		if err := migrateV4(db); err != nil {
			return err
		}
		setVersion(db, 4)
	}

	if version < 5 {
		if err := migrateV5(db); err != nil {
			return err
		}
		setVersion(db, 5)
	}

	// Verify schema explicitly at the end
	if err := verifySchema(db); err != nil {
		return fmt.Errorf("schema verification failed: %w", err)
	}

	log.Println("[DB] Schema is current and verified.")
	return nil
}

func setVersion(db *sql.DB, v int) {
	_, _ = db.Exec(`INSERT INTO schema_migrations (version) VALUES (?)`, v)
	log.Printf("[DB] applied migration v%d", v)
}

// migrateV1 installs the base tables. 
func migrateV1(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS WorldMap (
			id TEXT PRIMARY KEY,
			gameId TEXT DEFAULT 'saints',
			name TEXT NOT NULL,
			gridData TEXT NOT NULL,
			gatesData TEXT NOT NULL DEFAULT '{}',
			encountersData TEXT NOT NULL DEFAULT '[]',
			mapType TEXT NOT NULL DEFAULT 'HYBRID',
			regionClass TEXT NOT NULL DEFAULT 'authored',
			version INTEGER NOT NULL DEFAULT 1,
			publishedVersion INTEGER NOT NULL DEFAULT 0,
			publishedData TEXT NOT NULL DEFAULT '{}',
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS GameMap (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			width INTEGER NOT NULL,
			height INTEGER NOT NULL,
			tilesetData TEXT NOT NULL,
			gates TEXT NOT NULL DEFAULT '{}',
			npcs TEXT NOT NULL DEFAULT '[]',
			encounters TEXT NOT NULL DEFAULT '[]'
		)`,
		`CREATE TABLE IF NOT EXISTS MapLogicTile (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			color TEXT NOT NULL DEFAULT '#888888',
			isSolid INTEGER NOT NULL DEFAULT 0,
			interactable INTEGER NOT NULL DEFAULT 0,
			onInteractAction TEXT,
			onInteractPayload TEXT,
			onStepAction TEXT,
			onStepPayload TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS CharacterClass (
			id TEXT PRIMARY KEY,
			slug TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			baseStats TEXT NOT NULL DEFAULT '{}',
			statDeltas TEXT NOT NULL DEFAULT '{}',
			skillDeltas TEXT NOT NULL DEFAULT '{}'
		)`,
		`CREATE TABLE IF NOT EXISTS ItemTemplate (
			id TEXT PRIMARY KEY,
			slug TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			category TEXT NOT NULL,
			subCategory TEXT,
			tier INTEGER NOT NULL DEFAULT 1,
			baseStats TEXT DEFAULT '{}',
			stackable INTEGER NOT NULL DEFAULT 0
		)`,

		`CREATE TABLE IF NOT EXISTS CreatureDef (
			id TEXT PRIMARY KEY,
			slug TEXT UNIQUE NOT NULL,
			gameId TEXT,
			name TEXT NOT NULL,
			typePrimary TEXT NOT NULL,
			typeSecondary TEXT DEFAULT 'None',
			spriteOverworld TEXT NOT NULL,
			baseHp INTEGER DEFAULT 100,
			physicalPower INTEGER DEFAULT 10,
			physicalDefense INTEGER DEFAULT 10,
			abilityPower INTEGER DEFAULT 10,
			abilityDefense INTEGER DEFAULT 10,
			combatTempo INTEGER DEFAULT 100,
			catchRate REAL DEFAULT 1,
			starterLevel INTEGER DEFAULT 5
		)`,
		`CREATE TABLE IF NOT EXISTS GoPlayerState (
			accountId TEXT PRIMARY KEY,
			mapId TEXT NOT NULL DEFAULT 'DEMO_SANDBOX',
			x REAL NOT NULL DEFAULT 5,
			y REAL NOT NULL DEFAULT 5,
			z REAL NOT NULL DEFAULT 0,
			credits INTEGER NOT NULL DEFAULT 100,
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS GoInventory (
			accountId TEXT NOT NULL,
			itemId TEXT NOT NULL,
			name TEXT NOT NULL,
			qty INTEGER NOT NULL,
			PRIMARY KEY (accountId, itemId)
		)`,
		`CREATE TABLE IF NOT EXISTS GoQuestProgress (
			accountId TEXT NOT NULL,
			slug TEXT NOT NULL,
			status TEXT NOT NULL,
			objectiveJson TEXT NOT NULL DEFAULT '{}',
			PRIMARY KEY (accountId, slug)
		)`,
		`CREATE TABLE IF NOT EXISTS GoSkillXP (
			accountId TEXT NOT NULL,
			skillSlug TEXT NOT NULL,
			xp INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (accountId, skillSlug)
		)`,
		`CREATE TABLE IF NOT EXISTS NpcDialogueTree (
			id TEXT PRIMARY KEY,
			npcId TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			data TEXT NOT NULL,
			createdAt TEXT NOT NULL DEFAULT (datetime('now')),
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS ServerSettings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("migrateV1: %w\nstmt: %s", err, s)
		}
	}
	
	// Ensure old DBs get the additive updates from old logic
	alters := []string{
		`ALTER TABLE WorldMap ADD COLUMN regionClass TEXT NOT NULL DEFAULT 'authored'`,
		`ALTER TABLE WorldMap ADD COLUMN publishedVersion INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE WorldMap ADD COLUMN publishedData TEXT NOT NULL DEFAULT '{}'`,
	}
	for _, a := range alters {
		_, _ = db.Exec(a) // Ignore errors (column may already exist from earlier CREATE TABLE logic)
	}

	return nil
}

// hasColumn checks if a table has a specific column.
func hasColumn(db *sql.DB, table, col string) (bool, error) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name string
		var typ string
		var notnull int
		var dfltValue *string
		var pk int
		if err := rows.Scan(&cid, &name, &typ, &notnull, &dfltValue, &pk); err != nil {
			return false, err
		}
		if name == col {
			return true, nil
		}
	}
	return false, nil
}

// migrateV2 previously added columns to WorldMapVersion. Obsoleted.
func migrateV2(db *sql.DB) error {
	return nil
}

// migrateV3 previously migrated WorldMapVersionRegion structurally. Obsoleted.
func migrateV3(db *sql.DB) error {
	return nil
}

// migrateV4 drops obsolete WorldMapVersion and WorldMapVersionRegion tables
func migrateV4(db *sql.DB) error {
	log.Println("[DB] Applying migration v4: Dropping WorldMapVersion schemas")
	if _, err := db.Exec(`DROP TABLE IF EXISTS WorldMapVersionRegion`); err != nil {
		return fmt.Errorf("failed to drop WorldMapVersionRegion: %w", err)
	}
	if _, err := db.Exec(`DROP TABLE IF EXISTS WorldMapVersion`); err != nil {
		return fmt.Errorf("failed to drop WorldMapVersion: %w", err)
	}
	return nil
}

// migrateV5 drops obsolete WorldMapDraft table
func migrateV5(db *sql.DB) error {
	log.Println("[DB] Applying migration v5: Dropping WorldMapDraft schema")
	if _, err := db.Exec(`DROP TABLE IF EXISTS WorldMapDraft`); err != nil {
		return fmt.Errorf("failed to drop WorldMapDraft: %w", err)
	}
	return nil
}

func verifySchema(db *sql.DB) error {
	checks := []struct {
		table string
		col   string
	}{
		{"WorldMap", "version"},
	}

	for _, check := range checks {
		has, err := hasColumn(db, check.table, check.col)
		if err != nil {
			return fmt.Errorf("failed checking %s.%s: %w", check.table, check.col, err)
		}
		if !has {
			return fmt.Errorf("schema verification failed: %s.%s is missing", check.table, check.col)
		}
	}
	return nil
}
