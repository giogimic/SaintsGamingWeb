package combat

import (
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/registry"
)

// Stats used for formula damage (bible-ish physical / ability split).
type Stats struct {
	PhysicalPower    float64
	PhysicalDefense  float64
	AbilityPower     float64
	AbilityDefense   float64
	CombatTempo      float64
	Level            int
	Types            []ElementType
}

func DefaultPlayerStats(hp int) Stats {
	return Stats{
		PhysicalPower:   10 + float64(max(1, hp))*0.05,
		PhysicalDefense: 10,
		AbilityPower:    10,
		AbilityDefense:  10,
		CombatTempo:     100,
		Level:           5,
		Types:           []ElementType{None},
	}
}

func DefaultCreatureStats(level, maxHP int) Stats {
	if level < 1 {
		level = 1
	}
	return Stats{
		PhysicalPower:   8 + float64(level)*2,
		PhysicalDefense: 6 + float64(level),
		AbilityPower:    7 + float64(level)*1.5,
		AbilityDefense:  6 + float64(level),
		CombatTempo:     90 + float64(level),
		Level:           level,
		Types:           []ElementType{None},
	}
}

// Session is realtime OR turn-based skirmish.
type Session struct {
	ID           string
	PlayerID     string
	CreatureID   string
	InstanceID   string
	PlayerHP     int
	PlayerMaxHP  int
	CreatureHP   int
	CreatureMax  int
	Mode         string // "rt" | "tb"
	Turn         string // "player" | "creature"
	StartedAt    time.Time
	Ended        bool
	Winner       string
	PlayerStats  Stats
	CreatureStats Stats
	LastDamage   int
	LastCrit     bool
}

// Manager tracks active fights keyed by player account.
type Manager struct {
	mu       sync.RWMutex
	byID     map[string]*Session
	byPlayer map[string]string
	seq      int64
	rng      *rand.Rand
	reg      *registry.Manager
}

func NewManager(reg *registry.Manager) *Manager {
	return &Manager{
		byID:     make(map[string]*Session),
		byPlayer: make(map[string]string),
		rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
		reg:      reg,
	}
}

func (m *Manager) BuildPlayerStats(classSlug string, level int) Stats {
	if m.reg != nil {
		c, ok := m.reg.GetClass(classSlug)
		if ok {
			// Phase B: Use basic parse of c.BaseStats for now, fallback to default if missing.
			// Ideally, we'd JSON parse c.BaseStats. For MVP data-driven, we just want to prove the wireup.
			// Currently returning a hybrid that respects the DB lookup existence.
			_ = c
			return Stats{
				PhysicalPower:   15 + float64(level)*2,
				PhysicalDefense: 12 + float64(level),
				AbilityPower:    15,
				AbilityDefense:  12,
				CombatTempo:     100,
				Level:           level,
				Types:           []ElementType{None},
			}
		}
	}
	return DefaultPlayerStats(100)
}

func (m *Manager) BuildCreatureStats(slug string, level int) Stats {
	if m.reg != nil {
		c, ok := m.reg.GetCreature(slug)
		if ok {
			return Stats{
				PhysicalPower:   float64(c.PhysicalPower) + float64(level)*1.5,
				PhysicalDefense: float64(c.PhysicalDefense) + float64(level)*1.0,
				AbilityPower:    float64(c.AbilityPower) + float64(level)*1.5,
				AbilityDefense:  float64(c.AbilityDefense) + float64(level)*1.0,
				CombatTempo:     float64(c.CombatTempo),
				Level:           level,
				Types:           []ElementType{None}, // Should parse c.Types
			}
		}
	}
	return DefaultCreatureStats(level, 100)
}

func (m *Manager) Start(playerID, playerClassSlug, creatureID, creatureSlug, instanceID string, playerHP, creatureHP, playerLvl, creatureLvl int) *Session {
	return m.start(playerID, creatureID, instanceID, playerHP, creatureHP, "rt", m.BuildPlayerStats(playerClassSlug, playerLvl), m.BuildCreatureStats(creatureSlug, creatureLvl))
}

func (m *Manager) StartTB(playerID, playerClassSlug, creatureID, creatureSlug, instanceID string, playerHP, creatureHP, playerLvl, creatureLvl int) *Session {
	return m.start(playerID, creatureID, instanceID, playerHP, creatureHP, "tb", m.BuildPlayerStats(playerClassSlug, playerLvl), m.BuildCreatureStats(creatureSlug, creatureLvl))
}

func (m *Manager) StartTBWithStats(playerID, creatureID, instanceID string, playerHP, creatureHP int, player, creature Stats) *Session {
	return m.start(playerID, creatureID, instanceID, playerHP, creatureHP, "tb", player, creature)
}

func (m *Manager) start(playerID, creatureID, instanceID string, playerHP, creatureHP int, mode string, ps, cs Stats) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	if old, ok := m.byPlayer[playerID]; ok {
		delete(m.byID, old)
	}
	m.seq++
	id := "combat_" + itoa(m.seq)
	s := &Session{
		ID: id, PlayerID: playerID, CreatureID: creatureID, InstanceID: instanceID,
		PlayerHP: playerHP, PlayerMaxHP: playerHP, CreatureHP: creatureHP, CreatureMax: creatureHP,
		Mode: mode, Turn: "player", StartedAt: time.Now(),
		PlayerStats: ps, CreatureStats: cs,
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

func calcDamageARPG(atk, def Stats, move *CombatAbility, stab bool, typeMod float64, rng *rand.Rand) (dmg int, wasCrit bool) {
	if move == nil {
		move = GetCombatAbility("strike")
	}
	isMagic := (move.Category == Special || move.Category == Heal)
	atkStat := atk.PhysicalPower
	defStat := def.PhysicalDefense
	if isMagic {
		atkStat = atk.AbilityPower
		defStat = def.AbilityDefense
	}
	power := float64(move.Power)
	if power < 1 {
		power = 10
	}
	level := float64(atk.Level)
	if level < 1 {
		level = 1
	}

	raw := ((level * power * atkStat) / (math.Max(1, defStat) * 10)) + 2.0
	
	stabMod := 1.0
	if stab {
		stabMod = 1.25
	}
	raw = raw * typeMod * stabMod

	wasCrit = false
	if rng != nil && rng.Float64() < 0.08 {
		wasCrit = true
		raw *= 1.5
	}
	return int(math.Max(1, math.Floor(raw))), wasCrit
}

func executeHit(atk, def Stats, moveId string, rng *rand.Rand) (dmg int, wasCrit bool) {
	move := GetCombatAbility(moveId)
	if move == nil {
		move = GetCombatAbility("strike")
	}
	stab := false
	for _, t := range atk.Types {
		if t == move.Element {
			stab = true
			break
		}
	}
	typeMod := 1.0
	for _, t := range def.Types {
		if t != None {
			typeMod *= GetCombatMultiplier(move.Element, t)
		}
	}
	return calcDamageARPG(atk, def, move, stab, typeMod, rng)
}

func (m *Manager) ApplyPlayerHit(playerID string, abilityID string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.sessionLocked(playerID)
	if s == nil || s.Ended {
		return s
	}
	if abilityID == "" {
		abilityID = "strike"
	}
	dmg, crit := executeHit(s.PlayerStats, s.CreatureStats, abilityID, m.rng)
	s.LastCrit = crit
	s.LastDamage = dmg
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

func (m *Manager) ApplyCreatureHit(playerID string, abilityID string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.sessionLocked(playerID)
	if s == nil || s.Ended {
		return s
	}
	if abilityID == "" {
		abilityID = "strike"
	}
	dmg, crit := executeHit(s.CreatureStats, s.PlayerStats, abilityID, m.rng)
	s.LastCrit = crit
	s.LastDamage = dmg
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

// SubmitTB handles battle_submit_action: attack | defend | item | flee | magic.
func (m *Manager) SubmitTB(playerID, action, moveId string) *Session {
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
		// Tempo check — higher player tempo flees more often
		chance := 0.45 + (s.PlayerStats.CombatTempo-s.CreatureStats.CombatTempo)/400
		if chance > 0.85 {
			chance = 0.85
		}
		if chance < 0.2 {
			chance = 0.2
		}
		if m.rng.Float64() < chance {
			s.Ended = true
			s.Winner = "flee"
			delete(m.byPlayer, playerID)
			return s
		}
		// Failed flee → creature free hit
		s.Turn = "creature"
	case "defend":
		s.Turn = "creature"
		incoming, crit := executeHit(s.CreatureStats, s.PlayerStats, "strike", m.rng)
		incoming = int(math.Max(1, math.Floor(float64(incoming)*0.35)))
		s.LastDamage = incoming
		s.LastCrit = crit
		s.PlayerHP -= incoming
		if s.PlayerHP < 1 {
			s.PlayerHP = 1
		}
		s.Turn = "player"
		return s
	case "item":
		heal := 20 + s.PlayerStats.Level
		s.PlayerHP += heal
		if s.PlayerMaxHP > 0 && s.PlayerHP > s.PlayerMaxHP {
			s.PlayerHP = s.PlayerMaxHP
		} else if s.PlayerHP > 100 {
			s.PlayerHP = 100
		}
		s.Turn = "creature"
	case "magic":
		dmg, crit := executeHit(s.PlayerStats, s.CreatureStats, "fireball", m.rng)
		s.LastDamage = dmg
		s.LastCrit = crit
		s.CreatureHP -= dmg
		if s.CreatureHP <= 0 {
			s.CreatureHP = 0
			s.Ended = true
			s.Winner = "player"
			delete(m.byPlayer, playerID)
			return s
		}
		s.Turn = "creature"
	default: // attack
		dmg, crit := executeHit(s.PlayerStats, s.CreatureStats, moveId, m.rng)
		s.LastDamage = dmg
		s.LastCrit = crit
		s.CreatureHP -= dmg
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
	cdmg, ccrit := executeHit(s.CreatureStats, s.PlayerStats, "strike", m.rng)
	s.LastDamage = cdmg
	s.LastCrit = ccrit
	s.PlayerHP -= cdmg
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

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
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
