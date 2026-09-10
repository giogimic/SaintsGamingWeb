package atlas

import (
	"math"
	"sort"
)

type AreaClimateRules struct {
	MinTemp      float64
	MaxTemp      float64
	MinMoisture  float64
	MaxMoisture  float64
	MinElevation float64
	MaxElevation float64
}

type AreaTerrainModifiers struct {
	HeightOffset         float64
	HeightMultiplier     float64
	RuggednessMultiplier float64
}

type AreaStrata struct {
	SurfaceMaterial    uint32
	SubsurfaceMaterial uint32
	SubsurfaceDepth    int
	MantleMaterial     uint32
	BedrockMaterial    uint32
}

type DecoratorRule struct {
	Material    uint32
	Probability float64
	StackHeight int
}

type AreaDecorators struct {
	SurfaceFlora   []DecoratorRule
	SubsurfaceOres []DecoratorRule
}

type FractalArea struct {
	ID               string
	Name             string
	Description      string
	ClimateRules     AreaClimateRules
	TerrainModifiers AreaTerrainModifiers
	Strata           AreaStrata
	Decorators       *AreaDecorators
}

var CanonicalFractalAreas = []FractalArea{
	{
		ID:          "area_emerald_plains",
		Name:        "Emerald Plains Area",
		Description: "Gentle, warm, and moderate moisture regions.",
		ClimateRules: AreaClimateRules{
			MinTemp: 0.3, MaxTemp: 0.8,
			MinMoisture: 0.4, MaxMoisture: 0.8,
			MinElevation: 0.1, MaxElevation: 0.6,
		},
		TerrainModifiers: AreaTerrainModifiers{
			HeightOffset: 0.0, HeightMultiplier: 1.0, RuggednessMultiplier: 0.2,
		},
		Strata: AreaStrata{
			SurfaceMaterial:    2, // GRASS
			SubsurfaceMaterial: 3, // DIRT
			SubsurfaceDepth:    3,
			MantleMaterial:     4, // STONE
			BedrockMaterial:    1, // GUNMETAL
		},
		Decorators: &AreaDecorators{
			SurfaceFlora: []DecoratorRule{
				{Material: 7, Probability: 0.02, StackHeight: 4}, // WOOD
				{Material: 8, Probability: 0.05, StackHeight: 1}, // FOLIAGE_FLOWER
			},
			SubsurfaceOres: []DecoratorRule{
				{Material: 3, Probability: 0.05, StackHeight: 1}, // DIRT
			},
		},
	},
	{
		ID:          "area_golden_dunes",
		Name:        "Golden Dunes Area",
		Description: "Hot, arid desert basins.",
		ClimateRules: AreaClimateRules{
			MinTemp: 0.7, MaxTemp: 1.0,
			MinMoisture: 0.0, MaxMoisture: 0.4,
			MinElevation: 0.2, MaxElevation: 0.5,
		},
		TerrainModifiers: AreaTerrainModifiers{
			HeightOffset: 0.0, HeightMultiplier: 1.2, RuggednessMultiplier: 0.5,
		},
		Strata: AreaStrata{
			SurfaceMaterial:    5, // SAND
			SubsurfaceMaterial: 5, // SAND
			SubsurfaceDepth:    5,
			MantleMaterial:     4, // STONE
			BedrockMaterial:    1, // GUNMETAL
		},
		Decorators: &AreaDecorators{
			SurfaceFlora: []DecoratorRule{
				{Material: 7, Probability: 0.005, StackHeight: 2}, // WOOD (cactus/dead bush)
			},
		},
	},
	{
		ID:          "area_alpine_range",
		Name:        "Alpine Range Area",
		Description: "Cold, highly elevated mountain peaks.",
		ClimateRules: AreaClimateRules{
			MinTemp: 0.0, MaxTemp: 0.4,
			MinMoisture: 0.3, MaxMoisture: 1.0,
			MinElevation: 0.6, MaxElevation: 1.0,
		},
		TerrainModifiers: AreaTerrainModifiers{
			HeightOffset: 0.2, HeightMultiplier: 2.0, RuggednessMultiplier: 1.0,
		},
		Strata: AreaStrata{
			SurfaceMaterial:    6, // SNOW
			SubsurfaceMaterial: 4, // STONE
			SubsurfaceDepth:    2,
			MantleMaterial:     4, // STONE
			BedrockMaterial:    1, // GUNMETAL
		},
		Decorators: &AreaDecorators{},
	},
}

type BiomeBlend struct {
	Primary   *FractalArea
	Secondary *FractalArea
	Weight    float64 // 0.0 means 100% Primary, 1.0 means 100% Secondary
}

type AtlasRegionResolver struct {
	areas []FractalArea
}

func NewAtlasRegionResolver(areas []FractalArea) *AtlasRegionResolver {
	if len(areas) == 0 {
		areas = CanonicalFractalAreas
	}
	return &AtlasRegionResolver{areas: areas}
}

func (r *AtlasRegionResolver) ResolveArea(context *AtlasWorldContext, x, z float64) BiomeBlend {
	sample := FieldSample{X: x, Y: 0, Z: z}
	t := context.Temperature.Sample(sample)
	m := context.Moisture.Sample(sample)
	e := context.Elevation.Sample(sample)

	type areaDist struct {
		area *FractalArea
		dist float64
	}

	var distances []areaDist

	for i := range r.areas {
		area := &r.areas[i]
		cr := area.ClimateRules

		centerT := (cr.MinTemp + cr.MaxTemp) / 2.0
		centerM := (cr.MinMoisture + cr.MaxMoisture) / 2.0
		centerE := (cr.MinElevation + cr.MaxElevation) / 2.0

		distT := t - centerT
		distM := m - centerM
		distE := e - centerE

		// Euclidean distance in the climate phase-space
		dist := math.Sqrt(distT*distT + distM*distM + distE*distE)

		distances = append(distances, areaDist{area: area, dist: dist})
	}

	// Sort by distance
	sort.Slice(distances, func(i, j int) bool {
		return distances[i].dist < distances[j].dist
	})

	primary := distances[0].area
	d1 := distances[0].dist

	if len(distances) == 1 {
		return BiomeBlend{Primary: primary, Secondary: primary, Weight: 0.0}
	}

	secondary := distances[1].area
	d2 := distances[1].dist

	var weight float64
	if d1 == 0 {
		weight = 0.0
	} else if d2 == 0 {
		// Should not happen since it's sorted, but just in case
		weight = 1.0
	} else {
		// Inverse distance weighting factor for the secondary area
		// Weight = (1/d2) / (1/d1 + 1/d2) = d1 / (d1 + d2)
		weight = d1 / (d1 + d2)
	}

	return BiomeBlend{
		Primary:   primary,
		Secondary: secondary,
		Weight:    weight,
	}
}
