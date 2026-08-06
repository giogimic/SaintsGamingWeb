package skill

import (
	"database/sql"
	"math"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/persist"
)

// Grant is XP applied to one skill.
type Grant struct {
	Skill string `json:"skill"`
	XP    int    `json:"xp"`
	Level int    `json:"level,omitempty"`
}

// Combat typings (bible) + gathering / artisan / support — 27 total.
var AllSlugs = []string{
	"attack", "strength", "defence", "hitpoints", "ranged", "agility", "perception", "wisdom", "intelligence",
	"farming", "fishing", "hunter", "mining", "woodcutting",
	"construction", "cooking", "crafting", "firemaking", "fletching", "herblore", "runecrafting", "smithing",
	"thieving", "summoning", "magic", "prayer", "necromancy",
}

var combatSlugs = map[string]bool{
	"attack": true, "strength": true, "defence": true, "hitpoints": true, "ranged": true,
	"agility": true, "perception": true, "wisdom": true, "intelligence": true,
}

// Manager tracks skill XP with optional SQLite persistence.
type Manager struct {
	mu    sync.RWMutex
	xp    map[string]map[string]int // account -> skill -> xp
	store *persist.Store
}

func NewManager(db *sql.DB) *Manager {
	var store *persist.Store
	if db != nil {
		store = &persist.Store{DB: db}
	}
	return &Manager{xp: make(map[string]map[string]int), store: store}
}

func Normalize(raw string) string {
	s := raw
	switch s {
	case "constitution", "hp", "hitpoint":
		return "hitpoints"
	case "defense", "def":
		return "defence"
	case "str":
		return "strength"
	case "atk":
		return "attack"
	case "combat": // legacy grant alias → attack
		return "attack"
	case "survival":
		return "hitpoints"
	default:
		return s
	}
}

// CombatLevelFromXP: floor(sqrt(XP/50))+1, max 50.
func CombatLevelFromXP(xp int) int {
	lvl := int(math.Floor(math.Sqrt(float64(max0(xp))/50))) + 1
	if lvl < 1 {
		lvl = 1
	}
	if lvl > 50 {
		lvl = 50
	}
	return lvl
}

// GatheringLevelFromXP — OSRS-style curve capped at 99.
func GatheringLevelFromXP(xp int) int {
	level := 1
	required := 0.0
	for i := 1; i < 99; i++ {
		required += math.Floor(float64(i)+300*math.Pow(2, float64(i)/7.0)) / 4
		if float64(xp) >= required {
			level = i + 1
		} else {
			break
		}
	}
	if level > 99 {
		level = 99
	}
	return level
}

func LevelFor(slug string, xp int) int {
	slug = Normalize(slug)
	if combatSlugs[slug] {
		return CombatLevelFromXP(xp)
	}
	return GatheringLevelFromXP(xp)
}

func (m *Manager) ensure(accountID string) {
	if _, ok := m.xp[accountID]; ok {
		return
	}
	bag := make(map[string]int)
	if m.store != nil {
		for k, v := range m.store.LoadSkills(accountID) {
			bag[Normalize(k)] = v
		}
	}
	m.xp[accountID] = bag
}

func (m *Manager) flush(accountID string) {
	if m.store == nil {
		return
	}
	m.store.SaveSkills(accountID, m.xp[accountID])
}

func (m *Manager) Add(accountID, skill string, amount int) map[string]int {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensure(accountID)
	skill = Normalize(skill)
	bag := m.xp[accountID]
	bag[skill] += amount
	m.flush(accountID)
	out := make(map[string]int, len(bag))
	for k, v := range bag {
		out[k] = v
	}
	return out
}

func (m *Manager) Snapshot(accountID string) map[string]int {
	m.mu.Lock()
	m.ensure(accountID)
	m.mu.Unlock()
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make(map[string]int)
	for k, v := range m.xp[accountID] {
		out[k] = v
	}
	return out
}

func (m *Manager) Levels(accountID string) map[string]int {
	snap := m.Snapshot(accountID)
	out := make(map[string]int, len(snap))
	for k, v := range snap {
		out[k] = LevelFor(k, v)
	}
	return out
}

// CombatGrants mirrors grantsForTurnBattle loosely using bible skill slugs.
func CombatGrants(winner string, creatureLevel int) []Grant {
	if creatureLevel < 1 {
		creatureLevel = 1
	}
	if winner == "player" {
		return []Grant{
			{Skill: "attack", XP: 15 + creatureLevel*5},
			{Skill: "strength", XP: 10 + creatureLevel*3},
			{Skill: "hitpoints", XP: 5 + creatureLevel*2},
			{Skill: "defence", XP: 5 + creatureLevel*2},
		}
	}
	if winner == "flee" {
		return []Grant{{Skill: "agility", XP: 2 + creatureLevel}}
	}
	return []Grant{{Skill: "hitpoints", XP: 2 + creatureLevel}, {Skill: "defence", XP: 2 + creatureLevel}}
}

func max0(n int) int {
	if n < 0 {
		return 0
	}
	return n
}
