package world

import (
	"math"
)

// BiomeTerrainConfig defines noise parameters for the biome.
type BiomeTerrainConfig struct {
	BaseHeight  float64
	Amplitude   float64
	Frequency   float64
	Octaves     int
	Persistence float64
	Lacunarity  float64
}

// BiomeStrataConfig defines the layers of geological material.
type BiomeStrataConfig struct {
	SurfaceMaterial    uint32
	SubsurfaceMaterial uint32
	SubsurfaceDepth    float64
	MantleMaterial     uint32
	BedrockMaterial    uint32
}

// BiomeFeaturePool defines spawnable entities and flora.
type BiomeFeaturePool struct {
	SpawnableFlora []struct {
		FeatureID string
		Weight    float64
	}
	SpawnableEntities []struct {
		EntityID     string
		Weight       float64
		MaxGroupSize int
	}
}

// BiomeDefinition contains all generation info for a single biome.
type BiomeDefinition struct {
	ID       string
	Seed     uint32
	Terrain  BiomeTerrainConfig
	Strata   BiomeStrataConfig
	Features BiomeFeaturePool
}

// ProceduralVoxelGenerator evaluates continuous fractal terrain heights and populates chunks.
type ProceduralVoxelGenerator struct {
	noise *SimplexNoise2D
	biome BiomeDefinition
}

func NewProceduralVoxelGenerator(biome BiomeDefinition) *ProceduralVoxelGenerator {
	return &ProceduralVoxelGenerator{
		noise: NewSimplexNoise2D(biome.Seed),
		biome: biome,
	}
}

func (g *ProceduralVoxelGenerator) SetBiome(biome BiomeDefinition) {
	g.biome = biome
	g.noise.Reseed(biome.Seed)
}

// GetSurfaceHeight evaluates the continuous terrain surface elevation at world (wx, wz).
func (g *ProceduralVoxelGenerator) GetSurfaceHeight(wx, wz float64) float64 {
	offset := g.noise.FBm(wx, wz,
		g.biome.Terrain.Octaves,
		g.biome.Terrain.Frequency,
		g.biome.Terrain.Persistence,
		g.biome.Terrain.Lacunarity,
		g.biome.Terrain.Amplitude)

	height := math.Round(g.biome.Terrain.BaseHeight + offset)
	if height < 1 {
		height = 1
	} else if height > 31 {
		height = 31
	}
	return height
}

// PopulateChunk generates volumetric voxel data for a 32x32x32 chunk according to biome strata rules.
func (g *ProceduralVoxelGenerator) PopulateChunk(cx, cy, cz int) *VoxelChunk {
	chunk := &VoxelChunk{CX: cx, CY: cy, CZ: cz}

	startWX := cx * ChunkSizeX
	startWY := cy * ChunkSizeY
	startWZ := cz * ChunkSizeZ

	strata := g.biome.Strata

	surfaceWord := PackVoxel(strata.SurfaceMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	subsurfaceWord := PackVoxel(strata.SubsurfaceMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	mantleWord := PackVoxel(strata.MantleMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	bedrockWord := PackVoxel(strata.BedrockMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)

	for lz := 0; lz < ChunkSizeZ; lz++ {
		wz := float64(startWZ + lz)
		for lx := 0; lx < ChunkSizeX; lx++ {
			wx := float64(startWX + lx)
			surfaceH := g.GetSurfaceHeight(wx, wz)

			for ly := 0; ly < ChunkSizeY; ly++ {
				wy := float64(startWY + ly)

				if wy > surfaceH {
					// Air (default for chunk)
					chunk.Set(lx, ly, lz, VoxelWordAir)
				} else if wy == 0 {
					// Bedrock layer
					chunk.Set(lx, ly, lz, bedrockWord)
				} else {
					depth := surfaceH - wy
					if depth == 0 {
						chunk.Set(lx, ly, lz, surfaceWord)
					} else if depth <= strata.SubsurfaceDepth {
						chunk.Set(lx, ly, lz, subsurfaceWord)
					} else {
						chunk.Set(lx, ly, lz, mantleWord)
					}
				}
			}
		}
	}

	return chunk
}
