package protocol_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
)

func TestToBaseMapIDLegacy(t *testing.T) {
	if protocol.ToBaseMapID("STARTING_MEADOW_ch3") != "STARTING_MEADOW" {
		t.Fatal(protocol.ToBaseMapID("STARTING_MEADOW_ch3"))
	}
}
