package world

import (
	"math"
)

// StructurePlacer evaluates multi-chunk structures for a given procedural chunk.
type StructurePlacer struct{}

func NewStructurePlacer() *StructurePlacer {
	return &StructurePlacer{}
}

// PlaceStructures overlays authored VOXEL structures onto the procedural chunk.
func (sp *StructurePlacer) PlaceStructures(chunk *VoxelChunk, def *MapDef, mgr *Manager, globalSeed uint32) {
	if def == nil || len(def.ProceduralStructures) == 0 {
		return
	}

	// For a multi-chunk structure anchor system, we need to check if a structure
	// anchored in a nearby chunk overlaps with the current chunk (chunk.CX, chunk.CY, chunk.CZ).
	// We'll search a 2x2 radius of anchor chunks (from cx-2 to cx+2, cz-2 to cz+2).
	radius := 2

	for dz := -radius; dz <= radius; dz++ {
		for dx := -radius; dx <= radius; dx++ {
			anchorCX := chunk.CX + dx
			anchorCZ := chunk.CZ + dz

			// Deterministic seed for this anchor chunk
			anchorSeed := globalSeed ^ uint32(anchorCX*83123) ^ uint32(anchorCZ*23941)
			prng := NewPRNG(anchorSeed)

			// Roll for each structure
			for _, structDef := range def.ProceduralStructures {
				if structDef.SpawnWeight <= 0 {
					continue
				}

				// Basic check: roll < probability (assume weight is a probability [0.0, 1.0])
				roll := prng.NextFloat()
				if roll > structDef.SpawnWeight {
					continue
				}

				// Structure spawned at anchorCX, anchorCZ!
				// Let's get the voxel blocks from the Manager.
				voxelWorld := mgr.GetVoxelMapBlocks(structDef.VoxelMapID)
				if voxelWorld == nil {
					continue
				}

				// The anchor point inside the anchor chunk (center of chunk)
				anchorWorldX := anchorCX*ChunkSizeX + ChunkSizeX/2
				anchorWorldZ := anchorCZ*ChunkSizeZ + ChunkSizeZ/2
				
				// For now, place it at yOffset + 3 (above bedrock)
				anchorWorldY := structDef.YOffset + 3 
				if anchorWorldY < 0 {
					anchorWorldY = 0
				}

				// Iterate through the loaded voxelWorld and see if any blocks fall into `chunk`.
				voxelWorld.mu.RLock()
				for _, vChunk := range voxelWorld.Chunks {
					for ly := 0; ly < ChunkSizeY; ly++ {
						for lz := 0; lz < ChunkSizeZ; lz++ {
							for lx := 0; lx < ChunkSizeX; lx++ {
								word := vChunk.Get(lx, ly, lz)
								if IsVoxelAir(word) {
									continue
								}

								// World pos of this block relative to the structure's origin (0,0,0)
								bwX := (vChunk.CX * ChunkSizeX) + lx
								bwY := (vChunk.CY * ChunkSizeY) + ly
								bwZ := (vChunk.CZ * ChunkSizeZ) + lz

								// Offset it by the anchor world position
								targetWX := anchorWorldX + bwX
								targetWY := anchorWorldY + bwY
								targetWZ := anchorWorldZ + bwZ

								// Does it fall into the current chunk being generated?
								targetCX := int(math.Floor(float64(targetWX) / float64(ChunkSizeX)))
								targetCY := int(math.Floor(float64(targetWY) / float64(ChunkSizeY)))
								targetCZ := int(math.Floor(float64(targetWZ) / float64(ChunkSizeZ)))

								if targetCX == chunk.CX && targetCY == chunk.CY && targetCZ == chunk.CZ {
									// Yes! Set it in the current chunk.
									localX := targetWX - (targetCX * ChunkSizeX)
									localY := targetWY - (targetCY * ChunkSizeY)
									localZ := targetWZ - (targetCZ * ChunkSizeZ)

									if localX >= 0 && localX < ChunkSizeX && localY >= 0 && localY < ChunkSizeY && localZ >= 0 && localZ < ChunkSizeZ {
										chunk.Set(localX, localY, localZ, word)
									}
								}
							}
						}
					}
				}
				voxelWorld.mu.RUnlock()
			}
		}
	}
}
