package engine

import (
	"log"
	"sync"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/config"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/player"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

// Emitter fans events out to sockets (implemented by socket.Hub).
type Emitter interface {
	EmitToSocket(socketID, event string, payload any)
	EmitToRoom(room, event string, payload any)
	JoinRoom(socketID, room string)
	LeaveRoom(socketID, room string)
}

// Engine runs sim + net ticks.
type Engine struct {
	cfg      config.Config
	world    *world.Manager
	players  *player.Manager
	creatures *creature.Manager
	projectiles *ProjectileManager
	emit     Emitter

	mu      sync.Mutex
	running bool
	stopCh  chan struct{}
	wg      sync.WaitGroup
}

func New(cfg config.Config, wm *world.Manager, pm *player.Manager, cm *creature.Manager, emit Emitter) *Engine {
	return &Engine{
		cfg:         cfg,
		world:       wm,
		players:     pm,
		creatures:   cm,
		projectiles: NewProjectileManager(wm),
		emit:        emit,
		stopCh:      make(chan struct{}),
	}
}

func (e *Engine) World() *world.Manager     { return e.world }
func (e *Engine) Players() *player.Manager  { return e.players }
func (e *Engine) Creatures() *creature.Manager { return e.creatures }

func (e *Engine) Start() {
	e.mu.Lock()
	if e.running {
		e.mu.Unlock()
		return
	}
	e.running = true
	e.stopCh = make(chan struct{})
	e.mu.Unlock()

	simEvery := time.Second / time.Duration(e.cfg.SimTPS)
	netEvery := time.Second / time.Duration(e.cfg.NetTPS)
	if simEvery <= 0 {
		simEvery = 50 * time.Millisecond
	}
	if netEvery <= 0 {
		netEvery = 100 * time.Millisecond
	}

	e.wg.Add(2)
	go e.loop("sim", simEvery, e.simTick)
	go e.loop("net", netEvery, e.netTick)
	log.Printf("[engine] started sim=%dHz net=%dHz", e.cfg.SimTPS, e.cfg.NetTPS)
}

func (e *Engine) Stop() {
	e.mu.Lock()
	if !e.running {
		e.mu.Unlock()
		return
	}
	e.running = false
	close(e.stopCh)
	e.mu.Unlock()
	e.wg.Wait()
	log.Printf("[engine] stopped")
}

func (e *Engine) loop(name string, every time.Duration, fn func()) {
	defer e.wg.Done()
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-e.stopCh:
			return
		case <-t.C:
			fn()
		}
	}
}

func (e *Engine) simTick() {
	inputs := e.players.TakeInputs()
	for accountID, in := range inputs {
		e.processInput(accountID, in)
	}
	if e.creatures != nil {
		e.creatures.Tick()
	}

	dt := 1.0 / float64(e.cfg.SimTPS)
	if e.cfg.SimTPS == 0 {
		dt = 1.0 / 20.0
	}
	e.projectiles.Tick(dt)

	// Process Active Voxel Queue
	now := time.Now().UnixMilli()
	scheduled := e.world.PopScheduledVoxels(now)
	if len(scheduled) > 0 {
		for _, v := range scheduled {
			// Example placeholder for dynamic voxel logic (e.g. crop growth, flowing water)
			// A full physics check would run here, and if the voxel mutated, broadcast to AOI.
			_ = v // prevent unused variable warning
		}
	}
}

func (e *Engine) processInput(accountID string, in protocol.PlayerInput) {
	p := e.players.GetByAccount(accountID)
	if p == nil {
		return
	}
	if in.Type == "MOVE_3D" {
		e.processMove3DInput(accountID, in)
		return
	}
	if in.Type != "MOVE" || in.Direction == nil {
		return
	}
	dir := *in.Direction
	dx, dy := 0.0, 0.0
	switch dir {
	case "up":
		dy = -1
	case "down":
		dy = 1
	case "left":
		dx = -1
	case "right":
		dx = 1
	default:
		return
	}
	if time.Since(p.LastMoveAt) < player.MoveCooldownMS*time.Millisecond {
		e.emit.EmitToSocket(p.SocketID, protocol.EvPositionCorrection, map[string]any{
			"seq": in.Sequence, "x": p.X, "y": p.Y, "direction": p.Direction, "reason": "cooldown",
		})
		return
	}
	nx, ny := p.X+dx, p.Y+dy
	if !e.world.IsWalkable(p.BaseMapID, int(nx), int(ny)) {
		e.emit.EmitToSocket(p.SocketID, protocol.EvPositionCorrection, map[string]any{
			"seq": in.Sequence, "x": p.X, "y": p.Y, "direction": p.Direction, "reason": "blocked",
		})
		return
	}
	updated, ok := e.players.ApplyMove(accountID, nx, ny, dir, in.Sequence)
	if !ok || updated == nil {
		e.emit.EmitToSocket(p.SocketID, protocol.EvPositionCorrection, map[string]any{
			"seq": in.Sequence, "x": p.X, "y": p.Y, "direction": p.Direction, "reason": "occupied",
		})
		return
	}
	e.emit.EmitToSocket(updated.SocketID, protocol.EvMoveAck, map[string]any{
		"seq": in.Sequence, "x": updated.X, "y": updated.Y, "direction": updated.Direction,
	})
}

func (e *Engine) processMove3DInput(accountID string, in protocol.PlayerInput) {
	p := e.players.GetByAccount(accountID)
	if p == nil {
		return
	}
	if in.X == nil || in.Y == nil || in.Z == nil || in.VX == nil || in.VY == nil || in.VZ == nil {
		return
	}

	clientX, clientY, clientZ := *in.X, *in.Y, *in.Z
	clientVX, clientVY, clientVZ := *in.VX, *in.VY, *in.VZ

	now := time.Now()
	dt := now.Sub(p.LastMoveAt).Seconds()
	if dt > 1.0 {
		dt = 1.0 // cap dt to prevent massive jumps
	}

	startPos := world.Vector3D{X: p.X, Y: p.Y, Z: p.Z}
	velocity := world.Vector3D{X: clientVX, Y: clientVY, Z: clientVZ}

	// standard human dimensions
	width, height, depth := 0.6, 1.8, 0.6
	stepHeight := 0.5

	mapDef, ok := e.world.GetDef(p.BaseMapID)
	if !ok || mapDef.Voxel == nil {
		// Fallback to basic movement if no voxel world
		e.players.ApplyMove3D(accountID, clientX, clientY, clientZ, clientVX, clientVY, clientVZ, in.Sequence)
		return
	}

	result := mapDef.Voxel.ResolveSweptAABB(startPos, velocity, dt, width, height, depth, stepHeight)

	// Calculate divergence
	distSq := (clientX-result.Position.X)*(clientX-result.Position.X) +
		(clientY-result.Position.Y)*(clientY-result.Position.Y) +
		(clientZ-result.Position.Z)*(clientZ-result.Position.Z)

	if distSq > 4.0 {
		// Egregious divergence, rubber-band to server position
		updated, ok := e.players.ApplyMove3D(accountID, result.Position.X, result.Position.Y, result.Position.Z, clientVX, clientVY, clientVZ, in.Sequence)
		if ok && updated != nil {
			e.emit.EmitToSocket(p.SocketID, protocol.EvPositionCorrection, map[string]any{
				"seq": in.Sequence, "x": result.Position.X, "y": result.Position.Y, "z": result.Position.Z, "reason": "desync",
			})
		}
	} else {
		// Trust client for UX
		e.players.ApplyMove3D(accountID, clientX, clientY, clientZ, clientVX, clientVY, clientVZ, in.Sequence)
	}

	// Just-In-Time Fractal Chunk Generation Check
	if e.world.Jit != nil {
		cx := int(clientX / 32)
		if clientX < 0 && int(clientX)%32 != 0 {
			cx--
		}
		cz := int(clientZ / 32)
		if clientZ < 0 && int(clientZ)%32 != 0 {
			cz--
		}
		
		// If player is hitting the boundary or close to it, generate adjacent chunks
		// Sweep a 3x3 around the player's current chunk
		for dx := -1; dx <= 1; dx++ {
			for dz := -1; dz <= 1; dz++ {
				ncx := cx + dx
				ncz := cz + dz
				// We only care about base Y level (cy=0) for ground checks
				ckey := world.FormatChunkKey(ncx, 0, ncz)
				mapDef.Voxel.Mu().RLock()
				_, exists := mapDef.Voxel.Chunks[ckey]
				mapDef.Voxel.Mu().RUnlock()
				if !exists {
					e.world.Jit.RequestChunk(p.BaseMapID, ncx, ncz)
				}
			}
		}
	}
}

func (e *Engine) netTick() {
	dirty := e.players.DrainDirty()
	for _, p := range dirty {
		payload := map[string]any{
			"socketId":  p.SocketID,
			"entityId":  p.EntityID,
			"x":         p.X,
			"y":         p.Y,
			"z":         p.Z,
			"vx":        p.VX,
			"vy":        p.VY,
			"vz":        p.VZ,
			"direction": p.Direction,
			"isMoving":  p.IsMoving,
			"name":      p.Name,
			"spriteId":  p.SpriteID,
		}
		// Broadcast strictly to spatial AOI 5x5 neighbor rooms (2-sector radius) to eliminate redundant global packet overhead
		e.emit.EmitToRoom(aoiBroadcastKey(p.MapID, p.ZoneX, p.ZoneY), protocol.EvPlayerMoved, payload)
	}

	if e.creatures != nil {
		for _, c := range e.creatures.DrainDirty() {
			zx, zy := player.ZoneOf(c.X, c.Y, e.cfg.AOIZoneSize)
			e.emit.EmitToRoom(aoiBroadcastKey(c.MapID, zx, zy), protocol.EvCreatureMoved, c)
		}
	}
}

// aoiBroadcastKey is a special room id the Hub expands to 3x3 neighbors.
func aoiBroadcastKey(instanceID string, zx, zy int) string {
	return "aoi-broadcast:" + instanceID + ":" + itoa(zx) + ":" + itoa(zy)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
