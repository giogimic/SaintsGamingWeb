package combat

import (
	"sync"
	"time"
)

// Session is realtime OR turn-based skirmish.
type Session struct {
	ID          string
	PlayerID    string
	CreatureID  string
	InstanceID  string
	PlayerHP    int
	CreatureHP  int
	CreatureMax int
	Mode        string // "rt" | "tb"
	Turn        string // "player" | "creature"
	StartedAt   time.Time
	Ended       bool
	Winner      string
}

// Manager tracks active fights keyed by player account.
type Manager struct {
	mu       sync.RWMutex
	byID     map[string]*Session
	byPlayer map[string]string
	seq      int64
}

func NewManager() *Manager {
	return &Manager{
		byID:     make(map[string]*Session),
		byPlayer: make(map[string]string),
	}
}

func (m *Manager) Start(playerID, creatureID, instanceID string, playerHP, creatureHP int) *Session {
	return m.start(playerID, creatureID, instanceID, playerHP, creatureHP, "rt")
}

func (m *Manager) StartTB(playerID, creatureID, instanceID string, playerHP, creatureHP int) *Session {
	return m.start(playerID, creatureID, instanceID, playerHP, creatureHP, "tb")
}

func (m *Manager) start(playerID, creatureID, instanceID string, playerHP, creatureHP int, mode string) *Session {
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
		Mode: mode, Turn: "player", StartedAt: time.Now(),
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

func (m *Manager) ApplyPlayerHit(playerID string, dmg int) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.sessionLocked(playerID)
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
	} else if s.Mode == "tb" {
		s.Turn = "creature"
	}
	return s
}

func (m *Manager) ApplyCreatureHit(playerID string, dmg int) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.sessionLocked(playerID)
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
	} else if s.Mode == "tb" {
		s.Turn = "player"
	}
	return s
}

// SubmitTB handles battle_submit_action: attack | defend | item | flee.
func (m *Manager) SubmitTB(playerID, action string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.sessionLocked(playerID)
	if s == nil || s.Ended {
		return s
	}
	if s.Mode != "tb" {
		s.Mode = "tb"
	}
	if s.Turn != "player" && action != "flee" {
		return s
	}
	switch action {
	case "flee":
		s.Ended = true
		s.Winner = "flee"
		delete(m.byPlayer, playerID)
		return s
	case "defend":
		// Skip player damage this round; creature still acts lightly
		s.Turn = "creature"
		s.PlayerHP -= 2
		if s.PlayerHP < 1 {
			s.PlayerHP = 1
		}
		s.Turn = "player"
		return s
	case "item":
		heal := 20
		s.PlayerHP += heal
		if s.PlayerHP > 100 {
			s.PlayerHP = 100
		}
		s.Turn = "creature"
	default: // attack
		s.CreatureHP -= 12
		if s.CreatureHP <= 0 {
			s.CreatureHP = 0
			s.Ended = true
			s.Winner = "player"
			delete(m.byPlayer, playerID)
			return s
		}
		s.Turn = "creature"
	}
	// Creature turn
	s.PlayerHP -= 7
	if s.PlayerHP <= 0 {
		s.PlayerHP = 0
		s.Ended = true
		s.Winner = "creature"
		delete(m.byPlayer, playerID)
		return s
	}
	s.Turn = "player"
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

func (m *Manager) sessionLocked(playerID string) *Session {
	id := m.byPlayer[playerID]
	if id == "" {
		return nil
	}
	return m.byID[id]
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
