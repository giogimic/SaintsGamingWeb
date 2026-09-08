package world

import (
	"math"
)

// PRNG is a simple Linear Congruential Generator (LCG) for deterministic pseudo-random numbers
type PRNG struct {
	seed uint32
}

func NewPRNG(seed uint32) *PRNG {
	return &PRNG{
		seed: seed ^ 0xdeadbeef,
	}
}

func (p *PRNG) NextFloat() float64 {
	p.seed = (1664525 * p.seed) + 1013904223
	return float64(p.seed) / 4294967296.0
}

// FeaturePlacer deterministically places features (like trees, rocks) into the chunk.
type FeaturePlacer struct{}

// PlaceFeatures evaluates and places features into the chunk.
func (f *FeaturePlacer) PlaceFeatures(chunk *VoxelChunk, globalSeed uint32, biome BiomeDefinition) {
	chunkSeed := globalSeed ^ uint32(chunk.CX*73856093) ^ uint32(chunk.CZ*19126627)
	prng := NewPRNG(chunkSeed)

	if len(biome.Features.SpawnableFlora) == 0 {
		return
	}

	const ATTEMPTS = 5

	for i := 0; i < ATTEMPTS; i++ {
		// Pick a random surface X, Z within the chunk
		lx := int(math.Floor(prng.NextFloat() * float64(ChunkSizeX)))
		lz := int(math.Floor(prng.NextFloat() * float64(ChunkSizeZ)))

		surfaceY := -1
		var surfaceMat uint32 = 0

		for y := ChunkSizeY - 1; y >= 0; y-- {
			word := chunk.Get(lx, y, lz)
			if !IsVoxelAir(word) {
				surfaceY = y
				surfaceMat = VoxelMaterial(word)
				break
			}
		}

		if surfaceY == -1 || surfaceY >= ChunkSizeY-5 {
			continue // No space
		}

		totalWeight := 0.0
		for _, flora := range biome.Features.SpawnableFlora {
			totalWeight += flora.Weight
		}
		if totalWeight == 0 {
			continue
		}

		roll := prng.NextFloat() * totalWeight
		var selectedFeature string
		for _, flora := range biome.Features.SpawnableFlora {
			if roll < flora.Weight {
				selectedFeature = flora.FeatureID
				break
			}
			roll -= flora.Weight
		}

		if selectedFeature == "" {
			continue
		}

		f.placeFeatureAt(chunk, lx, surfaceY, lz, surfaceMat, selectedFeature, prng)
	}
}

func (f *FeaturePlacer) placeFeatureAt(chunk *VoxelChunk, lx, surfaceY, lz int, surfaceMat uint32, featureID string, prng *PRNG) {
	// Simple feature catalog for demo purposes
	// Using hardcoded TS material equivalents for now:
	const VOXEL_MAT_GRASS = 2
	const VOXEL_MAT_SAND = 5
	const VOXEL_MAT_WOOD = 7

	if featureID == "oak_tree" && surfaceMat == VOXEL_MAT_GRASS {
		// Trunk
		height := 3 + int(math.Floor(prng.NextFloat()*3)) // 3 to 5 tall
		trunkWord := PackVoxel(VOXEL_MAT_WOOD, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		for y := 1; y <= height; y++ {
			if surfaceY+y < ChunkSizeY {
				chunk.Set(lx, surfaceY+y, lz, trunkWord)
			}
		}
		// Leaves (mock using grass material for now)
		leafWord := PackVoxel(VOXEL_MAT_GRASS, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		if surfaceY+height+1 < ChunkSizeY {
			chunk.Set(lx, surfaceY+height+1, lz, leafWord)
			if lx > 0 {
				chunk.Set(lx-1, surfaceY+height, lz, leafWord)
			}
			if lx < ChunkSizeX-1 {
				chunk.Set(lx+1, surfaceY+height, lz, leafWord)
			}
			if lz > 0 {
				chunk.Set(lx, surfaceY+height, lz-1, leafWord)
			}
			if lz < ChunkSizeZ-1 {
				chunk.Set(lx, surfaceY+height, lz+1, leafWord)
			}
		}
	} else if featureID == "cactus" && surfaceMat == VOXEL_MAT_SAND {
		height := 2 + int(math.Floor(prng.NextFloat()*3))
		cactusWord := PackVoxel(VOXEL_MAT_GRASS, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		for y := 1; y <= height; y++ {
			if surfaceY+y < ChunkSizeY {
				chunk.Set(lx, surfaceY+y, lz, cactusWord)
			}
		}
	}
}
