package craft

import "sync"

// Recipe defines inputs → output.
type Recipe struct {
	Slug   string         `json:"slug"`
	Name   string         `json:"name"`
	Inputs map[string]int `json:"inputs"` // itemId -> qty
	Output string         `json:"output"`
	OutQty int            `json:"outQty"`
	OutName string        `json:"outName"`
}

// Manager holds craft recipes.
type Manager struct {
	mu       sync.RWMutex
	recipes  map[string]Recipe
}

func NewManager() *Manager {
	m := &Manager{recipes: make(map[string]Recipe)}
	m.recipes["field_kit"] = Recipe{
		Slug: "field_kit", Name: "Field Kit",
		Inputs: map[string]int{"loot_scrap": 2, "potion": 1},
		Output: "field_kit", OutQty: 1, OutName: "Field Kit",
	}
	m.recipes["capture_film_pack"] = Recipe{
		Slug: "capture_film_pack", Name: "Film Pack",
		Inputs: map[string]int{"loot_scrap": 1},
		Output: "capture_film", OutQty: 3, OutName: "Capture Film",
	}
	return m
}

func (m *Manager) Get(slug string) (Recipe, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.recipes[slug]
	return r, ok
}

func (m *Manager) List() []Recipe {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]Recipe, 0, len(m.recipes))
	for _, r := range m.recipes {
		out = append(out, r)
	}
	return out
}
