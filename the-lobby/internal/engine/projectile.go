package engine

import (
	"sync"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

type Projectile struct {
	ID         string
	OwnerID    string
	InstanceID string // The live instance where the projectile is currently traveling
	X, Y, Z    float64
	VX, VY, VZ float64
	SpawnedAt  time.Time
}

type ProjectileManager struct {
	mu          sync.RWMutex
	projectiles map[string]*Projectile
	world       *world.Manager
}

func NewProjectileManager(w *world.Manager) *ProjectileManager {
	return &ProjectileManager{
		projectiles: make(map[string]*Projectile),
		world:       w,
	}
}

func (pm *ProjectileManager) Spawn(p *Projectile) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	p.SpawnedAt = time.Now()
	pm.projectiles[p.ID] = p
}

// Tick processes physics and cross-instance handoff for all active projectiles.
func (pm *ProjectileManager) Tick(dt float64) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	now := time.Now()
	for id, p := range pm.projectiles {
		rayStart := world.Vector3D{X: p.X, Y: p.Y, Z: p.Z}
		velocity := world.Vector3D{X: p.VX, Y: p.VY, Z: p.VZ}
		rayDir := velocity.Scale(dt)
		rayLength := rayDir.Mag()
		
		if rayLength > 0 {
			ray := world.Ray{
				Origin: rayStart,
				Dir:    rayDir.Normalize(),
				Length: rayLength,
			}

			// 1. Check SpiritGate intersections for Cross-Instance Handoff
			gate, _ := pm.world.Gates().QueryIntersections(p.InstanceID, ray)
			if gate != nil {
				// Handoff: The projectile travels through the portal!
				p.InstanceID = gate.TargetMapID 
				p.X = gate.TargetX
				p.Z = gate.TargetZ
				// Optionally: We could rotate the velocity vector if the exit portal faces a different direction.
				// For now, we preserve the original trajectory.
				
				// Note: the client would receive an event here to despawn in Map A and spawn in Map B.
				continue
			}
		}

		// 2. Advance physics
		p.X += p.VX * dt
		p.Y += p.VY * dt
		p.Z += p.VZ * dt

		// 3. TTL despawn
		if now.Sub(p.SpawnedAt) > 5*time.Second {
			delete(pm.projectiles, id)
		}
	}
}
