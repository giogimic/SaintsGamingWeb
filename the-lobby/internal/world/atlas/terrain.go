package atlas

// CalculateTerrainElevation calculates the final mathematical terrain elevation (0.0 to 1.0+)
// at a specific X/Z coordinate.
func CalculateTerrainElevation(
	context *AtlasWorldContext,
	resolver *AtlasRegionResolver,
	x, z float64,
) (float64, *FractalArea) {
	sample := FieldSample{X: x, Y: 0, Z: z}

	// 1. Get raw mathematical fields
	elev := context.Elevation.Sample(sample)
	cont := context.Continentalness.Sample(sample)
	erosion := context.Erosion.Sample(sample)
	rugged := context.Ruggedness.Sample(sample)

	// 2. Resolve the geographic region to get terrain modifiers
	area := resolver.ResolveArea(context, x, z)
	mods := area.TerrainModifiers

	// 3. Apply geographic interactions
	// Erosion smooths out ruggedness. High erosion (1.0) means low rugged impact.
	// Continentalness boosts the base height inland.
	erosionFactor := 1.0 - erosion // 0.0 means completely eroded

	ruggedImpact := rugged * erosionFactor * cont * mods.RuggednessMultiplier

	// 4. Calculate final height
	finalHeight := elev + ruggedImpact

	// 5. Apply region-specific mathematical overrides
	finalHeight = finalHeight*mods.HeightMultiplier + mods.HeightOffset

	return finalHeight, area
}
