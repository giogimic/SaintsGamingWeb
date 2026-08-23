package creature

import (
	"fmt"
	"sync"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
)

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

// SeedDemoSpawns places a few creatures on a public DEMO shard.
func (m *Manager) SeedDemoSpawns(instanceID string) {
	m.Spawn(instanceID, Entity{
		Species: "brushpup", Name: "Brushpup", X: 10, Y: 12,
		Sprite: "brushpup", Hostile: false, Level: 3,
	})
	m.Spawn(instanceID, Entity{
		Species: "emberkit", Name: "Emberkit", X: 18, Y: 18,
		Sprite: "emberkit", Hostile: true, Level: 4,
	})
}
