package combat

import (
	"sync"
	"time"
)

// Session is a simple realtime skirmish between a player and a creature.
type Session struct {
	ID           string
	PlayerID     string
	CreatureID   string
	InstanceID   string
	PlayerHP     int
	CreatureHP   int
	CreatureMax  int
	StartedAt    time.Time
	Ended        bool
	Winner       string // "player" | "creature" | ""
}

// Manager tracks active fights keyed by player account.
type Manager struct {
	mu   sync.RWMutex
	byID map[string]*Session
	byPlayer map[string]string
	seq  int64
}

func NewManager() *Manager {
	return &Manager{
		byID:     make(map[string]*Session),
		byPlayer: make(map[string]string),
	}
}

func (m *Manager) Start(playerID, creatureID, instanceID string, playerHP, creatureHP int) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	if old, ok := m.byPlayer[playerID]; ok {
		delete(m.byID, old)
	}
	m.seq++
	id := "combat_" + itoa(m.seq)
	s := &Session{
		ID: id, PlayerID: playerID, CreatureID: creatureID, InstanceID: instanceID,
		PlayerHP: playerHP, CreatureHP: creatureHP, CreatureMax: creatureHP,
		StartedAt: time.Now(),
	}
	m.byID[id] = s
	m.byPlayer[playerID] = id
	return s
}

func (m *Manager) GetByPlayer(playerID string) *Session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	id := m.byPlayer[playerID]
	if id == "" {
		return nil
	}
	return m.byID[id]
}

// ApplyPlayerHit deals damage to the creature; returns updated session.
func (m *Manager) ApplyPlayerHit(playerID string, dmg int) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := m.byPlayer[playerID]
	s := m.byID[id]
	if s == nil || s.Ended {
		return s
	}
	if dmg < 1 {
		dmg = 8
	}
	s.CreatureHP -= dmg
	if s.CreatureHP <= 0 {
		s.CreatureHP = 0
		s.Ended = true
		s.Winner = "player"
		delete(m.byPlayer, playerID)
	}
	return s
}

// ApplyCreatureHit deals damage to the player.
func (m *Manager) ApplyCreatureHit(playerID string, dmg int) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	id := m.byPlayer[playerID]
	s := m.byID[id]
	if s == nil || s.Ended {
		return s
	}
	if dmg < 1 {
		dmg = 5
	}
	s.PlayerHP -= dmg
	if s.PlayerHP <= 0 {
		s.PlayerHP = 0
		s.Ended = true
		s.Winner = "creature"
		delete(m.byPlayer, playerID)
	}
	return s
}

func (m *Manager) End(playerID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if id, ok := m.byPlayer[playerID]; ok {
		if s := m.byID[id]; s != nil {
			s.Ended = true
		}
		delete(m.byPlayer, playerID)
		delete(m.byID, id)
	}
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
