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
			gameId TEXT DEFAULT 'tuxemon',
			name TEXT NOT NULL,
			gridData TEXT NOT NULL,
			gatesData TEXT NOT NULL DEFAULT '{}',
			npcsData TEXT NOT NULL DEFAULT '[]',
			encountersData TEXT NOT NULL DEFAULT '[]',
			tileLayersData TEXT NOT NULL DEFAULT '[]',
			tilesetsData TEXT NOT NULL DEFAULT '[]',
			version INTEGER NOT NULL DEFAULT 1,
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
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("migrate: %w\nstmt: %s", err, s)
		}
	}
	return nil
}
