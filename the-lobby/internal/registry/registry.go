package registry

import (
	"database/sql"
	"log"
	"sync"
)

// The Registry Manager holds all canonical content in thread-safe memory maps.
type Manager struct {
	db *sql.DB

	mu        sync.RWMutex
	classes   map[string]CharacterClass
	creatures map[string]CreatureTemplate
	items     map[string]ItemTemplate
}

type CharacterClass struct {
	Slug        string
	Name        string
	BaseStats   string
	StatDeltas  string
	SkillDeltas string
}

type CreatureTemplate struct {
	Slug            string
	SpeciesName     string
	Stage           string
	Shape           string
	Types           string
	SpriteFront     string
	SpriteOverworld string

	// Base Stats joined
	HP              int
	PhysicalPower   int
	PhysicalDefense int
	AbilityPower    int
	AbilityDefense  int
	CombatTempo     int
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
		creatures: make(map[string]CreatureTemplate),
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
		SELECT t.slug, t.speciesName, t.stage, t.shape, t.types, 
		       COALESCE(t.spriteFront, ''), COALESCE(t.spriteOverworld, ''),
		       s.hp, s.physicalPower, s.physicalDefense, s.abilityPower, s.abilityDefense, s.combatTempo
		FROM CreatureTemplate t
		LEFT JOIN CreatureBaseStats s ON t.id = s.speciesId
	`)
	if err != nil {
		log.Printf("[Registry] Failed to load creatures: %v", err)
		return
	}
	defer rows.Close()

	m.mu.Lock()
	defer m.mu.Unlock()

	for rows.Next() {
		var c CreatureTemplate
		var hp, pp, pd, ap, ad, ct sql.NullInt64
		if err := rows.Scan(
			&c.Slug, &c.SpeciesName, &c.Stage, &c.Shape, &c.Types,
			&c.SpriteFront, &c.SpriteOverworld,
			&hp, &pp, &pd, &ap, &ad, &ct,
		); err == nil {
			c.HP = int(hp.Int64)
			c.PhysicalPower = int(pp.Int64)
			c.PhysicalDefense = int(pd.Int64)
			c.AbilityPower = int(ap.Int64)
			c.AbilityDefense = int(ad.Int64)
			c.CombatTempo = int(ct.Int64)
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

func (m *Manager) GetCreature(slug string) (CreatureTemplate, bool) {
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

func (m *Manager) GetRawMapData(mapID string) (grid, npcs, tileLayers, tilesets, voxels string, ok bool) {
	if m.db == nil {
		return "", "", "", "", "", false
	}
	err := m.db.QueryRow(`
		SELECT COALESCE(gridData, ''), COALESCE(npcsData, ''), COALESCE(tileLayersData, ''), COALESCE(tilesetsData, ''), COALESCE(voxelData, '')
		FROM WorldMap
		WHERE slug = ? OR id = ?
	`, mapID, mapID).Scan(&grid, &npcs, &tileLayers, &tilesets, &voxels)
	
	if err != nil {
		log.Printf("[Registry] Failed to get map data for %s: %v", mapID, err)
		return "", "", "", "", "", false
	}
	return grid, npcs, tileLayers, tilesets, voxels, true
}
