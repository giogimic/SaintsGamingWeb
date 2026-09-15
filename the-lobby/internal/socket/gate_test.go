package socket

import (
	"encoding/json"
	"testing"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/config"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/engine"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/player"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

func TestGateTransitionSpoofing(t *testing.T) {
	cfg := config.Config{SimTPS: 20, NetTPS: 10}
	wm := world.NewManager(50)
	pm := player.NewManager(16, nil)
	cm := creature.NewManager()
	em := newMockEmitter()

	eng := engine.New(cfg, wm, pm, cm, em)
	h := NewHub(cfg, eng, Deps{})

	manifestStr := `{
		"version": "v1.0.1",
		"maps": [
			{"id": "mapA", "name": "Map A", "mapType": "TILE", "version": 1},
			{"id": "mapB", "name": "Map B", "mapType": "TILE", "version": 1}
		],
		"connections": [
			{
				"connectionId": "conn_1",
				"sourceMapId": "mapA",
				"sourceGateId": "gate1",
				"type": "internal",
				"targetMapReleaseId": "mapB",
				"targetEntryPointId": "gate2"
			}
		]
	}`

	var manifest world.ReleaseManifest
	json.Unmarshal([]byte(manifestStr), &manifest)
	wm.ApplyReleaseMaps(&manifest)

	// Add mock gates to the definitions so we can transition
	defA, _ := wm.GetDef("mapA")
	defB, _ := wm.GetDef("mapB")
	defA.Gates = []world.GateDef{{ID: "gate1", X: 1, Y: 1}}
	defB.Gates = []world.GateDef{{ID: "gate2", X: 5, Y: 5}}

	// 2. Setup Player in mapA
	p := pm.CreateWithCharacter("acc1", "char1", "sock1", "Bob", "sprite", "instA", "mapA", 0, 0, 0)
	
	// Test Spoofing: player in mapA requests connection that doesn't exist
	h.handlePortalDial(nil, "acc1", "invalid_conn")
	
	// Ensure player didn't move
	if p.BaseMapID != "mapA" {
		t.Fatalf("Player moved after spoofed dial! BaseMapID=%s", p.BaseMapID)
	}

	// Test Valid Dial, but missing entry point on mapB
	defB.Gates = []world.GateDef{} // Remove entry point
	h.TransitionPlayer(p, "sock1", "mapB", "gate2")
	if p.BaseMapID != "mapA" {
		t.Fatalf("Player transitioned despite missing entry point! BaseMapID=%s", p.BaseMapID)
	}

	// Test Valid Dial with everything correct
	defB.Gates = []world.GateDef{{ID: "gate2", X: 10, Y: 10}}
	err := h.TransitionPlayer(p, "sock1", "mapB", "gate2")
	if err != nil {
		t.Fatalf("Valid transition failed: %v", err)
	}

	if p.BaseMapID != "mapB" {
		t.Fatalf("Player did not move to mapB. BaseMapID=%s", p.BaseMapID)
	}
	if p.X != 10 {
		t.Fatalf("Player X should be 10, got %f", p.X)
	}
}
