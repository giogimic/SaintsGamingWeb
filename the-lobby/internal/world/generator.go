package world

import (
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world/atlas"
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

// BiomeStrataConfig defines the layers of geological material based on GI.
type BiomeStrataConfig struct {
	RegolithMaterial    uint32 // GI > 180
	SedimentaryMaterial uint32 // 120 < GI <= 180
	PlutonicMaterial    uint32 // 60 < GI <= 120
	MetamorphicMaterial uint32 // 15 < GI <= 60
	BasementMaterial    uint32 // GI <= 15
	BedrockMaterial     uint32
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

// ProceduralVoxelGenerator evaluates continuous fractal terrain heights and populates chunks using Atlas.
type ProceduralVoxelGenerator struct {
	context  *atlas.AtlasWorldContext
	resolver *atlas.AtlasRegionResolver
}

func NewProceduralVoxelGenerator(seed interface{}) *ProceduralVoxelGenerator {
	return &ProceduralVoxelGenerator{
		context:  atlas.BuildAtlasWorld(seed),
		resolver: atlas.NewAtlasRegionResolver(nil),
	}
}

// PopulateChunk generates volumetric voxel data for a 32x32x32 chunk according to biome strata rules.
func (g *ProceduralVoxelGenerator) PopulateChunk(cx, cy, cz int) *VoxelChunk {
	chunk := &VoxelChunk{CX: cx, CY: cy, CZ: cz}

	startWX := cx * ChunkSizeX
	startWY := cy * ChunkSizeY
	startWZ := cz * ChunkSizeZ

	// Pre-calculate atlas properties for this chunk's vertical columns
	for lz := 0; lz < ChunkSizeZ; lz++ {
		wz := float64(startWZ + lz)
		for lx := 0; lx < ChunkSizeX; lx++ {
			wx := float64(startWX + lx)

			for ly := 0; ly < ChunkSizeY; ly++ {
				wy := float64(startWY + ly)

				density, blend, mappedElev, gi := atlas.CalculateVoxelDensity(g.context, g.resolver, wx, wy, wz)

				if startWY+ly == 0 {
					chunk.Set(lx, ly, lz, PackVoxel(blend.Primary.Strata.BedrockMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone))
					continue
				}

				if density <= 0 {
					chunk.Set(lx, ly, lz, VoxelWordAir)
					continue
				}

				strata := blend.Primary.Strata

				// Determine material based on Geological Index (GI)
				var mat uint32
				if gi > 180 {
					mat = strata.RegolithMaterial
				} else if gi > 120 {
					mat = strata.SedimentaryMaterial
				} else if gi > 60 {
					mat = strata.PlutonicMaterial
				} else if gi > 15 {
					mat = strata.MetamorphicMaterial
				} else {
					mat = strata.BasementMaterial
				}
				
				// Evaluate Mythic Ores
				mat = EvaluateMythicOres(g.context, wx, wy, wz, mat, gi, mappedElev, density)
				chunk.Set(lx, ly, lz, PackVoxel(mat, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone))
			}
		}
	}

	return chunk
}
