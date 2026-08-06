package encounter

import (
	"database/sql"
	"math/rand"
	"sync"
	"time"
)

// Result of a grass encounter roll.
type Result struct {
	Triggered bool   `json:"triggered"`
	Species   string `json:"species,omitempty"`
	Level     int    `json:"level,omitempty"`
	BaseHP    int    `json:"baseHp,omitempty"`
}

// Manager rolls encounters with cooldown; prefers CreatureDef rows when present.
type Manager struct {
	mu       sync.Mutex
	lastRoll map[string]time.Time
	cooldown time.Duration
	chance   float64
	rng      *rand.Rand
	species  []string
	db       *sql.DB
}

func NewManager(db *sql.DB) *Manager {
	m := &Manager{
		lastRoll: make(map[string]time.Time),
		cooldown: 2 * time.Second,
		chance:   0.18,
		rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
		species:  []string{"brushpup", "emberkit", "tidefin", "stoneling"},
		db:       db,
	}
	m.refreshSpecies()
	return m
}

func (m *Manager) refreshSpecies() {
	if m.db == nil {
		return
	}
	rows, err := m.db.Query(`SELECT slug FROM CreatureDef ORDER BY slug LIMIT 64`)
	if err != nil {
		return
	}
	defer rows.Close()
	out := make([]string, 0)
	for rows.Next() {
		var slug string
		if rows.Scan(&slug) == nil && slug != "" {
			out = append(out, slug)
		}
	}
	if len(out) > 0 {
		m.species = out
	}
}

func (m *Manager) Check(accountID string, tileLogic int) Result {
	// Grass = 2
	if tileLogic != 2 {
		return Result{}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if t, ok := m.lastRoll[accountID]; ok && time.Since(t) < m.cooldown {
		return Result{}
	}
	m.lastRoll[accountID] = time.Now()
	if m.rng.Float64() > m.chance {
		return Result{}
	}
	if len(m.species) == 0 {
		m.species = []string{"brushpup"}
	}
	sp := m.species[m.rng.Intn(len(m.species))]
	lvl := 3 + m.rng.Intn(4)
	baseHP := 40 + lvl*5
	if m.db != nil {
		var hp sql.NullInt64
		_ = m.db.QueryRow(`SELECT baseHp FROM CreatureDef WHERE slug = ?`, sp).Scan(&hp)
		if hp.Valid && hp.Int64 > 0 {
			baseHP = int(hp.Int64) + lvl*2
		}
	}
	return Result{Triggered: true, Species: sp, Level: lvl, BaseHP: baseHP}
}
