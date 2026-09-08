package world

import (
	"math"
	"sync"
)

// SpiritGate defines a portal plane in the world.
type SpiritGate struct {
	ID            string
	MapID         string // The map where the gate is located
	TargetMapID   string // The destination map
	TargetX       float64
	TargetY       float64
	TargetZ       float64
	PlaneNormal   Vector3D
	PlaneDistance float64 // Distance from origin to the plane (D in Ax + By + Cz + D = 0)
}

// Ray represents a directed line segment
type Ray struct {
	Origin Vector3D
	Dir    Vector3D // Normalized direction vector
	Length float64
}

// Dot computes the dot product of two vectors
func (v Vector3D) Dot(other Vector3D) float64 {
	return v.X*other.X + v.Y*other.Y + v.Z*other.Z
}

// Sub subtracts another vector
func (v Vector3D) Sub(other Vector3D) Vector3D {
	return Vector3D{X: v.X - other.X, Y: v.Y - other.Y, Z: v.Z - other.Z}
}

// Add adds another vector
func (v Vector3D) Add(other Vector3D) Vector3D {
	return Vector3D{X: v.X + other.X, Y: v.Y + other.Y, Z: v.Z + other.Z}
}

// Scale multiplies the vector by a scalar
func (v Vector3D) Scale(s float64) Vector3D {
	return Vector3D{X: v.X * s, Y: v.Y * s, Z: v.Z * s}
}

// Mag returns the magnitude (length) of the vector
func (v Vector3D) Mag() float64 {
	return math.Sqrt(v.X*v.X + v.Y*v.Y + v.Z*v.Z)
}

// Normalize returns the unit vector
func (v Vector3D) Normalize() Vector3D {
	mag := math.Sqrt(v.X*v.X + v.Y*v.Y + v.Z*v.Z)
	if mag == 0 {
		return v
	}
	return v.Scale(1.0 / mag)
}

// SpiritGateRegistry tracks active gates for cross-instance projectile handoffs.
type SpiritGateRegistry struct {
	mu    sync.RWMutex
	gates map[string]*SpiritGate
}

func NewSpiritGateRegistry() *SpiritGateRegistry {
	return &SpiritGateRegistry{
		gates: make(map[string]*SpiritGate),
	}
}

// Register adds or updates a gate dynamically
func (r *SpiritGateRegistry) Register(gate *SpiritGate) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.gates[gate.ID] = gate
}

// Unregister removes a gate by ID
func (r *SpiritGateRegistry) Unregister(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.gates, id)
}

// QueryIntersections checks if a ray intersects any gate in a given map.
// Returns the intersected gate, and the intersection point.
func (r *SpiritGateRegistry) QueryIntersections(mapID string, ray Ray) (*SpiritGate, *Vector3D) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var closestGate *SpiritGate
	var closestT float64 = math.MaxFloat64
	var closestPoint Vector3D

	for _, g := range r.gates {
		if g.MapID != mapID {
			continue
		}
		
		// Denominator: Normal dot Dir
		denom := g.PlaneNormal.Dot(ray.Dir)
		if math.Abs(denom) < 1e-6 {
			continue // Parallel to plane
		}

		// Calculate intersection distance t
		// Plane eq: N dot (P) + D = 0 => N dot (Origin + t*Dir) + D = 0 => t = -(N dot Origin + D) / (N dot Dir)
		t := -(g.PlaneNormal.Dot(ray.Origin) + g.PlaneDistance) / denom

		// Check if intersection is in front of the ray and within its length
		if t >= 0 && t <= ray.Length && t < closestT {
			closestT = t
			closestGate = g
			closestPoint = ray.Origin.Add(ray.Dir.Scale(t))
		}
	}

	if closestGate != nil {
		return closestGate, &closestPoint
	}
	return nil, nil
}
