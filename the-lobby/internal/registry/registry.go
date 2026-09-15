package registry

import (
	"database/sql"
	"encoding/json"
	"log"
	"sync"
)

// The Registry Manager holds all canonical content in thread-safe memory maps.
type Manager struct {
	db *sql.DB

	mu        sync.RWMutex
	classes   map[string]CharacterClass
	creatures map[string]CreatureDef
	items     map[string]ItemTemplate
}

type CharacterClass struct {
	Slug        string
	Name        string
	BaseStats   string
	StatDeltas  string
	SkillDeltas string
}

type CreatureDef struct {
	Slug            string `json:"slug"`
	Name            string `json:"name"`
	TypePrimary     string `json:"typePrimary"`
	TypeSecondary   string `json:"typeSecondary"`
	SpriteOverworld string `json:"spriteOverworld"`
	BaseHp          int    `json:"baseHp"`
	PhysicalPower   int    `json:"physicalPower"`
	PhysicalDefense int    `json:"physicalDefense"`
	AbilityPower    int    `json:"abilityPower"`
	AbilityDefense  int    `json:"abilityDefense"`
	CombatTempo     int    `json:"combatTempo"`
	CatchRate       float64 `json:"catchRate"`
	StarterLevel    int    `json:"starterLevel"`
}

type ItemTemplate struct {
	Slug        string
	Name        string
	Category    string
	SubCategory string
	Tier        int
	BaseStats   string
	Stackable   bool
}

func NewManager(db *sql.DB) *Manager {
	m := &Manager{
		db:        db,
		classes:   make(map[string]CharacterClass),
		creatures: make(map[string]CreatureDef),
		items:     make(map[string]ItemTemplate),
	}
	// Do initial bootstrap
	m.ReloadAll()
	return m
}

func (m *Manager) ReloadAll() {
	if m.db == nil {
		log.Println("[Registry] Skipping bootstrap, no DB connection.")
		return
	}
	m.ReloadClasses()
	m.ReloadCreatures()
	m.ReloadItems()
}

// LoadFromManifest initializes the registry directly from a project release manifest.
func (m *Manager) LoadFromManifest(creatures, items []json.RawMessage) {
	m.mu.Lock()
	defer m.mu.Unlock()
	// Parse Creatures
	for _, raw := range creatures {
		var c CreatureDef
		if err := json.Unmarshal(raw, &c); err == nil {
			m.creatures[c.Slug] = c
		} else {
			log.Printf("[Registry] Error unmarshaling creature from manifest: %v", err)
		}
	}

	// Parse Items
	for _, raw := range items {
		var i ItemTemplate
		if err := json.Unmarshal(raw, &i); err == nil {
			m.items[i.Slug] = i
		}
	}

	log.Printf("[Registry] Loaded from manifest: %d classes, %d creatures, %d items", 
		len(m.classes), len(m.creatures), len(m.items))
}

func (m *Manager) ReloadClasses() {
	rows, err := m.db.Query(`SELECT slug, name, baseStats, statDeltas, skillDeltas FROM CharacterClass`)
	if err != nil {
		log.Printf("[Registry] Failed to load classes: %v", err)
		return
	}
	defer rows.Close()

	m.mu.Lock()
	defer m.mu.Unlock()

	for rows.Next() {
		var c CharacterClass
		if err := rows.Scan(&c.Slug, &c.Name, &c.BaseStats, &c.StatDeltas, &c.SkillDeltas); err == nil {
			m.classes[c.Slug] = c
		}
	}
	log.Printf("[Registry] Loaded %d classes", len(m.classes))
}

func (m *Manager) ReloadCreatures() {
	rows, err := m.db.Query(`
		SELECT slug, name, typePrimary, typeSecondary, spriteOverworld,
		       baseHp, physicalPower, physicalDefense, abilityPower, abilityDefense, combatTempo, catchRate, starterLevel
		FROM CreatureDef
	`)
	if err != nil {
		log.Printf("[Registry] Failed to load creatures: %v", err)
		return
	}
	defer rows.Close()

	m.mu.Lock()
	defer m.mu.Unlock()

	for rows.Next() {
		var c CreatureDef
		var catchRate sql.NullFloat64
		var starterLevel sql.NullInt64
		if err := rows.Scan(
			&c.Slug, &c.Name, &c.TypePrimary, &c.TypeSecondary, &c.SpriteOverworld,
			&c.BaseHp, &c.PhysicalPower, &c.PhysicalDefense, &c.AbilityPower, &c.AbilityDefense, &c.CombatTempo,
			&catchRate, &starterLevel,
		); err == nil {
			if catchRate.Valid {
				c.CatchRate = catchRate.Float64
			} else {
				c.CatchRate = 1.0
			}
			if starterLevel.Valid {
				c.StarterLevel = int(starterLevel.Int64)
			} else {
				c.StarterLevel = 5
			}
			m.creatures[c.Slug] = c
		} else {
			log.Printf("[Registry] Scan error on creature: %v", err)
		}
	}
	log.Printf("[Registry] Loaded %d creatures", len(m.creatures))
}

func (m *Manager) ReloadItems() {
	rows, err := m.db.Query(`
		SELECT slug, name, category, COALESCE(subCategory, ''), tier, COALESCE(baseStats, '{}'), stackable 
		FROM ItemTemplate
	`)
	if err != nil {
		log.Printf("[Registry] Failed to load items: %v", err)
		return
	}
	defer rows.Close()

	m.mu.Lock()
	defer m.mu.Unlock()

	for rows.Next() {
		var it ItemTemplate
		if err := rows.Scan(&it.Slug, &it.Name, &it.Category, &it.SubCategory, &it.Tier, &it.BaseStats, &it.Stackable); err == nil {
			m.items[it.Slug] = it
		}
	}
	log.Printf("[Registry] Loaded %d items", len(m.items))
}

func (m *Manager) GetClass(slug string) (CharacterClass, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, ok := m.classes[slug]
	return c, ok
}

func (m *Manager) GetCreature(slug string) (CreatureDef, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, ok := m.creatures[slug]
	return c, ok
}

func (m *Manager) GetItem(slug string) (ItemTemplate, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	it, ok := m.items[slug]
	return it, ok
}

func (m *Manager) AllItemSlugs() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var slugs []string
	for k := range m.items {
		slugs = append(slugs, k)
	}
	return slugs
}

