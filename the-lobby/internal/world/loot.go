package world

import (
	"fmt"
	"sync"
)

// LootManager holds ground loot per instance.
type LootManager struct {
	mu    sync.RWMutex
	byMap map[string]map[string]*LootDrop
	seq   int64
}

func NewLootManager() *LootManager {
	return &LootManager{byMap: make(map[string]map[string]*LootDrop)}
}

func (l *LootManager) Drop(instanceID, itemID, name string, qty int, x, y float64) *LootDrop {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.seq++
	d := &LootDrop{
		ID: fmt.Sprintf("loot_%d", l.seq), ItemID: itemID, Name: name,
		Qty: qty, X: x, Y: y, MapID: instanceID,
	}
	bag, ok := l.byMap[instanceID]
	if !ok {
		bag = make(map[string]*LootDrop)
		l.byMap[instanceID] = bag
	}
	bag[d.ID] = d
	return d
}

func (l *LootManager) Pickup(instanceID, lootID string) (*LootDrop, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	bag := l.byMap[instanceID]
	if bag == nil {
		return nil, false
	}
	d, ok := bag[lootID]
	if !ok {
		return nil, false
	}
	delete(bag, lootID)
	return d, true
}

func (l *LootManager) List(instanceID string) []LootDrop {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make([]LootDrop, 0)
	for _, d := range l.byMap[instanceID] {
		out = append(out, *d)
	}
	return out
}
