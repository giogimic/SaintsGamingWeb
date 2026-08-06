package protocol_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
)

// Contract: client event names must stay stable across TS ↔ Go hubs.
func TestCoreEventNamesStable(t *testing.T) {
	want := map[string]string{
		"join_map":         protocol.EvJoinMap,
		"input":            protocol.EvInput,
		"admin_save_map":   protocol.EvAdminSaveMap,
		"admin_reload_map": protocol.EvAdminReloadMap,
		"map_joined":       protocol.EvMapJoined,
		"map_reloaded":     protocol.EvMapReloaded,
		"inventory_sync":   protocol.EvInventorySync,
	}
	for name, got := range want {
		if got != name {
			t.Fatalf("%s: got %q", name, got)
		}
	}
}
