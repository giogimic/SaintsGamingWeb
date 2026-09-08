package atlas

import (
	"math"
)

func hashSeed(seed interface{}) uint32 {
	switch v := seed.(type) {
	case uint32:
		return v
	case int:
		return uint32(v)
	case string:
		hash := uint32(2166136261)
		for i := 0; i < len(v); i++ {
			hash ^= uint32(v[i])
			hash *= 16777619
		}
		return hash
	default:
		return 1337
	}
}

type DeterministicRandom struct {
	state uint32
}

func NewDeterministicRandom(seed interface{}) *DeterministicRandom {
	return &DeterministicRandom{state: hashSeed(seed)}
}

func (r *DeterministicRandom) NextFloat() float64 {
	r.state += 0x6d2b79f5
	t := r.state
	t = (t ^ (t >> 15)) * (t | 1)
	t ^= t + (t^(t>>7))*(t|61)
	return float64((t^(t>>14))) / 4294967296.0
}

func (r *DeterministicRandom) NextInt(min, max int) int {
	return min + int(math.Floor(r.NextFloat()*float64(max-min+1)))
}

type NoiseSource struct {
	perm [512]uint8
}

func NewNoiseSource(seed interface{}) *NoiseSource {
	rng := NewDeterministicRandom(seed)
	var p [256]uint8
	for i := 0; i < 256; i++ {
		p[i] = uint8(i)
	}

	for i := 255; i > 0; i-- {
		j := rng.NextInt(0, i)
		p[i], p[j] = p[j], p[i]
	}

	ns := &NoiseSource{}
	for i := 0; i < 512; i++ {
		ns.perm[i] = p[i&255]
	}
	return ns
}

func fade(t float64) float64 {
	return t * t * t * (t*(t*6-15) + 10)
}

func lerp(t, a, b float64) float64 {
	return a + t*(b-a)
}

func grad2(hash uint8, x, y float64) float64 {
	h := hash & 7
	var u, v float64
	if h < 4 {
		u = x
	} else {
		u = y
	}
	if h < 4 {
		v = y
	} else {
		v = x
	}
	res := 0.0
	if (h & 1) == 0 {
		res += u
	} else {
		res -= u
	}
	if (h & 2) == 0 {
		res += v
	} else {
		res -= v
	}
	return res
}

func grad3(hash uint8, x, y, z float64) float64 {
	h := hash & 15
	var u, v float64
	if h < 8 {
		u = x
	} else {
		u = y
	}
	if h < 4 {
		v = y
	} else if h == 12 || h == 14 {
		v = x
	} else {
		v = z
	}
	res := 0.0
	if (h & 1) == 0 {
		res += u
	} else {
		res -= u
	}
	if (h & 2) == 0 {
		res += v
	} else {
		res -= v
	}
	return res
}

func (ns *NoiseSource) Sample2D(x, y float64) float64 {
	X := int(math.Floor(x)) & 255
	Y := int(math.Floor(y)) & 255

	xf := x - math.Floor(x)
	yf := y - math.Floor(y)

	u := fade(xf)
	v := fade(yf)

	aa := ns.perm[int(ns.perm[X])+Y]
	ab := ns.perm[int(ns.perm[X])+Y+1]
	ba := ns.perm[int(ns.perm[X+1])+Y]
	bb := ns.perm[int(ns.perm[X+1])+Y+1]

	x1 := lerp(u, grad2(aa, xf, yf), grad2(ba, xf-1, yf))
	x2 := lerp(u, grad2(ab, xf, yf-1), grad2(bb, xf-1, yf-1))

	return lerp(v, x1, x2)
}

func (ns *NoiseSource) Sample3D(x, y, z float64) float64 {
	X := int(math.Floor(x)) & 255
	Y := int(math.Floor(y)) & 255
	Z := int(math.Floor(z)) & 255

	xf := x - math.Floor(x)
	yf := y - math.Floor(y)
	zf := z - math.Floor(z)

	u := fade(xf)
	v := fade(yf)
	w := fade(zf)

	A := int(ns.perm[X]) + Y
	AA := int(ns.perm[A]) + Z
	AB := int(ns.perm[A+1]) + Z
	B := int(ns.perm[X+1]) + Y
	BA := int(ns.perm[B]) + Z
	BB := int(ns.perm[B+1]) + Z

	x1 := lerp(u, grad3(ns.perm[AA], xf, yf, zf), grad3(ns.perm[BA], xf-1, yf, zf))
	x2 := lerp(u, grad3(ns.perm[AB], xf, yf-1, zf), grad3(ns.perm[BB], xf-1, yf-1, zf))
	y1 := lerp(v, x1, x2)

	x3 := lerp(u, grad3(ns.perm[AA+1], xf, yf, zf-1), grad3(ns.perm[BA+1], xf-1, yf, zf-1))
	x4 := lerp(u, grad3(ns.perm[AB+1], xf, yf-1, zf-1), grad3(ns.perm[BB+1], xf-1, yf-1, zf-1))
	y2 := lerp(v, x3, x4)

	return lerp(w, y1, y2)
}
