package creature

import (
	"fmt"
	"sync"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/registry"
)

// SpawnDef is used to seed creatures from map definitions.
type SpawnDef struct {
	ID   string
	Slug string
	X, Y float64
}

// Entity is a live overworld creature.
type Entity struct {
	ID       string  `json:"id"`
	Species  string  `json:"species"`
	Name     string  `json:"name"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	HP       int     `json:"hp"`
	MaxHP    int     `json:"maxHp"`
	Level    int     `json:"level"`
	Sprite   string  `json:"sprite"`
	MapID    string  `json:"mapId"`
	Hostile  bool    `json:"hostile"`
	Dirty    bool    `json:"-"`
}

// Manager holds per-instance creatures.
type Manager struct {
	mu        sync.RWMutex
	byMap     map[string]map[string]*Entity // instanceID -> id -> entity
	seq       int64
}

func NewManager() *Manager {
	return &Manager{byMap: make(map[string]map[string]*Entity)}
}

func (m *Manager) Spawn(instanceID string, e Entity) *Entity {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	if e.ID == "" {
		e.ID = fmt.Sprintf("cre_%d", m.seq)
	}
	e.MapID = instanceID
	if e.MaxHP == 0 {
		e.MaxHP = 50
	}
	if e.HP == 0 {
		e.HP = e.MaxHP
	}
	if e.Level == 0 {
		e.Level = 5
	}
	bucket, ok := m.byMap[instanceID]
	if !ok {
		bucket = make(map[string]*Entity)
		m.byMap[instanceID] = bucket
	}
	cp := e
	bucket[e.ID] = &cp
	return &cp
}

func (m *Manager) Despawn(instanceID, id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if bucket, ok := m.byMap[instanceID]; ok {
		delete(bucket, id)
	}
}

func (m *Manager) List(instanceID string) []protocol.CreatureSpawn {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]protocol.CreatureSpawn, 0)
	for _, e := range m.byMap[instanceID] {
		out = append(out, protocol.CreatureSpawn{
			ID: e.ID, EntityID: e.ID, Species: e.Species, TemplateID: e.Species, Name: e.Name,
			X: e.X, Y: e.Y, HP: e.HP, MaxHP: e.MaxHP,
			Level: e.Level, Sprite: e.Sprite, SpriteKey: e.Sprite, MapID: e.MapID, Hostile: e.Hostile,
			EntityType: "MONSTER",
		})
	}
	return out
}

func (m *Manager) Tick() {
	// Placeholder AI: mark idle wander occasionally — no-op for now.
	_ = time.Now()
}

func (m *Manager) DrainDirty() []protocol.CreatureSpawn {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]protocol.CreatureSpawn, 0)
	for _, bucket := range m.byMap {
		for _, e := range bucket {
			if e.Dirty {
				out = append(out, protocol.CreatureSpawn{
					ID: e.ID, EntityID: e.ID, Species: e.Species, TemplateID: e.Species, Name: e.Name,
					X: e.X, Y: e.Y, HP: e.HP, MaxHP: e.MaxHP,
					Level: e.Level, Sprite: e.Sprite, SpriteKey: e.Sprite, MapID: e.MapID, Hostile: e.Hostile,
					EntityType: "MONSTER",
				})
				e.Dirty = false
			}
		}
	}
	return out
}

// SeedSpawns places creatures based on map definitions.
func (m *Manager) SeedSpawns(instanceID string, spawns []SpawnDef, reg *registry.Manager) {
	for _, s := range spawns {
		lvl := 3
		name := "Creature"
		maxHP := 50
		hostile := false
		if reg != nil {
			if c, ok := reg.GetCreature(s.Slug); ok {
				name = c.SpeciesName
				hostile = true // Treat all wild spawned creatures as hostile for now, or add flag to schema later
			}
		}
		m.Spawn(instanceID, Entity{
			ID: s.ID, Species: s.Slug, Name: name, X: s.X, Y: s.Y,
			Sprite: s.Slug, Hostile: hostile, Level: lvl, MaxHP: maxHP,
		})
	}
}
