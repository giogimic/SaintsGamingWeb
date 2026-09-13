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
			npcsData TEXT NOT NULL DEFAULT '[]',
			encountersData TEXT NOT NULL DEFAULT '[]',
			tileLayersData TEXT NOT NULL DEFAULT '[]',
			tilesetsData TEXT NOT NULL DEFAULT '[]',
			mapType TEXT NOT NULL DEFAULT 'HYBRID',
			regionClass TEXT NOT NULL DEFAULT 'authored',
			version INTEGER NOT NULL DEFAULT 1,
			publishedVersion INTEGER NOT NULL DEFAULT 0,
			publishedData TEXT NOT NULL DEFAULT '{}',
			updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS WorldMapDraft (
			id TEXT PRIMARY KEY,
			gameId TEXT DEFAULT 'saints',
			name TEXT NOT NULL,
			gridData TEXT NOT NULL,
			gatesData TEXT NOT NULL DEFAULT '{}',
			npcsData TEXT NOT NULL DEFAULT '[]',
			encountersData TEXT NOT NULL DEFAULT '[]',
			tileLayersData TEXT NOT NULL DEFAULT '[]',
			tilesetsData TEXT NOT NULL DEFAULT '[]',
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
		`CREATE TABLE IF NOT EXISTS WorldMapVersion (
			id TEXT PRIMARY KEY,
			mapId TEXT NOT NULL,
			version INTEGER NOT NULL,
			name TEXT NOT NULL,
			createdAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS WorldMapVersionRegion (
			id TEXT PRIMARY KEY,
			mapId TEXT,
			version INTEGER,
			regionX INTEGER NOT NULL,
			regionZ INTEGER NOT NULL,
			artifactChecksum TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS CreatureTemplate (
			id TEXT PRIMARY KEY,
			slug TEXT UNIQUE NOT NULL,
			speciesName TEXT NOT NULL,
			stage TEXT NOT NULL,
			shape TEXT NOT NULL,
			types TEXT NOT NULL,
			spriteFront TEXT,
			spriteOverworld TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS CreatureBaseStats (
			id TEXT PRIMARY KEY,
			speciesId TEXT UNIQUE NOT NULL,
			hp INTEGER NOT NULL,
			physicalPower INTEGER NOT NULL,
			physicalDefense INTEGER NOT NULL,
			abilityPower INTEGER NOT NULL,
			abilityDefense INTEGER NOT NULL,
			combatTempo INTEGER NOT NULL
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
		`ALTER TABLE WorldMapDraft ADD COLUMN regionClass TEXT NOT NULL DEFAULT 'authored'`,
		`ALTER TABLE WorldMapDraft ADD COLUMN publishedVersion INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE WorldMapDraft ADD COLUMN publishedData TEXT NOT NULL DEFAULT '{}'`,
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

// migrateV2 adds the missing data, description, publishedBy columns to WorldMapVersion
func migrateV2(db *sql.DB) error {
	log.Println("[DB] Applying migration v2: WorldMapVersion columns")

	colsToAdd := map[string]string{
		"data": "TEXT",
		"description": "TEXT",
		"publishedBy": "TEXT",
	}

	for col, typ := range colsToAdd {
		has, err := hasColumn(db, "WorldMapVersion", col)
		if err != nil {
			return fmt.Errorf("failed to check column %s: %w", col, err)
		}
		if !has {
			q := fmt.Sprintf("ALTER TABLE WorldMapVersion ADD COLUMN %s %s", col, typ)
			if _, err := db.Exec(q); err != nil {
				return fmt.Errorf("failed to add column %s: %w", col, err)
			}
		}
	}

	return nil
}

// migrateV3 structurally migrates WorldMapVersionRegion to drop mapId/version and use versionId
func migrateV3(db *sql.DB) error {
	log.Println("[DB] Applying migration v3: WorldMapVersionRegion structural change")

	hasVersionId, err := hasColumn(db, "WorldMapVersionRegion", "versionId")
	if err != nil {
		return fmt.Errorf("failed to check WorldMapVersionRegion columns: %w", err)
	}
	
	if hasVersionId {
		return nil // Already migrated
	}

	// 1. Create a temporary table with the correct new schema
	tmpTable := `CREATE TABLE WorldMapVersionRegion_tmp (
		id TEXT PRIMARY KEY,
		versionId TEXT NOT NULL,
		regionX INTEGER NOT NULL,
		regionZ INTEGER NOT NULL,
		artifactChecksum TEXT NOT NULL
	)`
	if _, err := db.Exec(tmpTable); err != nil {
		return fmt.Errorf("failed to create WorldMapVersionRegion_tmp: %w", err)
	}

	// 2. Count rows to migrate
	var rowCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM WorldMapVersionRegion`).Scan(&rowCount); err != nil {
		return fmt.Errorf("failed to count existing regions: %w", err)
	}
	
	if rowCount > 0 {
		log.Printf("[DB] Migrating %d region records...", rowCount)

		// 3. Migrate the rows. We must map (mapId, version) to WorldMapVersion.id.
		// If the WorldMapVersion doesn't exist, we should fail as per constraints.
		// We can do this in a single INSERT SELECT.
		
		q := `
			INSERT INTO WorldMapVersionRegion_tmp (id, versionId, regionX, regionZ, artifactChecksum)
			SELECT 
				r.id,
				v.id,
				r.regionX,
				r.regionZ,
				r.artifactChecksum
			FROM WorldMapVersionRegion r
			LEFT JOIN WorldMapVersion v ON v.mapId = r.mapId AND v.version = r.version
		`
		if _, err := db.Exec(q); err != nil {
			return fmt.Errorf("failed to map and insert migrated regions: %w", err)
		}

		// Verify that all regions successfully found a versionId (none are NULL)
		var nullCount int
		// Since versionId is NOT NULL, the INSERT above will fail if v.id is NULL. 
		// However, in case SQLite version allows it (some strict mode diffs), we check manually.
		if err := db.QueryRow(`SELECT COUNT(*) FROM WorldMapVersionRegion_tmp WHERE versionId IS NULL`).Scan(&nullCount); err != nil {
			return fmt.Errorf("failed to check for null versionIds: %w", err)
		}
		if nullCount > 0 {
			return fmt.Errorf("migration failure: %d regions reference a mapId/version that does not exist in WorldMapVersion", nullCount)
		}

		var newCount int
		if err := db.QueryRow(`SELECT COUNT(*) FROM WorldMapVersionRegion_tmp`).Scan(&newCount); err != nil {
			return fmt.Errorf("failed to count new regions: %w", err)
		}
		if newCount != rowCount {
			return fmt.Errorf("migration failure: row count mismatch. Old=%d, New=%d", rowCount, newCount)
		}
	}

	// 4. Swap the tables
	if _, err := db.Exec(`DROP TABLE WorldMapVersionRegion`); err != nil {
		return fmt.Errorf("failed to drop old WorldMapVersionRegion table: %w", err)
	}
	if _, err := db.Exec(`ALTER TABLE WorldMapVersionRegion_tmp RENAME TO WorldMapVersionRegion`); err != nil {
		return fmt.Errorf("failed to rename WorldMapVersionRegion_tmp: %w", err)
	}

	return nil
}

func verifySchema(db *sql.DB) error {
	checks := []struct {
		table string
		col   string
	}{
		{"WorldMap", "publishedVersion"},
		{"WorldMap", "publishedData"},
		{"WorldMapVersion", "data"},
		{"WorldMapVersion", "description"},
		{"WorldMapVersion", "publishedBy"},
		{"WorldMapVersionRegion", "versionId"},
		{"WorldMapVersionRegion", "regionX"},
		{"WorldMapVersionRegion", "regionZ"},
		{"WorldMapVersionRegion", "artifactChecksum"},
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
