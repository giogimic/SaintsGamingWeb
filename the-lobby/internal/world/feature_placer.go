package world

import (
	"math"
	"strings"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world/atlas"
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

// FeaturePlacer deterministically places features (like trees, rocks, flowers) into the chunk.
type FeaturePlacer struct{}

// PlaceFeatures evaluates and places features into the chunk using a single BiomeDefinition (legacy/fallback).
func (f *FeaturePlacer) PlaceFeatures(chunk *VoxelChunk, globalSeed uint32, biome BiomeDefinition) {
	chunkSeed := globalSeed ^ uint32(chunk.CX*73856093) ^ uint32(chunk.CZ*19126627)
	prng := NewPRNG(chunkSeed)

	if len(biome.Features.SpawnableFlora) == 0 {
		return
	}

	const ATTEMPTS = 6

	for i := 0; i < ATTEMPTS; i++ {
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
			continue
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

// PlaceFeaturesWithResolver evaluates and places features into the chunk using the continuous region resolver.
func (f *FeaturePlacer) PlaceFeaturesWithResolver(chunk *VoxelChunk, globalSeed uint32, resolver *atlas.AtlasRegionResolver, context *atlas.AtlasWorldContext) {
	if resolver == nil || context == nil {
		return
	}

	chunkSeed := globalSeed ^ uint32(chunk.CX*73856093) ^ uint32(chunk.CZ*19126627)
	prng := NewPRNG(chunkSeed)

	const ATTEMPTS = 8

	for i := 0; i < ATTEMPTS; i++ {
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

		if surfaceY == -1 || surfaceY >= ChunkSizeY-6 {
			continue
		}

		wx := float64(chunk.CX*ChunkSizeX + lx)
		wz := float64(chunk.CZ*ChunkSizeZ + lz)

		blend := resolver.ResolveArea(context, wx, wz)
		area := blend.Primary
		if area == nil || len(area.Flora) == 0 {
			continue
		}

		totalWeight := 0.0
		for _, flora := range area.Flora {
			totalWeight += flora.SpawnWeight
		}
		if totalWeight <= 0 {
			continue
		}

		roll := prng.NextFloat() * totalWeight
		var selectedFeature string
		for _, flora := range area.Flora {
			if roll < flora.SpawnWeight {
				selectedFeature = flora.Name
				break
			}
			roll -= flora.SpawnWeight
		}

		if selectedFeature == "" {
			continue
		}

		f.placeFeatureAt(chunk, lx, surfaceY, lz, surfaceMat, selectedFeature, prng)
	}
}

func (f *FeaturePlacer) placeFeatureAt(chunk *VoxelChunk, lx, surfaceY, lz int, surfaceMat uint32, featureID string, prng *PRNG) {
	const (
		VOXEL_MAT_GUNMETAL       = 1
		VOXEL_MAT_GRASS          = 2
		VOXEL_MAT_DIRT           = 3
		VOXEL_MAT_STONE          = 4
		VOXEL_MAT_SAND           = 5
		VOXEL_MAT_WOOD           = 7
		VOXEL_MAT_SNOW           = 8
		VOXEL_MAT_ICE            = 12
		VOXEL_MAT_FOLIAGE_FLOWER = 18
	)

	norm := strings.ToLower(strings.TrimSpace(featureID))
	norm = strings.ReplaceAll(norm, " ", "_")

	switch {
	case strings.Contains(norm, "pine") || strings.Contains(norm, "conifer"):
		// Pine Tree: tall wood trunk + tiered conical needles
		height := 4 + int(math.Floor(prng.NextFloat()*3)) // 4 to 6 tall
		trunkWord := PackVoxel(VOXEL_MAT_WOOD, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		for y := 1; y <= height; y++ {
			if surfaceY+y < ChunkSizeY {
				chunk.Set(lx, surfaceY+y, lz, trunkWord)
			}
		}

		foliageMat := uint32(VOXEL_MAT_GRASS)
		if surfaceMat == VOXEL_MAT_SNOW || surfaceMat == VOXEL_MAT_ICE {
			foliageMat = VOXEL_MAT_SNOW
		}
		foliageWord := PackVoxel(foliageMat, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)

		// Base tier: cross
		fBase := surfaceY + height - 2
		if fBase > surfaceY && fBase < ChunkSizeY {
			for dx := -1; dx <= 1; dx++ {
				for dz := -1; dz <= 1; dz++ {
					if (dx == 0 || dz == 0) && lx+dx >= 0 && lx+dx < ChunkSizeX && lz+dz >= 0 && lz+dz < ChunkSizeZ {
						chunk.Set(lx+dx, fBase, lz+dz, foliageWord)
					}
				}
			}
		}
		// Mid tier
		fMid := surfaceY + height - 1
		if fMid > surfaceY && fMid < ChunkSizeY {
			for dx := -1; dx <= 1; dx++ {
				for dz := -1; dz <= 1; dz++ {
					if (dx == 0 && dz == 0) || (dx != 0 && dz == 0) || (dx == 0 && dz != 0) {
						if lx+dx >= 0 && lx+dx < ChunkSizeX && lz+dz >= 0 && lz+dz < ChunkSizeZ {
							chunk.Set(lx+dx, fMid, lz+dz, foliageWord)
						}
					}
				}
			}
		}
		// Top tip
		fTop := surfaceY + height
		if fTop < ChunkSizeY {
			chunk.Set(lx, fTop, lz, foliageWord)
		}
		if fTop+1 < ChunkSizeY {
			chunk.Set(lx, fTop+1, lz, foliageWord)
		}

	case strings.Contains(norm, "tree") || strings.Contains(norm, "oak"):
		// Oak / Broadleaf Tree
		height := 3 + int(math.Floor(prng.NextFloat()*3)) // 3 to 5 tall
		trunkWord := PackVoxel(VOXEL_MAT_WOOD, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		for y := 1; y <= height; y++ {
			if surfaceY+y < ChunkSizeY {
				chunk.Set(lx, surfaceY+y, lz, trunkWord)
			}
		}

		leafWord := PackVoxel(VOXEL_MAT_GRASS, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		canopyY := surfaceY + height

		// 3x3 canopy around top
		for dy := 0; dy <= 1; dy++ {
			cy := canopyY + dy
			if cy >= ChunkSizeY {
				continue
			}
			for dx := -1; dx <= 1; dx++ {
				for dz := -1; dz <= 1; dz++ {
					if dx == 0 && dz == 0 && dy == 0 {
						continue // Trunk block
					}
					if lx+dx >= 0 && lx+dx < ChunkSizeX && lz+dz >= 0 && lz+dz < ChunkSizeZ {
						chunk.Set(lx+dx, cy, lz+dz, leafWord)
					}
				}
			}
		}
		// Crown cap
		if canopyY+2 < ChunkSizeY {
			chunk.Set(lx, canopyY+2, lz, leafWord)
		}

	case strings.Contains(norm, "cactus"):
		// Cactus: 2 to 4 high stalk with optional side arms
		height := 2 + int(math.Floor(prng.NextFloat()*3))
		cactusWord := PackVoxel(VOXEL_MAT_GRASS, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		for y := 1; y <= height; y++ {
			if surfaceY+y < ChunkSizeY {
				chunk.Set(lx, surfaceY+y, lz, cactusWord)
			}
		}
		// Side arm if tall enough
		if height >= 3 {
			armY := surfaceY + 2
			if lx+1 < ChunkSizeX && armY+1 < ChunkSizeY {
				chunk.Set(lx+1, armY, lz, cactusWord)
				chunk.Set(lx+1, armY+1, lz, cactusWord)
			}
		}

	case strings.Contains(norm, "flower") || strings.Contains(norm, "wildflower"):
		// Wildflower: 1 block floral plant, pass-through
		if surfaceY+1 < ChunkSizeY {
			flowerWord := PackVoxel(VOXEL_MAT_FOLIAGE_FLOWER, ShapeThinLayer, 0, 0, PhysicsPassThrough, LogicNone)
			chunk.Set(lx, surfaceY+1, lz, flowerWord)
		}

	case strings.Contains(norm, "grass") || strings.Contains(norm, "tall_grass"):
		// Tall Grass: 1 block pass-through foliage
		if surfaceY+1 < ChunkSizeY {
			grassWord := PackVoxel(VOXEL_MAT_GRASS, ShapeThinLayer, 0, 0, PhysicsPassThrough, LogicNone)
			chunk.Set(lx, surfaceY+1, lz, grassWord)
		}

	case strings.Contains(norm, "bush") || strings.Contains(norm, "forage"):
		// Bush / Berry Bush: harvestable dense vegetation
		if surfaceY+1 < ChunkSizeY {
			bushWord := PackVoxel(VOXEL_MAT_GRASS, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicHarvestNode)
			chunk.Set(lx, surfaceY+1, lz, bushWord)
			if prng.NextFloat() > 0.5 && lx+1 < ChunkSizeX {
				chunk.Set(lx+1, surfaceY+1, lz, bushWord)
			}
		}

	case strings.Contains(norm, "boulder") || strings.Contains(norm, "rock") || strings.Contains(norm, "stone"):
		// Boulder: hardened stone cluster
		stoneWord := PackVoxel(VOXEL_MAT_STONE, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
		if surfaceY+1 < ChunkSizeY {
			chunk.Set(lx, surfaceY+1, lz, stoneWord)
			if prng.NextFloat() > 0.4 && lx+1 < ChunkSizeX {
				chunk.Set(lx+1, surfaceY+1, lz, stoneWord)
			}
			if prng.NextFloat() > 0.6 && lz+1 < ChunkSizeZ {
				chunk.Set(lx, surfaceY+1, lz+1, stoneWord)
			}
		}

	default:
		// Generic plant
		if surfaceY+1 < ChunkSizeY {
			decorWord := PackVoxel(VOXEL_MAT_GRASS, ShapeThinLayer, 0, 0, PhysicsPassThrough, LogicNone)
			chunk.Set(lx, surfaceY+1, lz, decorWord)
		}
	}
}

