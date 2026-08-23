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
	emit     Emitter

	mu      sync.Mutex
	running bool
	stopCh  chan struct{}
	wg      sync.WaitGroup
}

func New(cfg config.Config, wm *world.Manager, pm *player.Manager, cm *creature.Manager, emit Emitter) *Engine {
	return &Engine{
		cfg:       cfg,
		world:     wm,
		players:   pm,
		creatures: cm,
		emit:      emit,
		stopCh:    make(chan struct{}),
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
}

func (e *Engine) processInput(accountID string, in protocol.PlayerInput) {
	p := e.players.GetByAccount(accountID)
	if p == nil {
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

func (e *Engine) netTick() {
	dirty := e.players.DrainDirty()
	for _, p := range dirty {
		payload := map[string]any{
			"socketId":  p.SocketID,
			"entityId":  p.EntityID,
			"x":         p.X,
			"y":         p.Y,
			"direction": p.Direction,
			"isMoving":  p.IsMoving,
			"name":      p.Name,
			"spriteId":  p.SpriteID,
		}
		// Broadcast to AOI 3x3 neighbor rooms and map instance room.
		e.emit.EmitToRoom(aoiBroadcastKey(p.MapID, p.ZoneX, p.ZoneY), protocol.EvPlayerMoved, payload)
		e.emit.EmitToRoom(p.MapID, protocol.EvPlayerMoved, payload)
	}
	if e.creatures != nil {
		for _, c := range e.creatures.DrainDirty() {
			e.emit.EmitToRoom(c.MapID, protocol.EvCreatureMoved, c)
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
