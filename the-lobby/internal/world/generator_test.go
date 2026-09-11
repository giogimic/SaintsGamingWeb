package world

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
)

func TestGoToTSCompatibility(t *testing.T) {
	biome := BiomeDefinition{
		ID:   "emerald_plains",
		Seed: 42,
		Terrain: BiomeTerrainConfig{
			BaseHeight:  16,
			Amplitude:   6,
			Frequency:   0.018,
			Octaves:     4,
			Persistence: 0.5,
			Lacunarity:  2.0,
		},
		Strata: BiomeStrataConfig{
			RegolithMaterial:    2,
			SedimentaryMaterial: 3,
			PlutonicMaterial:    4,
			MetamorphicMaterial: 5,
			BasementMaterial:    6,
			BedrockMaterial:     1,
		},
		Features: BiomeFeaturePool{
			SpawnableFlora: []struct {
				FeatureID string
				Weight    float64
			}{
				{FeatureID: "oak_tree", Weight: 10},
				{FeatureID: "tall_grass", Weight: 50},
			},
		},
	}

	generator := NewProceduralVoxelGenerator(biome.Seed)
	placer := &FeaturePlacer{}

	// Test chunk (0,0,0)
	chunk0 := generator.PopulateChunk(0, 0, 0)
	placer.PlaceFeatures(chunk0, biome.Seed, biome)
	bin0 := chunk0.EncodePaletteRLEBinary()
	hash0 := sha256.Sum256(bin0)
	fmt.Printf("Go Chunk (0,0,0) SHA256: %s\n", hex.EncodeToString(hash0[:]))

	// Test chunk (1,0,1)
	chunk1 := generator.PopulateChunk(1, 0, 1)
	hash1Pre := sha256.Sum256(chunk1.EncodePaletteRLEBinary())
	fmt.Printf("Go Chunk (1,0,1) PRE-FEATURES: %s\n", hex.EncodeToString(hash1Pre[:]))
	
	placer.PlaceFeatures(chunk1, biome.Seed, biome)
	bin1 := chunk1.EncodePaletteRLEBinary()
	hash1 := sha256.Sum256(bin1)
	fmt.Printf("Go Chunk (1,0,1) SHA256: %s\n", hex.EncodeToString(hash1[:]))
}
