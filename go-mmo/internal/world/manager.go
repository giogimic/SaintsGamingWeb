package world

import (
	"encoding/json"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
)

// MapDef is a loaded base map definition (logic grid + meta).
type MapDef struct {
	ID       string
	Name     string
	Width    int
	Height   int
	Grid     [][]int // [y][x] logic tile ids
	NPCs     []NPCDef
	SpawnX   float64
	SpawnY   float64
}

// NPCDef is a static overworld NPC seed.
type NPCDef struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	SpriteID string  `json:"spriteId"`
	Dialogue string  `json:"dialogueId,omitempty"`
}

// Instance is a live shard room.
type Instance struct {
	InstanceID  string
	BaseMapID   string
	PlayerCount int
	IsPrivate   bool
	IsPIE       bool
}

// Manager holds map defs + live instances.
type Manager struct {
	mu        sync.RWMutex
	defs      map[string]*MapDef
	instances map[string]*Instance
	maxPerShard int
}

func NewManager(maxPerShard int) *Manager {
	if maxPerShard <= 0 {
		maxPerShard = 50
	}
	return &Manager{
		defs:        make(map[string]*MapDef),
		instances:   make(map[string]*Instance),
		maxPerShard: maxPerShard,
	}
}

func (m *Manager) RegisterDef(def *MapDef) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.defs[def.ID] = def
}

func (m *Manager) GetDef(baseID string) (*MapDef, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	d, ok := m.defs[baseID]
	return d, ok
}

func (m *Manager) EnsureDemoDef() *MapDef {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d, ok := m.defs[protocol.DemoMapID]; ok {
		return d
	}
	d := BuildDemoMapDef()
	m.defs[d.ID] = d
	return d
}

// JoinMap assigns a shard and returns the live instance.
func (m *Manager) JoinMap(baseMapID, accountID string, isPrivate, pie bool) (*Instance, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.defs[baseMapID]; !ok {
		if baseMapID == protocol.DemoMapID {
			m.defs[baseMapID] = BuildDemoMapDef()
		} else {
			m.defs[baseMapID] = &MapDef{
				ID:     baseMapID,
				Name:   baseMapID,
				Width:  128,
				Height: 128,
				SpawnX: float64(protocol.DefaultSpawnX),
				SpawnY: float64(protocol.DefaultSpawnY),
			}
		}
	}

	var instanceID string
	var isPriv, isPIE bool
	switch {
	case pie:
		instanceID = PIEInstanceID(accountID)
		isPIE = true
		isPriv = true
	case isPrivate:
		instanceID = PrivateInstanceID(baseMapID, accountID)
		isPriv = true
	default:
		cands := make([]PublicShardCandidate, 0, len(m.instances))
		for _, inst := range m.instances {
			cands = append(cands, PublicShardCandidate{
				InstanceID:  inst.InstanceID,
				MapID:       inst.BaseMapID,
				PlayerCount: inst.PlayerCount,
			})
		}
		pick := PickPublicShardAssignment(baseMapID, cands, m.maxPerShard)
		instanceID = pick.InstanceID
	}

	inst, ok := m.instances[instanceID]
	if !ok {
		inst = &Instance{
			InstanceID: instanceID,
			BaseMapID:  baseMapID,
			IsPrivate:  isPriv,
			IsPIE:      isPIE,
		}
		m.instances[instanceID] = inst
	}
	inst.PlayerCount++
	return inst, nil
}

func (m *Manager) LeaveInstance(instanceID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	inst, ok := m.instances[instanceID]
	if !ok {
		return
	}
	inst.PlayerCount--
	if inst.PlayerCount <= 0 {
		inst.PlayerCount = 0
		// Keep public shards warm; drop private/PIE when empty.
		if inst.IsPrivate || inst.IsPIE {
			delete(m.instances, instanceID)
		}
	}
}

func (m *Manager) ListPublicShards(baseMapID string) []PublicShardCandidate {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]PublicShardCandidate, 0)
	for _, inst := range m.instances {
		if inst.BaseMapID == baseMapID && IsPublicChannel(inst.InstanceID) {
			out = append(out, PublicShardCandidate{
				InstanceID:  inst.InstanceID,
				MapID:       inst.BaseMapID,
				PlayerCount: inst.PlayerCount,
			})
		}
	}
	return out
}

// IsWalkable checks logic grid (walls = TileWall).
func (m *Manager) IsWalkable(baseMapID string, x, y int) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	def, ok := m.defs[baseMapID]
	if !ok || def == nil {
		return x >= 0 && y >= 0 && x < 256 && y < 256
	}
	if x < 0 || y < 0 {
		return false
	}
	if def.Width > 0 && x >= def.Width {
		return false
	}
	if def.Height > 0 && y >= def.Height {
		return false
	}
	if y < len(def.Grid) && x < len(def.Grid[y]) {
		tile := def.Grid[y][x]
		return tile != protocol.TileWall
	}
	return true
}

// BuildDemoMapDef creates an in-memory DEMO_SANDBOX (30x30 grass, border walls).
func BuildDemoMapDef() *MapDef {
	w, h := protocol.DemoMapW, protocol.DemoMapH
	grid := make([][]int, h)
	for y := 0; y < h; y++ {
		row := make([]int, w)
		for x := 0; x < w; x++ {
			if x == 0 || y == 0 || x == w-1 || y == h-1 {
				row[x] = protocol.TileWall
			} else {
				row[x] = protocol.TileGrass
			}
		}
		grid[y] = row
	}
	// Clearing around spawn
	sx, sy := protocol.DefaultSpawnX, protocol.DefaultSpawnY
	for dy := -2; dy <= 2; dy++ {
		for dx := -2; dx <= 2; dx++ {
			x, y := sx+dx, sy+dy
			if x > 0 && y > 0 && x < w-1 && y < h-1 {
				grid[y][x] = protocol.TileWalk
			}
		}
	}
	return &MapDef{
		ID:     protocol.DemoMapID,
		Name:   "Demo Sandbox",
		Width:  w,
		Height: h,
		Grid:   grid,
		SpawnX: float64(sx),
		SpawnY: float64(sy),
		NPCs: []NPCDef{
			{ID: "npc_guide", Name: "Trail Guide", X: 12, Y: 15, SpriteID: "npc_guide", Dialogue: "demo_welcome"},
			{ID: "npc_shop", Name: "Provisioner", X: 16, Y: 15, SpriteID: "npc_shop", Dialogue: "demo_shop"},
		},
	}
}

// GridJSON serializes grid for DB persistence.
func (d *MapDef) GridJSON() (string, error) {
	b, err := json.Marshal(d.Grid)
	return string(b), err
}

// ParseGridJSON loads a 2D grid from JSON.
func ParseGridJSON(s string) ([][]int, error) {
	var grid [][]int
	if err := json.Unmarshal([]byte(s), &grid); err != nil {
		return nil, err
	}
	return grid, nil
}
