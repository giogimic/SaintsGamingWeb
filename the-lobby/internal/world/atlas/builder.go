package atlas

func BuildAtlasWorld(seed interface{}) *AtlasWorldContext {
	numericSeed := hashSeed(seed)

	elevSource := NewNoiseSource(numericSeed + 1)
	tempSource := NewNoiseSource(numericSeed + 2)
	moistSource := NewNoiseSource(numericSeed + 3)
	contSource := NewNoiseSource(numericSeed + 4)
	erosionSource := NewNoiseSource(numericSeed + 5)
	ruggedSource := NewNoiseSource(numericSeed + 6)
	geoSource := NewNoiseSource(numericSeed + 7)
	microSource := NewNoiseSource(numericSeed + 8)
	terrainDensitySource := NewNoiseSource(numericSeed + 9)
	caveDensitySource := NewNoiseSource(numericSeed + 10)

	warpXSource := NewNoiseSource(numericSeed + 100)
	warpYSource := NewNoiseSource(numericSeed + 101)

	rawElev := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_elevation", Name: "Raw Elevation", Dimensions: 2,
		Source: elevSource, Octaves: 4, Scale: 0.005,
	})
	rawTemp := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_temperature", Name: "Raw Temperature", Dimensions: 2,
		Source: tempSource, Octaves: 3, Scale: 0.002,
	})
	rawMoist := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_moisture", Name: "Raw Moisture", Dimensions: 2,
		Source: moistSource, Octaves: 3, Scale: 0.002,
	})
	rawCont := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_continentalness", Name: "Raw Continentalness", Dimensions: 2,
		Source: contSource, Octaves: 2, Scale: 0.001,
	})
	rawErosion := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_erosion", Name: "Raw Erosion", Dimensions: 2,
		Source: erosionSource, Octaves: 2, Scale: 0.003,
	})
	rawRugged := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_ruggedness", Name: "Raw Ruggedness", Dimensions: 2,
		Source: ruggedSource, Octaves: 3, Scale: 0.01,
	})
	rawGeo := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_geology", Name: "Raw Geology", Dimensions: 3,
		Source: geoSource, Octaves: 2, Scale: 0.02,
	})
	rawMicro := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_micro", Name: "Raw Micro Detail", Dimensions: 2,
		Source: microSource, Octaves: 4, Scale: 0.1, // High frequency for local bumps
	})
	rawTerrainDensity := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_terrain_density", Name: "Raw Terrain Density", Dimensions: 3,
		Source: terrainDensitySource, Octaves: 3, Scale: 0.03, // Low frequency for overhangs
	})
	rawCaveDensity := NewFractalNoiseField(FractalNoiseConfig{
		ID: "raw_cave_density", Name: "Raw Cave Density", Dimensions: 3,
		Source: caveDensitySource, Octaves: 4, Scale: 0.08, // Med frequency for swiss-cheese caves
	})

	warpX := NewFractalNoiseField(FractalNoiseConfig{
		ID: "warp_x", Name: "Warp X", Dimensions: 2,
		Source: warpXSource, Octaves: 2, Scale: 0.01,
	})
	warpY := NewFractalNoiseField(FractalNoiseConfig{
		ID: "warp_y", Name: "Warp Y", Dimensions: 2,
		Source: warpYSource, Octaves: 2, Scale: 0.01,
	})

	warpedElev := NewDomainWarpField("warped_elev", rawElev, warpX, warpY, nil, 20.0)
	warpedTemp := NewDomainWarpField("warped_temp", rawTemp, warpX, warpY, nil, 10.0)
	warpedMoist := NewDomainWarpField("warped_moist", rawMoist, warpX, warpY, nil, 10.0)

	maxAmp4 := 1.875
	maxAmp3 := 1.75
	maxAmp2 := 1.5

	return &AtlasWorldContext{
		Seed:            seed,
		Elevation:       NewRemapField("elevation", warpedElev, -maxAmp4, maxAmp4, 0.0, 1.0),
		Temperature:     NewRemapField("temperature", warpedTemp, -maxAmp3, maxAmp3, 0.0, 1.0),
		Moisture:        NewRemapField("moisture", warpedMoist, -maxAmp3, maxAmp3, 0.0, 1.0),
		Continentalness: NewRemapField("continentalness", rawCont, -maxAmp2, maxAmp2, 0.0, 1.0),
		Erosion:         NewRemapField("erosion", rawErosion, -maxAmp2, maxAmp2, 0.0, 1.0),
		Ruggedness:      NewRemapField("ruggedness", rawRugged, -maxAmp3, maxAmp3, 0.0, 1.0),
		Geology:         NewRemapField("geology", rawGeo, -maxAmp2, maxAmp2, 0.0, 1.0),
		MicroDetail:     rawMicro,
		TerrainDensity:  rawTerrainDensity,
		CaveDensity:     rawCaveDensity,
	}
}
