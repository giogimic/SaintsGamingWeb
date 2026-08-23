package persist

import (
	"database/sql"
	"encoding/json"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

// PlayerHot is last known overworld seat for an account.
type PlayerHot struct {
	MapID   string
	X, Y    float64
	Credits int
	OK      bool
}

// Item is a bag stack.
type Item struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Qty  int    `json:"qty"`
}

// QuestProg is persisted quest progress.
type QuestProg struct {
	Slug      string         `json:"slug"`
	Status    string         `json:"status"`
	Objective map[string]int `json:"objective"`
}

// Store wraps SQLite hot-state tables for Go MMO accounts.
type Store struct {
	DB *sql.DB
}

func (s *Store) ok() bool { return s != nil && s.DB != nil }

func (s *Store) LoadPlayer(accountID string) PlayerHot {
	if !s.ok() || accountID == "" {
		return PlayerHot{}
	}
	var out PlayerHot
	err := s.DB.QueryRow(
		`SELECT mapId, x, y, credits FROM GoPlayerState WHERE accountId = ?`, accountID,
	).Scan(&out.MapID, &out.X, &out.Y, &out.Credits)
	if err != nil {
		return PlayerHot{}
	}
	out.OK = true
	return out
}

func (s *Store) SavePlayer(accountID, mapID string, x, y float64, credits int) {
	if !s.ok() || accountID == "" {
		return
	}
	base := world.ToBaseMapID(mapID)
	_, _ = s.DB.Exec(`
INSERT INTO GoPlayerState (accountId, mapId, x, y, credits, updatedAt)
VALUES (?, ?, ?, ?, ?, datetime('now'))
ON CONFLICT(accountId) DO UPDATE SET
  mapId=excluded.mapId, x=excluded.x, y=excluded.y, credits=excluded.credits, updatedAt=datetime('now')
`, accountID, base, x, y, credits)
}

func (s *Store) LoadInventory(accountID string) (items []Item, credits int, ok bool) {
	if !s.ok() || accountID == "" {
		return nil, 0, false
	}
	var c sql.NullInt64
	err := s.DB.QueryRow(`SELECT credits FROM GoPlayerState WHERE accountId = ?`, accountID).Scan(&c)
	if err == sql.ErrNoRows {
		return nil, 0, false
	}
	if err != nil {
		return nil, 0, false
	}
	credits = int(c.Int64)
	rows, err := s.DB.Query(`SELECT itemId, name, qty FROM GoInventory WHERE accountId = ?`, accountID)
	if err != nil {
		return nil, credits, true
	}
	defer rows.Close()
	for rows.Next() {
		var it Item
		if rows.Scan(&it.ID, &it.Name, &it.Qty) == nil && it.Qty > 0 {
			items = append(items, it)
		}
	}
	return items, credits, true
}

func (s *Store) SaveInventory(accountID string, items []Item, credits int) {
	if !s.ok() || accountID == "" {
		return
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return
	}
	defer func() { _ = tx.Rollback() }()
	_, _ = tx.Exec(`
INSERT INTO GoPlayerState (accountId, mapId, x, y, credits, updatedAt)
VALUES (?, 'DEMO_SANDBOX', 5, 5, ?, datetime('now'))
ON CONFLICT(accountId) DO UPDATE SET credits=excluded.credits, updatedAt=datetime('now')
`, accountID, credits)
	_, _ = tx.Exec(`DELETE FROM GoInventory WHERE accountId = ?`, accountID)
	for _, it := range items {
		if it.Qty <= 0 {
			continue
		}
		_, _ = tx.Exec(
			`INSERT INTO GoInventory (accountId, itemId, name, qty) VALUES (?, ?, ?, ?)`,
			accountID, it.ID, it.Name, it.Qty,
		)
	}
	_ = tx.Commit()
}

func (s *Store) LoadQuests(accountID string) []QuestProg {
	if !s.ok() || accountID == "" {
		return nil
	}
	rows, err := s.DB.Query(`SELECT slug, status, objectiveJson FROM GoQuestProgress WHERE accountId = ?`, accountID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	out := make([]QuestProg, 0)
	for rows.Next() {
		var p QuestProg
		var raw string
		if rows.Scan(&p.Slug, &p.Status, &raw) != nil {
			continue
		}
		p.Objective = map[string]int{}
		_ = json.Unmarshal([]byte(raw), &p.Objective)
		out = append(out, p)
	}
	return out
}

func (s *Store) SaveQuest(accountID string, p QuestProg) {
	if !s.ok() || accountID == "" || p.Slug == "" {
		return
	}
	raw, _ := json.Marshal(p.Objective)
	if raw == nil {
		raw = []byte("{}")
	}
	_, _ = s.DB.Exec(`
INSERT INTO GoQuestProgress (accountId, slug, status, objectiveJson)
VALUES (?, ?, ?, ?)
ON CONFLICT(accountId, slug) DO UPDATE SET
  status=excluded.status, objectiveJson=excluded.objectiveJson
`, accountID, p.Slug, p.Status, string(raw))
}

func (s *Store) LoadSkills(accountID string) map[string]int {
	out := map[string]int{}
	if !s.ok() || accountID == "" {
		return out
	}
	rows, err := s.DB.Query(`SELECT skillSlug, xp FROM GoSkillXP WHERE accountId = ?`, accountID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var slug string
		var xp int
		if rows.Scan(&slug, &xp) == nil {
			out[slug] = xp
		}
	}
	return out
}

func (s *Store) SaveSkills(accountID string, xp map[string]int) {
	if !s.ok() || accountID == "" || xp == nil {
		return
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return
	}
	defer func() { _ = tx.Rollback() }()
	_, _ = tx.Exec(`DELETE FROM GoSkillXP WHERE accountId = ?`, accountID)
	for slug, v := range xp {
		if v <= 0 {
			continue
		}
		_, _ = tx.Exec(
			`INSERT INTO GoSkillXP (accountId, skillSlug, xp) VALUES (?, ?, ?)`,
			accountID, slug, v,
		)
	}
	_ = tx.Commit()
}
