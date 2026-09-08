package world

import (
	"encoding/json"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
)

// MapDef is a loaded base map definition (logic grid + meta).
type MapDef struct {
	ID       string
	Name     string
	Width    int
	Height   int
	Grid     [][]int // [y][x] logic tile ids
	NPCs     []NPCDef
	Gates    []GateDef
	SpawnX      float64
	SpawnY      float64
	RegionClass string
	Voxel       *VoxelWorld
}

// GateDef is a warp gateway definition in the live world.
type GateDef struct {
	ID          string `json:"id"`
	X           int    `json:"x"`
	Y           int    `json:"y"`
	TargetMapID string `json:"targetMapId"`
	TargetX     int    `json:"targetX"`
	TargetY     int    `json:"targetY"`
	Category    string `json:"category,omitempty"`
	Disabled    bool   `json:"disabled,omitempty"`
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

// IsWalkable checks 3D voxel collision if available, or logic grid as fallback.
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

	// 1. Authoritative 3D Voxel Collision
	if def.Voxel != nil {
		wz := def.Height - 1 - y
		return def.Voxel.IsTraversableAt(x, 16, wz)
	}

	// 2. Legacy 2D logic grid fallback
	if y < len(def.Grid) && x < len(def.Grid[y]) {
		tile := def.Grid[y][x]
		return tile != protocol.TileWall
	}
	return true
}

// IsWalkable3D performs a full 3D AABB voxel collision check.
func (m *Manager) IsWalkable3D(baseMapID string, wx, wy, wz int) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	def, ok := m.defs[baseMapID]
	if !ok || def == nil || def.Voxel == nil {
		return true
	}
	return def.Voxel.IsTraversableAt(wx, wy, wz)
}

// GetDefaultBiome returns the standard emerald_plains biome.
func GetDefaultBiome() BiomeDefinition {
	return BiomeDefinition{
		ID:   "emerald_plains",
		Seed: 42,
		Terrain: BiomeTerrainConfig{
			BaseHeight:  16,
			Amplitude:   6,
			Frequency:   0.018,
			Octaves:     4,
			Persistence: 0.5,
			Lacunarity:  2.0,
		},
		Strata: BiomeStrataConfig{
			SurfaceMaterial:    2,
			SubsurfaceMaterial: 3,
			SubsurfaceDepth:    3,
			MantleMaterial:     4,
			BedrockMaterial:    1,
		},
		Features: BiomeFeaturePool{
			SpawnableFlora: []struct {
				FeatureID string
				Weight    float64
			}{
				{FeatureID: "oak_tree", Weight: 10},
				{FeatureID: "tall_grass", Weight: 50},
			},
		},
	}
}

// BuildDemoMapDef creates an in-memory DEMO_SANDBOX as an infinite fractal map and pregenerates the spawn area.
func BuildDemoMapDef() *MapDef {
	w, h := 0, 0 // 0 signifies infinite bounding box

	voxelWorld := &VoxelWorld{
		ID:           protocol.DemoMapID,
		WidthChunks:  1,
		DepthChunks:  1,
		HeightChunks: 1,
		Chunks:       make(map[string]*VoxelChunk),
	}

	biome := GetDefaultBiome()
	generator := NewProceduralVoxelGenerator(biome)
	placer := &FeaturePlacer{}

	// Pregenerate a 5x5 chunk radius around spawn (cx: -2 to 2, cz: -2 to 2)
	for cx := -2; cx <= 2; cx++ {
		for cz := -2; cz <= 2; cz++ {
			chunk := generator.PopulateChunk(cx, 0, cz)
			placer.PlaceFeatures(chunk, biome.Seed, biome)
			voxelWorld.SetChunk(cx, 0, cz, chunk)
		}
	}

	return &MapDef{
		ID:          protocol.DemoMapID,
		Name:        "Demo Sandbox",
		Width:       w,
		Height:      h,
		Grid:        [][]int{}, // No logic grid for fractal maps
		SpawnX:      float64(protocol.DefaultSpawnX),
		SpawnY:      float64(protocol.DefaultSpawnY),
		RegionClass: "fractal",
		Voxel:       voxelWorld,
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
