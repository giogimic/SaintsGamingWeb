package atlas

import "math"

// FieldSample represents a 3D coordinate for sampling.
type FieldSample struct {
	X float64
	Y float64
	Z float64
}

// WorldFieldDefinition holds metadata about a field.
type WorldFieldDefinition struct {
	ID         string
	Name       string
	Dimensions int
	Min        float64
	Max        float64
}

// IWorldField represents an evaluatable scalar field (like noise, temperature).
type IWorldField interface {
	Definition() WorldFieldDefinition
	Sample(position FieldSample) float64
}

// ConstantField returns a constant value.
type ConstantField struct {
	def WorldFieldDefinition
	val float64
}

func NewConstantField(id string, val float64) *ConstantField {
	return &ConstantField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "Constant",
			Dimensions: 2,
			Min:        val,
			Max:        val,
		},
		val: val,
	}
}
func (f *ConstantField) Definition() WorldFieldDefinition { return f.def }
func (f *ConstantField) Sample(pos FieldSample) float64   { return f.val }

// AddField adds two fields.
type AddField struct {
	def WorldFieldDefinition
	a   IWorldField
	b   IWorldField
}

func NewAddField(id string, a, b IWorldField) *AddField {
	dim := a.Definition().Dimensions
	if b.Definition().Dimensions > dim {
		dim = b.Definition().Dimensions
	}
	return &AddField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "Add",
			Dimensions: dim,
			Min:        a.Definition().Min + b.Definition().Min,
			Max:        a.Definition().Max + b.Definition().Max,
		},
		a: a,
		b: b,
	}
}
func (f *AddField) Definition() WorldFieldDefinition { return f.def }
func (f *AddField) Sample(pos FieldSample) float64   { return f.a.Sample(pos) + f.b.Sample(pos) }

// MultiplyField multiplies two fields.
type MultiplyField struct {
	def WorldFieldDefinition
	a   IWorldField
	b   IWorldField
}

func NewMultiplyField(id string, a, b IWorldField) *MultiplyField {
	dim := a.Definition().Dimensions
	if b.Definition().Dimensions > dim {
		dim = b.Definition().Dimensions
	}
	return &MultiplyField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "Multiply",
			Dimensions: dim,
			Min:        math.Inf(-1),
			Max:        math.Inf(1),
		},
		a: a,
		b: b,
	}
}
func (f *MultiplyField) Definition() WorldFieldDefinition { return f.def }
func (f *MultiplyField) Sample(pos FieldSample) float64   { return f.a.Sample(pos) * f.b.Sample(pos) }

// RemapField remaps the output of a field to a new range.
type RemapField struct {
	def     WorldFieldDefinition
	source  IWorldField
	fromMin float64
	fromMax float64
	toMin   float64
	toMax   float64
}

func NewRemapField(id string, source IWorldField, fromMin, fromMax, toMin, toMax float64) *RemapField {
	min := toMin
	max := toMax
	if toMax < toMin {
		min = toMax
		max = toMin
	}
	return &RemapField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "Remap",
			Dimensions: source.Definition().Dimensions,
			Min:        min,
			Max:        max,
		},
		source:  source,
		fromMin: fromMin,
		fromMax: fromMax,
		toMin:   toMin,
		toMax:   toMax,
	}
}
func (f *RemapField) Definition() WorldFieldDefinition { return f.def }
func (f *RemapField) Sample(pos FieldSample) float64 {
	val := f.source.Sample(pos)
	if f.fromMin == f.fromMax {
		return f.toMin
	}
	t := (val - f.fromMin) / (f.fromMax - f.fromMin)
	return f.toMin + t*(f.toMax-f.toMin)
}

// ClampField clamps a field.
type ClampField struct {
	def    WorldFieldDefinition
	source IWorldField
	min    float64
	max    float64
}

func NewClampField(id string, source IWorldField, min, max float64) *ClampField {
	return &ClampField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "Clamp",
			Dimensions: source.Definition().Dimensions,
			Min:        min,
			Max:        max,
		},
		source: source,
		min:    min,
		max:    max,
	}
}
func (f *ClampField) Definition() WorldFieldDefinition { return f.def }
func (f *ClampField) Sample(pos FieldSample) float64 {
	val := f.source.Sample(pos)
	return math.Max(f.min, math.Min(f.max, val))
}

// MaskField multiplies a source by a mask field.
type MaskField struct {
	def    WorldFieldDefinition
	source IWorldField
	mask   IWorldField
}

func NewMaskField(id string, source, mask IWorldField) *MaskField {
	dim := source.Definition().Dimensions
	if mask.Definition().Dimensions > dim {
		dim = mask.Definition().Dimensions
	}
	return &MaskField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "Mask",
			Dimensions: dim,
			Min:        source.Definition().Min,
			Max:        source.Definition().Max,
		},
		source: source,
		mask:   mask,
	}
}
func (f *MaskField) Definition() WorldFieldDefinition { return f.def }
func (f *MaskField) Sample(pos FieldSample) float64   { return f.source.Sample(pos) * f.mask.Sample(pos) }

// LerpField interpolates between two fields based on an interpolator field.
type LerpField struct {
	def    WorldFieldDefinition
	a      IWorldField
	b      IWorldField
	interp IWorldField
}

func NewLerpField(id string, a, b, interp IWorldField) *LerpField {
	dim := a.Definition().Dimensions
	if b.Definition().Dimensions > dim {
		dim = b.Definition().Dimensions
	}
	if interp.Definition().Dimensions > dim {
		dim = interp.Definition().Dimensions
	}
	return &LerpField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "Lerp",
			Dimensions: dim,
			Min:        math.Min(a.Definition().Min, b.Definition().Min),
			Max:        math.Max(a.Definition().Max, b.Definition().Max),
		},
		a:      a,
		b:      b,
		interp: interp,
	}
}
func (f *LerpField) Definition() WorldFieldDefinition { return f.def }
func (f *LerpField) Sample(pos FieldSample) float64 {
	a := f.a.Sample(pos)
	b := f.b.Sample(pos)
	t := f.interp.Sample(pos)
	return a + t*(b-a)
}

// DomainWarpField offsets the sampling position using warp fields.
type DomainWarpField struct {
	def      WorldFieldDefinition
	source   IWorldField
	warpX    IWorldField
	warpY    IWorldField
	warpZ    IWorldField
	strength float64
}

func NewDomainWarpField(id string, source, warpX, warpY, warpZ IWorldField, strength float64) *DomainWarpField {
	return &DomainWarpField{
		def: WorldFieldDefinition{
			ID:         id,
			Name:       "DomainWarp",
			Dimensions: source.Definition().Dimensions,
			Min:        source.Definition().Min,
			Max:        source.Definition().Max,
		},
		source:   source,
		warpX:    warpX,
		warpY:    warpY,
		warpZ:    warpZ,
		strength: strength,
	}
}
func (f *DomainWarpField) Definition() WorldFieldDefinition { return f.def }
func (f *DomainWarpField) Sample(pos FieldSample) float64 {
	wx := f.warpX.Sample(pos) * f.strength
	wy := f.warpY.Sample(pos) * f.strength
	wz := 0.0
	if f.warpZ != nil {
		wz = f.warpZ.Sample(pos) * f.strength
	}

	warped := FieldSample{
		X: pos.X + wx,
		Y: pos.Y + wy,
		Z: pos.Z + wz,
	}
	return f.source.Sample(warped)
}

// FractalNoiseField uses Fractional Brownian Motion on a NoiseSource.
type FractalNoiseField struct {
	def         WorldFieldDefinition
	source      *NoiseSource
	octaves     int
	persistence float64
	lacunarity  float64
	scale       float64
}

type FractalNoiseConfig struct {
	ID          string
	Name        string
	Dimensions  int
	Source      *NoiseSource
	Octaves     int
	Persistence float64
	Lacunarity  float64
	Scale       float64
}

func NewFractalNoiseField(cfg FractalNoiseConfig) *FractalNoiseField {
	octaves := cfg.Octaves
	if octaves <= 0 {
		octaves = 3
	}
	persistence := cfg.Persistence
	if persistence == 0 {
		persistence = 0.5
	}
	lacunarity := cfg.Lacunarity
	if lacunarity == 0 {
		lacunarity = 2.0
	}
	scale := cfg.Scale
	if scale == 0 {
		scale = 1.0
	}

	maxAmp := (1.0 - math.Pow(persistence, float64(octaves))) / (1.0 - persistence)

	return &FractalNoiseField{
		def: WorldFieldDefinition{
			ID:         cfg.ID,
			Name:       cfg.Name,
			Dimensions: cfg.Dimensions,
			Min:        -maxAmp,
			Max:        maxAmp,
		},
		source:      cfg.Source,
		octaves:     octaves,
		persistence: persistence,
		lacunarity:  lacunarity,
		scale:       scale,
	}
}
func (f *FractalNoiseField) Definition() WorldFieldDefinition { return f.def }
func (f *FractalNoiseField) Sample(pos FieldSample) float64 {
	total := 0.0
	frequency := f.scale
	amplitude := 1.0

	for i := 0; i < f.octaves; i++ {
		noiseVal := 0.0
		if f.def.Dimensions == 2 {
			noiseVal = f.source.Sample2D(pos.X*frequency, pos.Z*frequency)
		} else {
			noiseVal = f.source.Sample3D(pos.X*frequency, pos.Y*frequency, pos.Z*frequency)
		}

		total += noiseVal * amplitude
		amplitude *= f.persistence
		frequency *= f.lacunarity
	}
	return total
}

// AtlasWorldContext holds the base fields for a world.
type AtlasWorldContext struct {
	Seed            interface{}
	Elevation       IWorldField
	Temperature     IWorldField
	Moisture        IWorldField
	Continentalness IWorldField
	Erosion         IWorldField
	Ruggedness      IWorldField
	Geology         IWorldField
}
