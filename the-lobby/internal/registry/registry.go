package registry

import (
	"database/sql"
	"encoding/json"
	"log"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world/atlas"
)

// The Registry Manager holds all canonical content in thread-safe memory maps.
type Manager struct {
	db *sql.DB

	mu        sync.RWMutex
	classes   map[string]CharacterClass
	creatures map[string]CreatureDef
	items     map[string]ItemTemplate
	biomes    map[string]atlas.FractalArea
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
		biomes:    make(map[string]atlas.FractalArea),
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
	m.ReloadBiomes()
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

func (m *Manager) ReloadBiomes() {
	rows, err := m.db.Query(`
		SELECT id, name, description, temperature, moisture, 
		       amplitude, frequency, octaves, persistence, lacunarity,
		       surfaceMaterial, subsurfaceMaterial, mantleMaterial, bedrockMaterial
		FROM Biome
	`)
	if err != nil {
		log.Printf("[Registry] Failed to load biomes: %v", err)
		return
	}
	defer rows.Close()

	m.mu.Lock()
	defer m.mu.Unlock()

	for rows.Next() {
		var b atlas.FractalArea
		var temp, moist, amp sql.NullFloat64
		var surf, sub, mantle, bed sql.NullInt64
		var freq, pers, lac sql.NullFloat64
		var oct sql.NullInt64

		if err := rows.Scan(
			&b.ID, &b.Name, &b.Description,
			&temp, &moist,
			&amp, &freq, &oct, &pers, &lac,
			&surf, &sub, &mantle, &bed,
		); err == nil {
			
			tVar := 0.5
			if temp.Valid {
				tVar = temp.Float64
			}
			moistVar := 0.5
			if moist.Valid {
				moistVar = moist.Float64
			}
			b.ClimateRules = atlas.AreaClimateRules{
				MinTemp: tVar - 0.2, MaxTemp: tVar + 0.2,
				MinMoisture: moistVar - 0.2, MaxMoisture: moistVar + 0.2,
				MinElevation: 0.0, MaxElevation: 1.0,
			}
			b.TerrainModifiers = atlas.AreaTerrainModifiers{
				HeightOffset:         0.0,
				HeightMultiplier:     amp.Float64,
				RuggednessMultiplier: freq.Float64 * 10,
			}
			b.Strata = atlas.AreaStrata{
				RegolithMaterial:    uint32(surf.Int64),
				SedimentaryMaterial: uint32(sub.Int64),
				PlutonicMaterial:    uint32(mantle.Int64),
				MetamorphicMaterial: uint32(mantle.Int64),
				BasementMaterial:    uint32(mantle.Int64),
				BedrockMaterial:     uint32(bed.Int64),
			}
			b.Flora = make([]atlas.AreaFlora, 0)
			m.biomes[b.ID] = b
		} else {
			log.Printf("[Registry] Scan error on biome: %v", err)
		}
	}

	// Load Foliage associations for biomes
	fRows, err := m.db.Query(`
		SELECT bf.biomeId, f.name, f.category, bf.spawnWeight
		FROM BiomeFoliage bf
		JOIN FoliageDef f ON bf.foliageId = f.id
	`)
	if err == nil {
		defer fRows.Close()
		for fRows.Next() {
			var biomeID, fName, fCat string
			var weight float64
			if err := fRows.Scan(&biomeID, &fName, &fCat, &weight); err == nil {
				if b, ok := m.biomes[biomeID]; ok {
					b.Flora = append(b.Flora, atlas.AreaFlora{
						Name:        fName,
						Category:    fCat,
						SpawnWeight: weight,
					})
					m.biomes[biomeID] = b
				}
			}
		}
	}

	log.Printf("[Registry] Loaded %d biomes", len(m.biomes))
}

func (m *Manager) GetAllBiomes() []atlas.FractalArea {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.biomes) == 0 {
		return atlas.CanonicalFractalAreas
	}
	var out []atlas.FractalArea
	for _, b := range m.biomes {
		out = append(out, b)
	}
	return out
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

