package world

import (
	"math"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world/atlas"
)

const (
	MaterialSunGold    = 101
	MaterialStarIron   = 102
	MaterialSeaBrass   = 103
	MaterialShadowIron = 104
)

// EvaluateMythicOres determines if a base geological material should be transformed into a Mythic Ore.
func EvaluateMythicOres(
	context *atlas.AtlasWorldContext,
	wx, wy, wz float64,
	baseMaterial uint32,
	gi float64,
	mappedElev float64,
	density float64,
) uint32 {
	sample3D := atlas.FieldSample{X: wx, Y: wy, Z: wz}
	
	// 1. Sun-Gold (Contact Metamorphism)
	// Requires proximity to Magma and Metamorphic rock (GI between 15 and 60).
	if gi > 15 && gi <= 60 {
		cMagma := context.CaveMagma.Sample(sample3D)
		// If we are close to the magma chamber threshold (0.3), there's a chance for Sun-Gold.
		if cMagma > 0.25 && cMagma <= 0.3 {
			// Add some high frequency noise to make it clustered
			micro := context.MicroDetail.Sample(sample3D)
			if micro > 0.6 {
				return MaterialSunGold
			}
		}
	}

	// 2. Star-Iron (Impact Cone Injection)
	// Occurs near the surface (depth < 10) in random clustered impact zones.
	depth := mappedElev - wy
	if depth > 0 && depth < 10 {
		// Use Fold and Tilt as a chaotic proxy for impact zones
		sample2D := atlas.FieldSample{X: wx, Y: 0, Z: wz}
		fold := context.Fold.Sample(sample2D)
		if math.Abs(fold) > 0.8 {
			micro := context.MicroDetail.Sample(sample3D)
			if micro > 0.7 {
				return MaterialStarIron
			}
		}
	}

	// 3. Sea-Brass (Horizontal Strata Bands in Sedimentary)
	if gi > 120 && gi <= 180 {
		// Strata bands occur at specific Y intervals (e.g. every 8 blocks with some noise)
		bandNoise := context.TerrainDensity.Sample(sample3D)
		yVal := int(wy + bandNoise*5.0)
		if yVal%16 == 0 {
			micro := context.MicroDetail.Sample(sample3D)
			if micro > 0.3 {
				return MaterialSeaBrass
			}
		}
	}

	// 4. Shadow-Iron (Alluvial layers in low elevation Sedimentary basins)
	if gi > 120 && gi <= 180 {
		// Low elevation means base mappedElev is low.
		if mappedElev < 10.0 && depth > 2.0 && depth < 6.0 {
			micro := context.MicroDetail.Sample(sample3D)
			if micro > 0.5 {
				return MaterialShadowIron
			}
		}
	}

	return baseMaterial
}
