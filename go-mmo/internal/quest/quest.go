package quest

import "sync"

// Def is a quest template.
type Def struct {
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Objectives  []string `json:"objectives"`
}

// Progress is per-account quest state.
type Progress struct {
	Slug      string         `json:"slug"`
	Status    string         `json:"status"` // active | complete
	Objective map[string]int `json:"objective"`
}

// Manager tracks Saints Trail-style quests in memory.
type Manager struct {
	mu    sync.RWMutex
	defs  map[string]Def
	byAcc map[string]map[string]*Progress
}

func NewManager() *Manager {
	m := &Manager{
		defs:  make(map[string]Def),
		byAcc: make(map[string]map[string]*Progress),
	}
	m.defs["saints_trail_intro"] = Def{
		Slug: "saints_trail_intro", Name: "Saints Trail: First Steps",
		Description: "Gather scrap and craft a field kit.",
		Objectives:  []string{"gather_scrap", "craft_field_kit", "talk_guide"},
	}
	m.defs["saints_trail_report"] = Def{
		Slug: "saints_trail_report", Name: "Saints Trail: Report",
		Description: "Return to the Trail Guide.",
		Objectives:  []string{"talk_guide"},
	}
	return m
}

func (m *Manager) Accept(accountID, slug string) *Progress {
	m.mu.Lock()
	defer m.mu.Unlock()
	def, ok := m.defs[slug]
	if !ok {
		return nil
	}
	bag, ok := m.byAcc[accountID]
	if !ok {
		bag = make(map[string]*Progress)
		m.byAcc[accountID] = bag
	}
	if p, exists := bag[slug]; exists {
		return p
	}
	obj := make(map[string]int)
	for _, o := range def.Objectives {
		obj[o] = 0
	}
	p := &Progress{Slug: slug, Status: "active", Objective: obj}
	bag[slug] = p
	return p
}

func (m *Manager) Advance(accountID, objective string, delta int) []*Progress {
	m.mu.Lock()
	defer m.mu.Unlock()
	bag := m.byAcc[accountID]
	out := make([]*Progress, 0)
	for _, p := range bag {
		if p.Status != "active" {
			continue
		}
		if _, ok := p.Objective[objective]; ok {
			p.Objective[objective] += delta
			complete := true
			for _, v := range p.Objective {
				if v < 1 {
					complete = false
					break
				}
			}
			if complete {
				p.Status = "complete"
			}
			cp := *p
			out = append(out, &cp)
		}
	}
	return out
}

func (m *Manager) List(accountID string) []Progress {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]Progress, 0)
	for _, p := range m.byAcc[accountID] {
		out = append(out, *p)
	}
	return out
}

func (m *Manager) Def(slug string) (Def, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	d, ok := m.defs[slug]
	return d, ok
}
