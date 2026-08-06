package skill

import "sync"

// Grant is XP applied to one skill.
type Grant struct {
	Skill string `json:"skill"`
	XP    int    `json:"xp"`
}

// Manager tracks simple skill XP (subset of 27-skill bible).
type Manager struct {
	mu   sync.RWMutex
	xp   map[string]map[string]int // account -> skill -> xp
}

func NewManager() *Manager {
	return &Manager{xp: make(map[string]map[string]int)}
}

func (m *Manager) Add(accountID, skill string, amount int) map[string]int {
	m.mu.Lock()
	defer m.mu.Unlock()
	bag, ok := m.xp[accountID]
	if !ok {
		bag = make(map[string]int)
		m.xp[accountID] = bag
	}
	bag[skill] += amount
	out := make(map[string]int, len(bag))
	for k, v := range bag {
		out[k] = v
	}
	return out
}

func (m *Manager) Snapshot(accountID string) map[string]int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make(map[string]int)
	for k, v := range m.xp[accountID] {
		out[k] = v
	}
	return out
}

// CombatGrants mirrors grantsForTurnBattle loosely.
func CombatGrants(winner string) []Grant {
	if winner == "player" {
		return []Grant{{Skill: "combat", XP: 25}, {Skill: "survival", XP: 10}}
	}
	return []Grant{{Skill: "survival", XP: 5}}
}
