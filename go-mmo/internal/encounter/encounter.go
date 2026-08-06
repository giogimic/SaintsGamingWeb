package encounter

import (
	"math/rand"
	"sync"
	"time"
)

// Result of a grass encounter roll.
type Result struct {
	Triggered bool   `json:"triggered"`
	Species   string `json:"species,omitempty"`
	Level     int    `json:"level,omitempty"`
}

// Manager rolls encounters with a simple cooldown.
type Manager struct {
	mu       sync.Mutex
	lastRoll map[string]time.Time
	cooldown time.Duration
	chance   float64
	rng      *rand.Rand
}

func NewManager() *Manager {
	return &Manager{
		lastRoll: make(map[string]time.Time),
		cooldown: 2 * time.Second,
		chance:   0.18,
		rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

var demoSpecies = []string{"brushpup", "emberkit", "tidefin", "stoneling"}

func (m *Manager) Check(accountID string, tileLogic int) Result {
	// Grass = 2
	if tileLogic != 2 {
		return Result{}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if t, ok := m.lastRoll[accountID]; ok && time.Since(t) < m.cooldown {
		return Result{}
	}
	m.lastRoll[accountID] = time.Now()
	if m.rng.Float64() > m.chance {
		return Result{}
	}
	sp := demoSpecies[m.rng.Intn(len(demoSpecies))]
	lvl := 3 + m.rng.Intn(4)
	return Result{Triggered: true, Species: sp, Level: lvl}
}
