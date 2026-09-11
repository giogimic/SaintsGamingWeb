package atlas

// CalculateTerrainElevation calculates the final mathematical terrain elevation (0.0 to 1.0+)
// at a specific X/Z coordinate.
func CalculateTerrainElevation(
	context *AtlasWorldContext,
	resolver *AtlasRegionResolver,
	x, z float64,
) (float64, BiomeBlend) {
	sample := FieldSample{X: x, Y: 0, Z: z}

	// 1. Get raw mathematical fields
	elev := context.Elevation.Sample(sample)
	cont := context.Continentalness.Sample(sample)
	erosion := context.Erosion.Sample(sample)
	rugged := context.Ruggedness.Sample(sample)

	// 2. Resolve the geographic region to get terrain modifiers
	blend := resolver.ResolveArea(context, x, z)
	
	pMods := blend.Primary.TerrainModifiers
	sMods := blend.Secondary.TerrainModifiers
	w := blend.Weight

	// Interpolate modifiers
	heightOffset := pMods.HeightOffset*(1.0-w) + sMods.HeightOffset*w
	heightMultiplier := pMods.HeightMultiplier*(1.0-w) + sMods.HeightMultiplier*w
	ruggednessMultiplier := pMods.RuggednessMultiplier*(1.0-w) + sMods.RuggednessMultiplier*w

	// 3. Apply geographic interactions
	// Erosion smooths out ruggedness. High erosion (1.0) means low rugged impact.
	// Continentalness boosts the base height inland.
	erosionFactor := 1.0 - erosion // 0.0 means completely eroded

	ruggedImpact := rugged * erosionFactor * cont * ruggednessMultiplier

	// 4. Calculate final height
	finalHeight := elev + ruggedImpact

	// 5. Apply region-specific mathematical overrides
	finalHeight = finalHeight*heightMultiplier + heightOffset

	return finalHeight, blend
}

// CalculateVoxelDensity calculates the full 3D volumetric density at a specific point.
// Returns density ( > 0 means solid ), the biome blend, the mapped base surface elevation, and the Geological Index (GI).
func CalculateVoxelDensity(
	context *AtlasWorldContext,
	resolver *AtlasRegionResolver,
	x, y, z float64,
) (float64, BiomeBlend, float64, float64) {
	// 1. Get 2D Elevation
	atlasElev, blend := CalculateTerrainElevation(context, resolver, x, z)

	// Map Atlas Height (0.0 to 1.0) to world voxel coordinates (BaseElevation)
	baseElevation := 16.0
	elevationRange := 8.0
	mappedElev := baseElevation + (atlasElev-0.5)*elevationRange*2

	// Add micro detail to mappedElev (2D)
	micro := context.MicroDetail.Sample(FieldSample{X: x, Y: 0, Z: z})
	mappedElev += micro * 2.0

	// 2. Base Density = Distance from surface
	// If y is below mappedElev, baseDensity > 0. If above, < 0.
	baseDensity := mappedElev - y

	// 3. Evaluate 3D Terrain Density
	sample3D := FieldSample{X: x, Y: y, Z: z}
	terrainDensity := context.TerrainDensity.Sample(sample3D)
	
	// Add 3D Terrain Density (scale up amplitude to form overhangs and islands)
	density := baseDensity + terrainDensity*10.0 

	// 4. Calculate Geological Index (GI)
	sample2D := FieldSample{X: x, Y: 0, Z: z}
	tilt := context.Tilt.Sample(sample2D)
	fold := context.Fold.Sample(sample2D)
	gi := y + (tilt * 50.0) + (fold * 15.0)

	// 5. Evaluate Caves (3-Pass Algorithm based on GI)
	depth := mappedElev - y
	if depth > 4.0 { // only carve caves below the immediate surface
		if gi > 120 {
			// Pass 1: Karst Caverns (Wide chambers)
			if context.CaveKarst.Sample(sample3D) > 0.2 {
				density -= 20.0
			}
		} else if gi > 15 {
			// Pass 2: Tectonic Fault Worms (Pipes)
			nA := context.CaveWormA.Sample(sample3D)
			nB := context.CaveWormB.Sample(sample3D)
			if (nA*nA + nB*nB) < 0.05 { // threshold squared
				density -= 20.0
			}
		} else {
			// Pass 3: Magma Chambers (Ellipsoidal with planar cut)
			cMagma := context.CaveMagma.Sample(sample3D)
			if cMagma > 0.3 { // Base ellipsoidal chamber
				// Planar cut for flat magma lakes (will be filled by fluids engine)
				if y > 5.0 { 
					density -= 20.0
				}
			}
		}
	}

	return density, blend, mappedElev, gi
}
