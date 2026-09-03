package world

import (
	"encoding/json"
	"fmt"
)

const (
	ChunkSizeX      = 32
	ChunkSizeY      = 32
	ChunkSizeZ      = 32
	ChunkTotalCells = ChunkSizeX * ChunkSizeY * ChunkSizeZ // 32,768 cells

	ChunkShiftX = 5
	ChunkShiftZ = 5
	ChunkShiftY = 5
	ChunkMask   = 31 // 0x1F

	// Voxel Physics Layers (bits 24..27)
	PhysicsPassThrough    = 0
	PhysicsSolidObstacle  = 1
	PhysicsWalkableSlope  = 2
	PhysicsSwimmableFluid = 3
	PhysicsClimbable      = 4
	PhysicsHazard         = 5

	// Voxel Shapes (bits 12..16)
	ShapeAir            = 0
	ShapeFullCube       = 1
	ShapeSlope45        = 2
	ShapeSlabBottom     = 7
	ShapeSlabTop        = 8
	ShapeStairsStraight = 9
	ShapeStairsCorner   = 10

	// Voxel Logic Layers (bits 28..31)
	LogicNone        = 0
	LogicSpawnAnchor = 1
	LogicWarpGate    = 2
	LogicHarvestNode = 3
	LogicShopCounter = 4
	LogicSafeZone    = 5
	LogicQuestTarget = 6

	// Common Voxel Words
	VoxelWordAir = 0
)

// PackVoxel builds a 32-bit voxel word.
func PackVoxel(materialID uint16, shapeID, orientation, aoTint, physics, logic uint8) uint32 {
	return (uint32(materialID)&0x0FFF) |
		((uint32(shapeID)&0x1F) << 12) |
		((uint32(orientation)&0x07) << 17) |
		((uint32(aoTint)&0x0F) << 20) |
		((uint32(physics)&0x0F) << 24) |
		((uint32(logic)&0x0F) << 28)
}

// VoxelPhysics extracts the 4-bit physics type.
func VoxelPhysics(word uint32) uint8 {
	return uint8((word >> 24) & 0x0F)
}

// VoxelShape extracts the 5-bit shape ID.
func VoxelShape(word uint32) uint8 {
	return uint8((word >> 12) & 0x1F)
}

// VoxelLogic extracts the 4-bit logic action.
func VoxelLogic(word uint32) uint8 {
	return uint8((word >> 28) & 0x0F)
}

// VoxelMaterial extracts the 12-bit material ID.
func VoxelMaterial(word uint32) uint16 {
	return uint16(word & 0x0FFF)
}

// IsVoxelAir checks if cell is empty.
func IsVoxelAir(word uint32) bool {
	return (word&0x0FFF) == 0 && VoxelShape(word) == ShapeAir
}

// IsVoxelSolid checks if cell is a solid obstacle or hazard.
func IsVoxelSolid(word uint32) bool {
	p := VoxelPhysics(word)
	return p == PhysicsSolidObstacle || p == PhysicsHazard
}

// VoxelChunk represents a uniform 32x32x32 isotropic chunk in memory.
type VoxelChunk struct {
	CX   int
	CZ   int
	CY   int
	Data [ChunkTotalCells]uint32
}

// ChunkIndex computes the 1D linear array index using bitwise math.
func ChunkIndex(lx, ly, lz int) int {
	return (lx & ChunkMask) | ((lz & ChunkMask) << ChunkShiftZ) | ((ly & ChunkMask) << (ChunkShiftX + ChunkShiftZ))
}

func (c *VoxelChunk) Get(lx, ly, lz int) uint32 {
	if lx < 0 || lx >= ChunkSizeX || ly < 0 || ly >= ChunkSizeY || lz < 0 || lz >= ChunkSizeZ {
		return VoxelWordAir
	}
	return c.Data[ChunkIndex(lx, ly, lz)]
}

func (c *VoxelChunk) Set(lx, ly, lz int, word uint32) {
	if lx < 0 || lx >= ChunkSizeX || ly < 0 || ly >= ChunkSizeY || lz < 0 || lz >= ChunkSizeZ {
		return
	}
	c.Data[ChunkIndex(lx, ly, lz)] = word
}

// DecodeChunkRLE unpacks wire/database RLE streams into a 32³ VoxelChunk.
func DecodeChunkRLE(rle []int, cx, cz, cy int) *VoxelChunk {
	chunk := &VoxelChunk{CX: cx, CZ: cz, CY: cy}
	idx := 0
	for i := 0; i+1 < len(rle) && idx < ChunkTotalCells; i += 2 {
		count := rle[i]
		val := uint32(uint64(rle[i+1]) & 0xFFFFFFFF)
		for c := 0; c < count && idx < ChunkTotalCells; c++ {
			chunk.Data[idx] = val
			idx++
		}
	}
	return chunk
}

// VoxelDocJSON mirrors the TypeScript VoxelWorldDocV3 schema.
type VoxelDocJSON struct {
	FormatVersion int                 `json:"formatVersion"`
	ID            string              `json:"id"`
	Name          string              `json:"name"`
	MapWidth      *int                `json:"mapWidth,omitempty"`
	MapHeight     *int                `json:"mapHeight,omitempty"`
	Dimensions    struct {
		WidthChunks  int `json:"widthChunks"`
		DepthChunks  int `json:"depthChunks"`
		HeightChunks int `json:"heightChunks"`
	} `json:"dimensions"`
	Chunks map[string][]int `json:"chunks"`
}

// VoxelWorld manages volumetric chunks for a region in server memory.
type VoxelWorld struct {
	ID           string
	WidthChunks  int
	DepthChunks  int
	HeightChunks int
	MapWidth     int
	MapHeight    int
	Chunks       map[string]*VoxelChunk
}

// ParseVoxelDoc deserializes a JSON voxelDoc into server memory.
// FormatChunkKey returns the uniform spatial format: ${cx}_${cy}_${cz}.
func FormatChunkKey(cx, cy, cz int) string {
	return fmt.Sprintf("%d_%d_%d", cx, cy, cz)
}

// ParseVoxelDoc deserializes a JSON voxelDoc into server memory.
func ParseVoxelDoc(data []byte) (*VoxelWorld, error) {
	var doc VoxelDocJSON
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, err
	}
	w := &VoxelWorld{
		ID:           doc.ID,
		WidthChunks:  doc.Dimensions.WidthChunks,
		DepthChunks:  doc.Dimensions.DepthChunks,
		HeightChunks: doc.Dimensions.HeightChunks,
		Chunks:       make(map[string]*VoxelChunk),
	}
	if w.WidthChunks <= 0 {
		w.WidthChunks = 1
	}
	if w.DepthChunks <= 0 {
		w.DepthChunks = 1
	}
	if w.HeightChunks <= 0 {
		w.HeightChunks = 1
	}

	if doc.MapWidth != nil && *doc.MapWidth > 0 {
		w.MapWidth = *doc.MapWidth
	} else {
		w.MapWidth = w.WidthChunks * ChunkSizeX
	}
	if doc.MapHeight != nil && *doc.MapHeight > 0 {
		w.MapHeight = *doc.MapHeight
	} else {
		w.MapHeight = w.DepthChunks * ChunkSizeZ
	}

	for key, rle := range doc.Chunks {
		var a, b, c int
		_, err := fmt.Sscanf(key, "%d_%d_%d", &a, &b, &c)
		if err != nil {
			continue
		}
		var cx, cy, cz int
		cx = a
		if doc.Dimensions.HeightChunks == 1 && c == 0 && b != 0 {
			// Legacy cx_cz_0 format
			cz = b
			cy = c
		} else {
			// Uniform spatial format: cx_cy_cz
			cy = b
			cz = c
		}
		chunk := DecodeChunkRLE(rle, cx, cz, cy)
		w.Chunks[FormatChunkKey(cx, cy, cz)] = chunk
		w.Chunks[fmt.Sprintf("%d_%d_%d", cx, cz, cy)] = chunk
	}
	return w, nil
}

// GetVoxel retrieves the 32-bit voxel word at global coordinates (wx, wy, wz).
func (w *VoxelWorld) GetVoxel(wx, wy, wz int) uint32 {
	cx := wx >> ChunkShiftX
	cz := wz >> ChunkShiftZ
	cy := wy >> ChunkShiftY
	if wx < 0 && wx%ChunkSizeX != 0 {
		cx--
	}
	if wz < 0 && wz%ChunkSizeZ != 0 {
		cz--
	}
	if wy < 0 && wy%ChunkSizeY != 0 {
		cy--
	}

	lx := ((wx % ChunkSizeX) + ChunkSizeX) % ChunkSizeX
	lz := ((wz % ChunkSizeZ) + ChunkSizeZ) % ChunkSizeZ
	ly := ((wy % ChunkSizeY) + ChunkSizeY) % ChunkSizeY

	spatialKey := FormatChunkKey(cx, cy, cz)
	chunk, ok := w.Chunks[spatialKey]
	if !ok || chunk == nil {
		chunk = w.Chunks[fmt.Sprintf("%d_%d_%d", cx, cz, cy)]
	}
	if chunk == nil {
		return VoxelWordAir
	}
	return chunk.Get(lx, ly, lz)
}

// SetVoxel sets the 32-bit voxel word at global coordinates (wx, wy, wz).
func (w *VoxelWorld) SetVoxel(wx, wy, wz int, word uint32) {
	cx := wx >> ChunkShiftX
	cz := wz >> ChunkShiftZ
	cy := wy >> ChunkShiftY
	if wx < 0 && wx%ChunkSizeX != 0 {
		cx--
	}
	if wz < 0 && wz%ChunkSizeZ != 0 {
		cz--
	}
	if wy < 0 && wy%ChunkSizeY != 0 {
		cy--
	}

	lx := ((wx % ChunkSizeX) + ChunkSizeX) % ChunkSizeX
	lz := ((wz % ChunkSizeZ) + ChunkSizeZ) % ChunkSizeZ
	ly := ((wy % ChunkSizeY) + ChunkSizeY) % ChunkSizeY

	spatialKey := FormatChunkKey(cx, cy, cz)
	legacyKey := fmt.Sprintf("%d_%d_%d", cx, cz, cy)
	chunk, ok := w.Chunks[spatialKey]
	if !ok || chunk == nil {
		chunk = w.Chunks[legacyKey]
	}
	if chunk == nil {
		chunk = &VoxelChunk{CX: cx, CZ: cz, CY: cy}
		w.Chunks[spatialKey] = chunk
		w.Chunks[legacyKey] = chunk
	}
	chunk.Set(lx, ly, lz, word)
}

// IsTraversableAt evaluates 3D AABB traversal for an entity standing at (wx, wy, wz).
func (w *VoxelWorld) IsTraversableAt(wx, wy, wz int) bool {
	bodyWord := w.GetVoxel(wx, wy, wz)
	groundWord := w.GetVoxel(wx, wy-1, wz)

	bodyPhys := VoxelPhysics(bodyWord)
	bodyShape := VoxelShape(bodyWord)

	// Traversable elevations (slopes, stairs, bottom slabs) allow stepping up/through
	isTraversableElevation := bodyPhys == PhysicsWalkableSlope ||
		bodyShape == ShapeStairsStraight ||
		bodyShape == ShapeStairsCorner ||
		bodyShape == ShapeSlabBottom

	// If body intersects solid obstacle or hazard and is not a walkable slope/stair
	if (bodyPhys == PhysicsSolidObstacle || bodyPhys == PhysicsHazard) && !isTraversableElevation {
		return false
	}

	// Check ground support (must have solid ground or active traversable elevation)
	if (groundWord == 0 || IsVoxelAir(groundWord)) && !isTraversableElevation {
		return false
	}

	return true
}

// BuildDemoVoxelWorld generates an authoritative 32³ demo world.
func BuildDemoVoxelWorld(widthBlocks, depthBlocks int) *VoxelWorld {
	wChunks := (widthBlocks + ChunkSizeX - 1) / ChunkSizeX
	dChunks := (depthBlocks + ChunkSizeZ - 1) / ChunkSizeZ

	world := &VoxelWorld{
		ID:           "DEMO_SANDBOX",
		WidthChunks:  wChunks,
		DepthChunks:  dChunks,
		HeightChunks: 1,
		MapWidth:     widthBlocks,
		MapHeight:    depthBlocks,
		Chunks:       make(map[string]*VoxelChunk),
	}

	gunmetal := PackVoxel(1, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	grass := PackVoxel(2, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	wall := PackVoxel(3, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)

	// Fill foundation Y=0..14 with gunmetal, Y=15 with grass
	for z := 0; z < depthBlocks; z++ {
		for x := 0; x < widthBlocks; x++ {
			for y := 0; y < 15; y++ {
				world.SetVoxel(x, y, z, gunmetal)
			}
			world.SetVoxel(x, 15, z, grass)

			// Perimeter barrier walls at Y=16
			if x == 0 || z == 0 || x == widthBlocks-1 || z == depthBlocks-1 {
				world.SetVoxel(x, 16, z, wall)
			}
		}
	}
	return world
}
