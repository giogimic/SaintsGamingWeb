package protocol_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
)

func TestToBaseMapIDLegacy(t *testing.T) {
	if protocol.ToBaseMapID("DEMO_SANDBOX_ch3") != "DEMO_SANDBOX" {
		t.Fatal(protocol.ToBaseMapID("DEMO_SANDBOX_ch3"))
	}
}
