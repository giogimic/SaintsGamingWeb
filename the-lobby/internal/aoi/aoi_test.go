package aoi_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/aoi"
)

func TestNeighborRooms(t *testing.T) {
	rooms := aoi.NeighborRooms("DEMO_ch1", 2, 3)
	if len(rooms) != 9 {
		t.Fatalf("len=%d", len(rooms))
	}
	want := aoi.RoomName("DEMO_ch1", 2, 3)
	found := false
	for _, r := range rooms {
		if r == want {
			found = true
		}
	}
	if !found {
		t.Fatal("center missing")
	}
}
