package inventory

import (
	"database/sql"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/persist"
)

// Item stack in a player's bag.
type Item struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Qty  int    `json:"qty"`
}

// Manager is an inventory store with optional SQLite persistence.
type Manager struct {
	mu      sync.RWMutex
	bags    map[string]map[string]*Item // account -> itemId -> item
	credits map[string]int
	store   *persist.Store
}

func NewManager(db *sql.DB) *Manager {
	var store *persist.Store
	if db != nil {
		store = &persist.Store{DB: db}
	}
	return &Manager{
		bags:    make(map[string]map[string]*Item),
		credits: make(map[string]int),
		store:   store,
	}
}

func (m *Manager) flush(accountID string) {
	if m.store == nil {
		return
	}
	bag := m.bags[accountID]
	items := make([]persist.Item, 0, len(bag))
	for _, it := range bag {
		items = append(items, persist.Item{ID: it.ID, Name: it.Name, Qty: it.Qty})
	}
	m.store.SaveInventory(accountID, items, m.credits[accountID])
}

func (m *Manager) Ensure(accountID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.bags[accountID]; ok {
		return
	}
	if m.store != nil {
		if items, credits, ok := m.store.LoadInventory(accountID); ok {
			bag := make(map[string]*Item, len(items))
			for _, it := range items {
				bag[it.ID] = &Item{ID: it.ID, Name: it.Name, Qty: it.Qty}
			}
			m.bags[accountID] = bag
			m.credits[accountID] = credits
			return
		}
	}
	m.bags[accountID] = map[string]*Item{
		"potion": {ID: "potion", Name: "Potion", Qty: 3},
	}
	m.credits[accountID] = 100
	m.flush(accountID)
}

func (m *Manager) List(accountID string) []Item {
	m.Ensure(accountID)
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]Item, 0, len(m.bags[accountID]))
	for _, it := range m.bags[accountID] {
		out = append(out, *it)
	}
	return out
}

func (m *Manager) Credits(accountID string) int {
	m.Ensure(accountID)
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.credits[accountID]
}

func (m *Manager) AddCredits(accountID string, delta int) int {
	m.Ensure(accountID)
	m.mu.Lock()
	defer m.mu.Unlock()
	m.credits[accountID] += delta
	if m.credits[accountID] < 0 {
		m.credits[accountID] = 0
	}
	m.flush(accountID)
	return m.credits[accountID]
}

func (m *Manager) AddItem(accountID, id, name string, qty int) []Item {
	m.Ensure(accountID)
	m.mu.Lock()
	defer m.mu.Unlock()
	bag := m.bags[accountID]
	if it, ok := bag[id]; ok {
		it.Qty += qty
	} else {
		bag[id] = &Item{ID: id, Name: name, Qty: qty}
	}
	out := make([]Item, 0, len(bag))
	for _, it := range bag {
		out = append(out, *it)
	}
	m.flush(accountID)
	return out
}

func (m *Manager) Consume(accountID, id string, qty int) bool {
	m.Ensure(accountID)
	m.mu.Lock()
	defer m.mu.Unlock()
	it := m.bags[accountID][id]
	if it == nil || it.Qty < qty {
		return false
	}
	it.Qty -= qty
	if it.Qty <= 0 {
		delete(m.bags[accountID], id)
	}
	m.flush(accountID)
	return true
}

// Buy spends credits and adds an item.
func (m *Manager) Buy(accountID, id, name string, price, qty int) (ok bool, credits int, items []Item) {
	m.Ensure(accountID)
	m.mu.Lock()
	defer m.mu.Unlock()
	cost := price * qty
	if m.credits[accountID] < cost {
		return false, m.credits[accountID], nil
	}
	m.credits[accountID] -= cost
	bag := m.bags[accountID]
	if it, ok := bag[id]; ok {
		it.Qty += qty
	} else {
		bag[id] = &Item{ID: id, Name: name, Qty: qty}
	}
	out := make([]Item, 0, len(bag))
	for _, it := range bag {
		out = append(out, *it)
	}
	m.flush(accountID)
	return true, m.credits[accountID], out
}

// Sell removes items and grants credits.
func (m *Manager) Sell(accountID, id string, price, qty int) (ok bool, credits int, items []Item) {
	m.Ensure(accountID)
	m.mu.Lock()
	defer m.mu.Unlock()
	it := m.bags[accountID][id]
	if it == nil || it.Qty < qty {
		return false, m.credits[accountID], nil
	}
	it.Qty -= qty
	if it.Qty <= 0 {
		delete(m.bags[accountID], id)
	}
	m.credits[accountID] += price * qty
	out := make([]Item, 0, len(m.bags[accountID]))
	for _, x := range m.bags[accountID] {
		out = append(out, *x)
	}
	m.flush(accountID)
	return true, m.credits[accountID], out
}
