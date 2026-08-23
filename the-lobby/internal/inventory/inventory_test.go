package inventory_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/inventory"
)

func TestBuySell(t *testing.T) {
	m := inventory.NewManager(nil)
	ok, credits, items := m.Buy("a1", "potion", "Potion", 25, 1)
	if !ok || credits != 75 {
		t.Fatalf("buy ok=%v credits=%d items=%v", ok, credits, items)
	}
	ok, credits, _ = m.Sell("a1", "potion", 10, 1)
	if !ok || credits != 85 {
		t.Fatalf("sell credits=%d", credits)
	}
}
