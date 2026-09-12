package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

// OpenSQLite opens a SQLite database. Supports file:./path URLs from Prisma.
func OpenSQLite(databaseURL string) (*sql.DB, error) {
	path := databaseURL
	if strings.HasPrefix(path, "file:") {
		path = strings.TrimPrefix(path, "file:")
	}
	// Relative paths resolve from process cwd.
	if !filepath.IsAbs(path) {
		abs, err := filepath.Abs(path)
		if err != nil {
			return nil, err
		}
		path = abs
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("mkdir db dir: %w", err)
	}
	dsn := path + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := migrate(db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func migrate(db *sql.DB) error {
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
			gridData TEXT NOT NULL,
			gatesData TEXT NOT NULL DEFAULT '{}',
			npcsData TEXT NOT NULL DEFAULT '[]',
			encountersData TEXT NOT NULL DEFAULT '[]',
			tileLayersData TEXT NOT NULL DEFAULT '[]',
			tilesetsData TEXT NOT NULL DEFAULT '[]',
			mapType TEXT NOT NULL DEFAULT 'HYBRID',
			regionClass TEXT NOT NULL DEFAULT 'authored',
			createdAt TEXT NOT NULL DEFAULT (datetime('now'))
		)`,
		`CREATE TABLE IF NOT EXISTS WorldMapVersionRegion (
			id TEXT PRIMARY KEY,
			mapId TEXT NOT NULL,
			version INTEGER NOT NULL,
			regionX INTEGER NOT NULL,
			regionZ INTEGER NOT NULL,
			artifactChecksum TEXT NOT NULL,
			persistedAt TEXT NOT NULL DEFAULT (datetime('now'))
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
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("migrate: %w\nstmt: %s", err, s)
		}
	}

	// Non-destructive alters for existing DBs
	alters := []string{
		`ALTER TABLE WorldMap ADD COLUMN regionClass TEXT NOT NULL DEFAULT 'authored'`,
		`ALTER TABLE WorldMap ADD COLUMN publishedVersion INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE WorldMap ADD COLUMN publishedData TEXT NOT NULL DEFAULT '{}'`,
		`ALTER TABLE WorldMapDraft ADD COLUMN regionClass TEXT NOT NULL DEFAULT 'authored'`,
		`ALTER TABLE WorldMapDraft ADD COLUMN publishedVersion INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE WorldMapDraft ADD COLUMN publishedData TEXT NOT NULL DEFAULT '{}'`,
	}
	for _, a := range alters {
		_, _ = db.Exec(a) // Ignore errors (column may already exist)
	}

	return nil
}
