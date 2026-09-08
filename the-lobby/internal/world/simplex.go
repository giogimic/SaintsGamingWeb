package world

import (
	"math"
)

var F2 = 0.5 * (math.Sqrt(3.0) - 1.0)
var G2 = (3.0 - math.Sqrt(3.0)) / 6.0

var GRAD3 = [8][2]float64{
	{1, 1}, {-1, 1}, {1, -1}, {-1, -1},
	{1, 0}, {-1, 0}, {0, 1}, {0, -1},
}

type SimplexNoise2D struct {
	perm [512]uint8
}

func NewSimplexNoise2D(seed uint32) *SimplexNoise2D {
	s := &SimplexNoise2D{}
	s.Reseed(seed)
	return s
}

func (s *SimplexNoise2D) Reseed(seed uint32) {
	var p [256]uint8
	for i := 0; i < 256; i++ {
		p[i] = uint8(i)
	}

	// Seeded LCG shuffle
	seedState := seed ^ 0xdeadbeef
	nextRandom := func() float64 {
		seedState = (1664525 * seedState) + 1013904223
		return float64(seedState) / 4294967296.0
	}

	for i := 255; i > 0; i-- {
		j := int(math.Floor(nextRandom() * float64(i+1)))
		temp := p[i]
		p[i] = p[j]
		p[j] = temp
	}

	for i := 0; i < 512; i++ {
		s.perm[i] = p[i&255]
	}
}

// Noise2D generates continuous 2D Simplex noise in range [-1.0 .. 1.0].
func (s *SimplexNoise2D) Noise2D(xin, yin float64) float64 {
	var n0, n1, n2 float64

	// Skew the input space to determine which simplex cell we're in
	skew := (xin + yin) * F2
	i := int(math.Floor(xin + skew))
	j := int(math.Floor(yin + skew))

	t := float64(i+j) * G2
	X0 := float64(i) - t
	Y0 := float64(j) - t
	x0 := xin - X0
	y0 := yin - Y0

	// Determine simplex triangle coordinates
	var i1, j1 int
	if x0 > y0 {
		i1 = 1
		j1 = 0
	} else {
		i1 = 0
		j1 = 1
	}

	x1 := x0 - float64(i1) + G2
	y1 := y0 - float64(j1) + G2
	x2 := x0 - 1.0 + 2.0*G2
	y2 := y0 - 1.0 + 2.0*G2

	ii := i & 255
	jj := j & 255

	// Contribution from the three corners
	t0 := 0.5 - x0*x0 - y0*y0
	if t0 >= 0 {
		gi0 := s.perm[ii+int(s.perm[jj])] % 8
		t0 *= t0
		n0 = t0 * t0 * (GRAD3[gi0][0]*x0 + GRAD3[gi0][1]*y0)
	}

	t1 := 0.5 - x1*x1 - y1*y1
	if t1 >= 0 {
		gi1 := s.perm[ii+i1+int(s.perm[jj+j1])] % 8
		t1 *= t1
		n1 = t1 * t1 * (GRAD3[gi1][0]*x1 + GRAD3[gi1][1]*y1)
	}

	t2 := 0.5 - x2*x2 - y2*y2
	if t2 >= 0 {
		gi2 := s.perm[ii+1+int(s.perm[jj+1])] % 8
		t2 *= t2
		n2 = t2 * t2 * (GRAD3[gi2][0]*x2 + GRAD3[gi2][1]*y2)
	}

	// Scale to range [-1.0 .. 1.0]
	return 70.0 * (n0 + n1 + n2)
}

// FBm evaluates fractal Brownian motion (fBm) over configured octaves.
func (s *SimplexNoise2D) FBm(x, z float64, octaves int, frequency, persistence, lacunarity, amplitude float64) float64 {
	total := 0.0
	currentAmp := 1.0
	currentFreq := frequency
	maxAmp := 0.0

	for o := 0; o < octaves; o++ {
		total += s.Noise2D(x*currentFreq, z*currentFreq) * currentAmp
		maxAmp += currentAmp
		currentAmp *= persistence
		currentFreq *= lacunarity
	}

	normalized := 0.0
	if maxAmp > 0 {
		normalized = total / maxAmp
	}
	return normalized * amplitude
}
