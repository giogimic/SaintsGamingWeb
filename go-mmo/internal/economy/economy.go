package economy

import (
	"fmt"
	"sync"
	"time"
)

// Listing is a GTC market row.
type Listing struct {
	ID        string `json:"id"`
	SellerID  string `json:"sellerId"`
	ItemID    string `json:"itemId"`
	ItemName  string `json:"itemName"`
	Qty       int    `json:"qty"`
	Price     int    `json:"price"`
	CreatedAt int64  `json:"createdAt"`
}

// Manager is the Global Trading Center.
type Manager struct {
	mu       sync.RWMutex
	listings map[string]*Listing
	seq      int64
}

func NewManager() *Manager {
	return &Manager{listings: make(map[string]*Listing)}
}

func (m *Manager) Create(sellerID, itemID, itemName string, qty, price int) (*Listing, error) {
	if qty < 1 || price < 1 {
		return nil, fmt.Errorf("invalid qty/price")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	l := &Listing{
		ID: fmt.Sprintf("gtc_%d", m.seq), SellerID: sellerID,
		ItemID: itemID, ItemName: itemName, Qty: qty, Price: price,
		CreatedAt: time.Now().Unix(),
	}
	m.listings[l.ID] = l
	return l, nil
}

func (m *Manager) Purchase(listingID, buyerID string) (*Listing, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	l, ok := m.listings[listingID]
	if !ok {
		return nil, fmt.Errorf("listing not found")
	}
	if l.SellerID == buyerID {
		return nil, fmt.Errorf("cannot buy own listing")
	}
	cp := *l
	delete(m.listings, listingID)
	return &cp, nil
}

func (m *Manager) List() []Listing {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]Listing, 0, len(m.listings))
	for _, l := range m.listings {
		out = append(out, *l)
	}
	return out
}
