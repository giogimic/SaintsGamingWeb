package world

import (
	"encoding/json"
	"fmt"
)

// LiveNPC is a studio/runtime overworld NPC on a base map.
type LiveNPC struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	SpriteID string  `json:"spriteId"`
	Dialogue string  `json:"dialogueId,omitempty"`
}

// LootDrop is a ground loot pile.
type LootDrop struct {
	ID     string `json:"id"`
	ItemID string `json:"itemId"`
	Name   string `json:"name"`
	Qty    int    `json:"qty"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	MapID  string `json:"mapId"` // instance
}

// Studio extras on Manager (NPCs + loot) — methods appended here.

func (m *Manager) SpawnNPC(baseMapID string, npc LiveNPC) {
	m.mu.Lock()
	defer m.mu.Unlock()
	def, ok := m.defs[baseMapID]
	if !ok {
		return
	}
	found := false
	for i := range def.NPCs {
		if def.NPCs[i].ID == npc.ID {
			def.NPCs[i] = NPCDef{
				ID: npc.ID, Name: npc.Name, X: npc.X, Y: npc.Y,
				SpriteID: npc.SpriteID, Dialogue: npc.Dialogue,
			}
			found = true
			break
		}
	}
	if !found {
		def.NPCs = append(def.NPCs, NPCDef{
			ID: npc.ID, Name: npc.Name, X: npc.X, Y: npc.Y,
			SpriteID: npc.SpriteID, Dialogue: npc.Dialogue,
		})
	}
}

func (m *Manager) DespawnNPC(baseMapID, npcID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	def, ok := m.defs[baseMapID]
	if !ok {
		return
	}
	out := def.NPCs[:0]
	for _, n := range def.NPCs {
		if n.ID != npcID {
			out = append(out, n)
		}
	}
	def.NPCs = out
}

func (m *Manager) ListNPCs(baseMapID string) []NPCDef {
	m.mu.RLock()
	defer m.mu.RUnlock()
	def, ok := m.defs[baseMapID]
	if !ok {
		return nil
	}
	out := make([]NPCDef, len(def.NPCs))
	copy(out, def.NPCs)
	return out
}

// ApplyGrid updates walkability from a JSON grid payload.
func (m *Manager) ApplyGrid(baseMapID, name, gridJSON string) error {
	grid, err := ParseGridJSON(gridJSON)
	if err != nil {
		return err
	}
	if len(grid) == 0 {
		return fmt.Errorf("empty grid")
	}
	h := len(grid)
	w := len(grid[0])
	m.mu.Lock()
	defer m.mu.Unlock()
	def, ok := m.defs[baseMapID]
	if !ok {
		def = &MapDef{ID: baseMapID}
		m.defs[baseMapID] = def
	}
	if name != "" {
		def.Name = name
	}
	def.Width, def.Height = w, h
	def.Grid = grid
	return nil
}

// ApplyVoxel updates authoritative 3D voxel geometry from a JSON voxelDoc payload.
func (m *Manager) ApplyVoxel(baseMapID, name string, voxelJSON []byte) error {
	voxelWorld, err := ParseVoxelDoc(voxelJSON)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	def, ok := m.defs[baseMapID]
	if !ok {
		def = &MapDef{ID: baseMapID}
		m.defs[baseMapID] = def
	}
	if name != "" {
		def.Name = name
	}
	def.Voxel = voxelWorld
	if voxelWorld.MapWidth > 0 {
		def.Width = voxelWorld.MapWidth
	}
	if voxelWorld.MapHeight > 0 {
		def.Height = voxelWorld.MapHeight
	}
	return nil
}

// NPCsJSON serializes NPCs for persistence.
func (m *Manager) NPCsJSON(baseMapID string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	def := m.defs[baseMapID]
	if def == nil {
		return "[]", nil
	}
	b, err := json.Marshal(def.NPCs)
	return string(b), err
}
