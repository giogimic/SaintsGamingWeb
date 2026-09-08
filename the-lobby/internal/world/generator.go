package world

import (
	"math"
	"math/rand"

	"github.com/aquilax/go-perlin"
)

// GeneratorConfig holds the parameters for generating a fractal world.
type GeneratorConfig struct {
	Seed           int64
	BaseElevation  int
	ElevationRange int
	WaterLevel     int
	NoiseScale     float64
}

// GenerateProceduralChunk creates a 32x32x32 VoxelChunk entirely in Go using Perlin noise.
func GenerateProceduralChunk(cx, cy, cz int, config GeneratorConfig) *VoxelChunk {
	chunk := &VoxelChunk{CX: cx, CY: cy, CZ: cz}

	// 1. Initialize Perlin Noise (alpha=2, beta=2, n=3 for standard terrain)
	p := perlin.NewPerlin(2, 2, 3, config.Seed)

	// Material constants mapped to 64-bit VoxelPack format
	// 0: Air, 1: Gunmetal, 2: Grass, 3: Dirt, 4: Stone, 5: Sand, 6: Water
	const (
		MatAir      = 0
		MatGunmetal = 1
		MatGrass    = 2
		MatDirt     = 3
		MatStone    = 4
		MatSand     = 5
		MatWater    = 6
	)

	// Pre-pack common blocks to save CPU in the tight loop
	grassWord := PackVoxel(MatGrass, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	dirtWord := PackVoxel(MatDirt, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	stoneWord := PackVoxel(MatStone, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	sandWord := PackVoxel(MatSand, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
	waterWord := PackVoxel(MatWater, ShapeFullCube, 0, 0, PhysicsSwimmableFluid, LogicNone)

	startWX := cx * ChunkSizeX
	startWY := cy * ChunkSizeY
	startWZ := cz * ChunkSizeZ

	for lx := 0; lx < ChunkSizeX; lx++ {
		for lz := 0; lz < ChunkSizeZ; lz++ {
			wx := startWX + lx
			wz := startWZ + lz

			// Sample 2D Perlin noise for surface elevation
			nx := float64(wx) * config.NoiseScale
			nz := float64(wz) * config.NoiseScale
			noiseVal := p.Noise2D(nx, nz) // Range approx [-1, 1]

			// Map noise to elevation range
			surfaceY := float64(config.BaseElevation) + (noiseVal * float64(config.ElevationRange))
			surfaceYInt := int(math.Round(surfaceY))

			for ly := 0; ly < ChunkSizeY; ly++ {
				wy := startWY + ly
				var word uint64 = VoxelWordAir

				if wy < surfaceYInt-3 {
					word = stoneWord
				} else if wy < surfaceYInt {
					word = dirtWord
				} else if wy == surfaceYInt {
					if wy <= config.WaterLevel+1 {
						word = sandWord
					} else {
						word = grassWord
					}
				} else if wy <= config.WaterLevel {
					word = waterWord
				}

				if word != VoxelWordAir {
					chunk.Set(lx, ly, lz, word)
				}
			}
		}
	}

	// Simple Flora Decorator (Trees)
	rng := rand.New(rand.NewSource(config.Seed + int64(cx*73856093) + int64(cz*19349663)))
	if cy >= 0 && cy <= 1 { // Trees only generate near the ground
		for lx := 2; lx < ChunkSizeX-2; lx++ {
			for lz := 2; lz < ChunkSizeZ-2; lz++ {
				if rng.Float64() < 0.01 { // 1% chance per column
					// Find surface
					for ly := ChunkSizeY - 1; ly >= 0; ly-- {
						idx := ChunkIndex(lx, ly, lz)
						if chunk.Data[idx] == grassWord {
							// Build tree trunk (Gunmetal placeholder for wood)
							woodWord := PackVoxel(MatGunmetal, ShapeFullCube, 0, 0, PhysicsSolidObstacle, LogicNone)
							for t := 1; t <= 4; t++ {
								if ly+t < ChunkSizeY {
									chunk.Set(lx, ly+t, lz, woodWord)
								}
							}
							break
						}
					}
				}
			}
		}
	}

	return chunk
}
