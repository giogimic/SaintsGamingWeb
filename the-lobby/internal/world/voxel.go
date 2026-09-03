package world

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"math"
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

// EncodePaletteRLEBinary serializes the 32³ chunk into a palette-indexed binary RLE byte stream.
func (c *VoxelChunk) EncodePaletteRLEBinary() []byte {
	paletteMap := make(map[uint32]uint8)
	var palette []uint32

	for _, word := range c.Data {
		if _, exists := paletteMap[word]; !exists {
			if len(palette) < 256 {
				paletteMap[word] = uint8(len(palette))
				palette = append(palette, word)
			}
		}
	}

	paletteCount := len(palette)
	type run struct {
		count  uint16
		palIdx uint8
	}
	var runs []run

	if len(c.Data) > 0 {
		curWord := c.Data[0]
		curPalIdx := paletteMap[curWord]
		count := uint16(1)

		for i := 1; i < len(c.Data); i++ {
			word := c.Data[i]
			palIdx := paletteMap[word]
			if palIdx == curPalIdx && count < 65535 {
				count++
			} else {
				runs = append(runs, run{count: count, palIdx: curPalIdx})
				curPalIdx = palIdx
				count = 1
			}
		}
		runs = append(runs, run{count: count, palIdx: curPalIdx})
	}

	headerSize := 1 + 6 + 1 + paletteCount*4
	bodySize := len(runs) * 3
	buf := make([]byte, headerSize+bodySize)

	buf[0] = 0x01 // CHUNK_PACKET_PALETTE_RLE
	binary.LittleEndian.PutUint16(buf[1:3], uint16(int16(c.CX)))
	binary.LittleEndian.PutUint16(buf[3:5], uint16(int16(c.CY)))
	binary.LittleEndian.PutUint16(buf[5:7], uint16(int16(c.CZ)))

	if paletteCount == 256 {
		buf[7] = 0
	} else {
		buf[7] = uint8(paletteCount)
	}

	offset := 8
	for _, word := range palette {
		binary.LittleEndian.PutUint32(buf[offset:offset+4], word)
		offset += 4
	}

	for _, r := range runs {
		binary.LittleEndian.PutUint16(buf[offset:offset+2], r.count)
		offset += 2
		buf[offset] = r.palIdx
		offset++
	}

	return buf
}

// DecodePaletteRLEBinary unpacks a palette-indexed binary RLE byte stream into a 32³ VoxelChunk.
func DecodePaletteRLEBinary(data []byte) (*VoxelChunk, error) {
	if len(data) < 8 {
		return nil, errors.New("insufficient data for chunk header")
	}

	if data[0] != 0x01 {
		return nil, fmt.Errorf("invalid packet type: 0x%02x", data[0])
	}

	cx := int(int16(binary.LittleEndian.Uint16(data[1:3])))
	cy := int(int16(binary.LittleEndian.Uint16(data[3:5])))
	cz := int(int16(binary.LittleEndian.Uint16(data[5:7])))

	palCountByte := data[7]
	palCount := int(palCountByte)
	if palCount == 0 {
		palCount = 256
	}

	headerSize := 8 + palCount*4
	if len(data) < headerSize {
		return nil, errors.New("insufficient data for palette entries")
	}

	palette := make([]uint32, palCount)
	for p := 0; p < palCount; p++ {
		palette[p] = binary.LittleEndian.Uint32(data[8+p*4 : 12+p*4])
	}

	chunk := &VoxelChunk{CX: cx, CZ: cz, CY: cy}
	targetIdx := 0
	offset := headerSize

	for offset+3 <= len(data) && targetIdx < ChunkTotalCells {
		count := int(binary.LittleEndian.Uint16(data[offset : offset+2]))
		offset += 2
		palIdx := int(data[offset])
		offset++

		var word uint32
		if palIdx < len(palette) {
			word = palette[palIdx]
		}

		for c := 0; c < count && targetIdx < ChunkTotalCells; c++ {
			chunk.Data[targetIdx] = word
			targetIdx++
		}
	}

	return chunk, nil
}

// VoxelDeltaPacket represents an authoritative 8-13 byte single-voxel mutation.
type VoxelDeltaPacket struct {
	CX         int
	CY         int
	CZ         int
	LocalIndex uint16
	Word       uint32
}

// SerializeVoxelDelta encodes a single-voxel mutation into a 13-byte packet.
func SerializeVoxelDelta(cx, cy, cz int, localIndex uint16, word uint32) []byte {
	buf := make([]byte, 13)
	buf[0] = 0x02 // CHUNK_PACKET_DELTA_VOXEL
	binary.LittleEndian.PutUint16(buf[1:3], uint16(int16(cx)))
	binary.LittleEndian.PutUint16(buf[3:5], uint16(int16(cy)))
	binary.LittleEndian.PutUint16(buf[5:7], uint16(int16(cz)))
	binary.LittleEndian.PutUint16(buf[7:9], localIndex&0x7fff)
	binary.LittleEndian.PutUint32(buf[9:13], word)
	return buf
}

// DeserializeVoxelDelta decodes a single-voxel mutation packet.
func DeserializeVoxelDelta(data []byte) (*VoxelDeltaPacket, error) {
	if len(data) < 13 || data[0] != 0x02 {
		return nil, errors.New("invalid voxel delta packet")
	}
	return &VoxelDeltaPacket{
		CX:         int(int16(binary.LittleEndian.Uint16(data[1:3]))),
		CY:         int(int16(binary.LittleEndian.Uint16(data[3:5]))),
		CZ:         int(int16(binary.LittleEndian.Uint16(data[5:7]))),
		LocalIndex: binary.LittleEndian.Uint16(data[7:9]),
		Word:       binary.LittleEndian.Uint32(data[9:13]),
	}, nil
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

// Vector3D represents a 3D float vector.
type Vector3D struct {
	X float64
	Y float64
	Z float64
}

// AABB represents an axis-aligned bounding box.
type AABB struct {
	MinX, MinY, MinZ float64
	MaxX, MaxY, MaxZ float64
}

func (a AABB) Overlaps(b AABB, epsilon float64) bool {
	return a.MinX < b.MaxX-epsilon &&
		a.MaxX > b.MinX+epsilon &&
		a.MinY < b.MaxY-epsilon &&
		a.MaxY > b.MinY+epsilon &&
		a.MinZ < b.MaxZ-epsilon &&
		a.MaxZ > b.MinZ+epsilon
}

// SweptCollisionResult contains the resolved movement state.
type SweptCollisionResult struct {
	Position   Vector3D
	Velocity   Vector3D
	IsGrounded bool
	HitCeiling bool
	HitWall    bool
	SteppedUp  bool
}

// QueryObstacleBoxes returns all solid obstacle boxes intersecting the query AABB.
func (w *VoxelWorld) QueryObstacleBoxes(queryBox AABB) []AABB {
	minBX := int(math.Floor(queryBox.MinX))
	maxBX := int(math.Floor(queryBox.MaxX))
	minBY := int(math.Floor(queryBox.MinY))
	maxBY := int(math.Floor(queryBox.MaxY))
	minBZ := int(math.Floor(queryBox.MinZ))
	maxBZ := int(math.Floor(queryBox.MaxZ))

	var boxes []AABB
	for by := minBY; by <= maxBY; by++ {
		for bz := minBZ; bz <= maxBZ; bz++ {
			for bx := minBX; bx <= maxBX; bx++ {
				word := w.GetVoxel(bx, by, bz)
				if word == 0 || IsVoxelAir(word) {
					continue
				}
				phys := VoxelPhysics(word)
				if phys == PhysicsPassThrough || phys == PhysicsSwimmableFluid {
					continue
				}
				if IsVoxelSolid(word) || phys == PhysicsSolidObstacle || phys == PhysicsHazard {
					shape := VoxelShape(word)
					if shape == ShapeSlabBottom {
						boxes = append(boxes, AABB{
							MinX: float64(bx), MinY: float64(by), MinZ: float64(bz),
							MaxX: float64(bx + 1), MaxY: float64(by) + 0.5, MaxZ: float64(bz + 1),
						})
					} else if shape == ShapeSlabTop {
						boxes = append(boxes, AABB{
							MinX: float64(bx), MinY: float64(by) + 0.5, MinZ: float64(bz),
							MaxX: float64(bx + 1), MaxY: float64(by + 1), MaxZ: float64(bz + 1),
						})
					} else {
						boxes = append(boxes, AABB{
							MinX: float64(bx), MinY: float64(by), MinZ: float64(bz),
							MaxX: float64(bx + 1), MaxY: float64(by + 1), MaxZ: float64(bz + 1),
						})
					}
				}
			}
		}
	}
	return boxes
}

// ResolveSweptAABB calculates continuous collision response with axis-separated sliding and 0.5m step-up.
func (w *VoxelWorld) ResolveSweptAABB(startPos, velocity Vector3D, dt, width, height, depth, stepHeight float64) SweptCollisionResult {
	halfW := width / 2.0
	halfD := depth / 2.0

	totalDispX := velocity.X * dt
	totalDispY := velocity.Y * dt
	totalDispZ := velocity.Z * dt

	totalDist := math.Sqrt(totalDispX*totalDispX + totalDispY*totalDispY + totalDispZ*totalDispZ)
	numSubSteps := int(math.Ceil(totalDist / 0.35))
	if numSubSteps < 1 {
		numSubSteps = 1
	}

	subDispX := totalDispX / float64(numSubSteps)
	subDispY := totalDispY / float64(numSubSteps)
	subDispZ := totalDispZ / float64(numSubSteps)

	curX, curY, curZ := startPos.X, startPos.Y, startPos.Z
	curVx, curVy, curVz := velocity.X, velocity.Y, velocity.Z
	isGrounded, hitCeiling, hitWall, steppedUp := false, false, false, false

	for step := 0; step < numSubSteps; step++ {
		origStepX, origStepY, origStepZ := curX, curY, curZ

		// 1. Resolve Y Axis
		candY := curY + subDispY
		aabbY := AABB{
			MinX: curX - halfW, MinY: math.Min(curY, candY), MinZ: curZ - halfD,
			MaxX: curX + halfW, MaxY: math.Max(curY, candY) + height, MaxZ: curZ + halfD,
		}
		yBoxes := w.QueryObstacleBoxes(aabbY)
		resolvedY := candY

		if subDispY < 0 {
			highestGround := -math.MaxFloat64
			for _, box := range yBoxes {
				if curX-halfW < box.MaxX-1e-4 && curX+halfW > box.MinX+1e-4 &&
					curZ-halfD < box.MaxZ-1e-4 && curZ+halfD > box.MinZ+1e-4 {
					if box.MaxY <= curY+1e-4 && box.MaxY > highestGround {
						highestGround = box.MaxY
					}
				}
			}
			if highestGround != -math.MaxFloat64 && candY <= highestGround {
				resolvedY = highestGround
				curVy = 0
				isGrounded = true
			} else {
				isGrounded = false
			}
		} else if subDispY > 0 {
			lowestCeiling := math.MaxFloat64
			for _, box := range yBoxes {
				if curX-halfW < box.MaxX-1e-4 && curX+halfW > box.MinX+1e-4 &&
					curZ-halfD < box.MaxZ-1e-4 && curZ+halfD > box.MinZ+1e-4 {
					if box.MinY >= curY+height-1e-4 && box.MinY < lowestCeiling {
						lowestCeiling = box.MinY
					}
				}
			}
			if lowestCeiling != math.MaxFloat64 && candY+height >= lowestCeiling {
				resolvedY = lowestCeiling - height
				curVy = 0
				hitCeiling = true
			}
		}

		curY = resolvedY

		// Ground support check
		if curVy <= 0 && !isGrounded {
			gCheck := AABB{
				MinX: curX - halfW, MinY: curY - 0.05, MinZ: curZ - halfD,
				MaxX: curX + halfW, MaxY: curY + 0.01, MaxZ: curZ + halfD,
			}
			gBoxes := w.QueryObstacleBoxes(gCheck)
			for _, box := range gBoxes {
				if curX-halfW < box.MaxX-1e-4 && curX+halfW > box.MinX+1e-4 &&
					curZ-halfD < box.MaxZ-1e-4 && curZ+halfD > box.MinZ+1e-4 &&
					math.Abs(curY-box.MaxY) < 0.05 {
					isGrounded = true
					break
				}
			}
		}

		// 2. Resolve X and Z Axes
		if subDispX != 0 || subDispZ != 0 {
			directX := curX + subDispX
			directZ := curZ + subDispZ
			xBlocked := false
			zBlocked := false

			if subDispX != 0 {
				aabbX := AABB{
					MinX: math.Min(curX, directX) - halfW, MinY: curY, MinZ: curZ - halfD,
					MaxX: math.Max(curX, directX) + halfW, MaxY: curY + height, MaxZ: curZ + halfD,
				}
				xBoxes := w.QueryObstacleBoxes(aabbX)
				for _, box := range xBoxes {
					if aabbX.Overlaps(box, 1e-4) {
						xBlocked = true
						hitWall = true
						if subDispX > 0 {
							directX = math.Min(directX, box.MinX-halfW)
						} else {
							directX = math.Max(directX, box.MaxX+halfW)
						}
					}
				}
			}

			if subDispZ != 0 {
				aabbZ := AABB{
					MinX: directX - halfW, MinY: curY, MinZ: math.Min(curZ, directZ) - halfD,
					MaxX: directX + halfW, MaxY: curY + height, MaxZ: math.Max(curZ, directZ) + halfD,
				}
				zBoxes := w.QueryObstacleBoxes(aabbZ)
				for _, box := range zBoxes {
					if aabbZ.Overlaps(box, 1e-4) {
						zBlocked = true
						hitWall = true
						if subDispZ > 0 {
							directZ = math.Min(directZ, box.MinZ-halfD)
						} else {
							directZ = math.Max(directZ, box.MaxZ+halfD)
						}
					}
				}
			}

			// Step-Up Check if Blocked while Grounded
			if (xBlocked || zBlocked) && isGrounded {
				stepLiftY := origStepY + stepHeight
				liftBox := AABB{
					MinX: origStepX - halfW, MinY: origStepY, MinZ: origStepZ - halfD,
					MaxX: origStepX + halfW, MaxY: stepLiftY + height, MaxZ: origStepZ + halfD,
				}
				ceilBoxes := w.QueryObstacleBoxes(liftBox)
				ceilBlocks := false
				for _, box := range ceilBoxes {
					if box.MinY > origStepY && box.MinY < stepLiftY+height {
						if origStepX-halfW < box.MaxX-1e-4 && origStepX+halfW > box.MinX+1e-4 &&
							origStepZ-halfD < box.MaxZ-1e-4 && origStepZ+halfD > box.MinZ+1e-4 {
							ceilBlocks = true
							break
						}
					}
				}

				if !ceilBlocks {
					stepX := origStepX + subDispX
					stepZ := origStepZ + subDispZ
					elevatedAABB := AABB{
						MinX: stepX - halfW, MinY: stepLiftY, MinZ: stepZ - halfD,
						MaxX: stepX + halfW, MaxY: stepLiftY + height, MaxZ: stepZ + halfD,
					}
					elevBoxes := w.QueryObstacleBoxes(elevatedAABB)
					elevBlocked := false
					for _, box := range elevBoxes {
						if elevatedAABB.Overlaps(box, 1e-4) {
							elevBlocked = true
							break
						}
					}

					if !elevBlocked {
						dropBox := AABB{
							MinX: stepX - halfW, MinY: origStepY, MinZ: stepZ - halfD,
							MaxX: stepX + halfW, MaxY: stepLiftY + height, MaxZ: stepZ + halfD,
						}
						dropBoxes := w.QueryObstacleBoxes(dropBox)
						landingY := origStepY
						for _, box := range dropBoxes {
							if stepX-halfW < box.MaxX-1e-4 && stepX+halfW > box.MinX+1e-4 &&
								stepZ-halfD < box.MaxZ-1e-4 && stepZ+halfD > box.MinZ+1e-4 {
								if box.MaxY <= stepLiftY+1e-4 && box.MaxY > landingY {
									landingY = box.MaxY
								}
							}
						}
						if landingY > origStepY && landingY <= origStepY+stepHeight+1e-4 {
							curX = stepX
							curZ = stepZ
							curY = landingY
							isGrounded = true
							steppedUp = true
							hitWall = false
							continue
						}
					}
				}
			}

			curX = directX
			curZ = directZ
			if xBlocked {
				curVx = 0
			}
			if zBlocked {
				curVz = 0
			}
		}
	}

	return SweptCollisionResult{
		Position:   Vector3D{X: curX, Y: curY, Z: curZ},
		Velocity:   Vector3D{X: curVx, Y: curVy, Z: curVz},
		IsGrounded: isGrounded,
		HitCeiling: hitCeiling,
		HitWall:    hitWall,
		SteppedUp:  steppedUp,
	}
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
