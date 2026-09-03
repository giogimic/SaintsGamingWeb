package engine

import (
	"sync"
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/config"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/player"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

type mockEmitter struct {
	mu     sync.Mutex
	events []emittedEvent
}

type emittedEvent struct {
	SocketID string
	Event    string
	Payload  any
}

func (m *mockEmitter) EmitToSocket(socketID, event string, payload any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, emittedEvent{SocketID: socketID, Event: event, Payload: payload})
}

func (m *mockEmitter) EmitToRoom(room, event string, payload any) {}
func (m *mockEmitter) JoinRoom(socketID, room string)             {}
func (m *mockEmitter) LeaveRoom(socketID, room string)            {}

func TestSolidVoxelCollisionRejection(t *testing.T) {
	wm := world.NewManager(50)
	pm := player.NewManager(16, nil)
	emitter := &mockEmitter{}

	mapID := "TEST_VOXEL_REALM"
	voxelWorld := world.BuildDemoVoxelWorld(32, 32)

	// Place an impassable solid obstacle voxel at (15, 16, 16) in world space
	// In the 2D plane: wz = height - 1 - y = 32 - 1 - 15 = 16
	// So moving to (x=15, y=15) checks (wx=15, wy=16, wz=16)
	solidWall := world.PackVoxel(99, world.ShapeFullCube, 0, 0, world.PhysicsSolidObstacle, world.LogicNone)
	voxelWorld.SetVoxel(15, 16, 16, solidWall)

	def := MapDefCompat(mapID, "Test Voxel Realm", 32, 32, voxelWorld)
	wm.RegisterDef(def)

	// Add player at (14, 15)
	p := pm.CreateWithCharacter("acc_1", "char_1", "sock_123", "Hero", "spr", mapID+"_ch1", mapID, 14, 15)

	cfg := config.Config{}
	eng := New(cfg, wm, pm, nil, emitter)

	// Test 1: Player attempts to move RIGHT into the solid voxel wall at (15, 15)
	dir := "right"
	in := protocol.PlayerInput{
		Type:      "MOVE",
		Direction: &dir,
		Sequence:  101,
	}

	eng.processInput(p.AccountID, in)

	// Verify player stayed at (14, 15)
	pAfter := pm.GetByAccount("acc_1")
	if pAfter.X != 14 || pAfter.Y != 15 {
		t.Fatalf("expected player to remain at (14, 15), but got (%.1f, %.1f)", pAfter.X, pAfter.Y)
	}

	// Verify position_correction event was emitted with reason: "blocked"
	emitter.mu.Lock()
	defer emitter.mu.Unlock()

	foundCorrection := false
	for _, ev := range emitter.events {
		if ev.Event == protocol.EvPositionCorrection {
			payload, ok := ev.Payload.(map[string]any)
			if !ok {
				continue
			}
			seqVal, _ := payload["seq"].(int64)
			if seqVal == 0 {
				if sInt, ok := payload["seq"].(int); ok {
					seqVal = int64(sInt)
				}
			}
			if payload["reason"] == "blocked" && seqVal == 101 {
				foundCorrection = true
				break
			}
		}
	}

	if !foundCorrection {
		t.Fatalf("expected position_correction with reason 'blocked' and seq 101, got %+v", emitter.events)
	}
}

func MapDefCompat(id, name string, w, h int, vox *world.VoxelWorld) *world.MapDef {
	return &world.MapDef{
		ID:          id,
		Name:        name,
		Width:       w,
		Height:      h,
		RegionClass: "authored",
		Voxel:       vox,
		SpawnX:      14,
		SpawnY:      15,
	}
}
