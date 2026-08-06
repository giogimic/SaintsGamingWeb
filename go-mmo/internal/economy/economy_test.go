package economy_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/economy"
)

func TestGTC(t *testing.T) {
	m := economy.NewManager()
	l, err := m.Create("seller", "loot_scrap", "Scrap", 2, 20)
	if err != nil {
		t.Fatal(err)
	}
	bought, err := m.Purchase(l.ID, "buyer")
	if err != nil || bought.Qty != 2 {
		t.Fatalf("%v %+v", err, bought)
	}
	if _, err := m.Purchase(l.ID, "buyer"); err == nil {
		t.Fatal("expected missing")
	}
}
