package world

import (
	"math"

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

			// 1. Resolve Atlas Region and Terrain Elevation
			atlasElev, blend := atlas.CalculateTerrainElevation(g.context, g.resolver, wx, wz)
			
			// Sample MicroDetail
			micro := g.context.MicroDetail.Sample(atlas.FieldSample{X: wx, Y: 0, Z: wz})

			// Map Atlas Height (0.0 to 1.0) to world voxel coordinates
			baseElevation := 16.0
			elevationRange := 8.0
			mappedElev := baseElevation + (atlasElev-0.5)*elevationRange*2
			
			// Add micro detail perturbation (e.g., +/- 2 voxels)
			mappedElev += micro * 2.0
			
			surfaceY := int(math.Max(1, math.Min(31, math.Round(mappedElev))))

			strata := blend.Primary.Strata
			surfaceWord := PackVoxel(strata.SurfaceMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
			subsurfaceWord := PackVoxel(strata.SubsurfaceMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
			mantleWord := PackVoxel(strata.MantleMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
			bedrockWord := PackVoxel(strata.BedrockMaterial, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)

			for ly := 0; ly < ChunkSizeY; ly++ {
				wy := startWY + ly

				if wy > surfaceY {
					// Air (default for chunk)
					chunk.Set(lx, ly, lz, VoxelWordAir)
				} else if wy == 0 {
					// Bedrock layer
					chunk.Set(lx, ly, lz, bedrockWord)
				} else {
					depth := surfaceY - wy
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
