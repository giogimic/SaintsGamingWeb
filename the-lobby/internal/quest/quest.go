package quest

import (
	"database/sql"
	"sync"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/persist"
)

type QuestObjective struct {
	Stage       int    `json:"stage"`
	Type        string `json:"type"`
	TargetSlug  string `json:"targetSlug"`
	RequiredQty int    `json:"requiredQty"`
	Description string `json:"description"`
}

type Def struct {
	Slug        string
	Title       string
	Description string
	Rewards     string
	NextQuest   string
	Objectives  []QuestObjective
}

// Progress is per-account quest state.
type Progress struct {
	Slug      string         `json:"slug"`
	Status    string         `json:"status"` // active | complete
	Objective map[string]int `json:"objective"`
}

// ActiveQuest is the payload sent to the client.
type ActiveQuest struct {
	ID          string          `json:"id"`
	Slug        string          `json:"slug"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Stage       int             `json:"stage"`
	Progress    int             `json:"progress"`
	Objective   *QuestObjective `json:"objective"`
}

type Manager struct {
	mu    sync.RWMutex
	defs  map[string]Def
	byAcc map[string]map[string]*Progress
	store *persist.Store
}

func NewManager(db *sql.DB) *Manager {
	var store *persist.Store
	if db != nil {
		store = &persist.Store{DB: db}
	}
	m := &Manager{
		defs:  make(map[string]Def),
		byAcc: make(map[string]map[string]*Progress),
		store: store,
	}
	m.seedQuests()
	return m
}

func (m *Manager) seedQuests() {
	m.defs["saints_trail_intro"] = Def{
		Slug: "saints_trail_intro", Title: "Saints Trail: First Steps",
		Description: "Gather scrap and craft a field kit.",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "COLLECT", TargetSlug: "gather_scrap", RequiredQty: 1, Description: "Gather scrap"},
			{Stage: 2, Type: "CRAFT", TargetSlug: "craft_field_kit", RequiredQty: 1, Description: "Craft a field kit"},
			{Stage: 3, Type: "TALK", TargetSlug: "talk_guide", RequiredQty: 1, Description: "Talk to the Trail Guide"},
		},
	}
	m.defs["saints_trail_report"] = Def{
		Slug: "saints_trail_report", Title: "Saints Trail: Report",
		Description: "Return to the Trail Guide.",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "TALK", TargetSlug: "talk_guide", RequiredQty: 1, Description: "Talk to the Trail Guide"},
		},
	}
	
	// SPYDER CAMPAIGN
	m.defs["quest_azure_welcome"] = Def{
		Slug: "quest_azure_welcome", Title: "Spyder 1: Azure Welcome", Description: "Meet the Azure Guide and begin your journey in Azure Town.", NextQuest: "quest_azure_townsfolk",
		Objectives: []QuestObjective{{Stage: 1, Type: "TALK", TargetSlug: "npc_azure_guide", RequiredQty: 1, Description: "Talk to the Azure Guide again after accepting"}},
	}
	m.defs["quest_azure_townsfolk"] = Def{
		Slug: "quest_azure_townsfolk", Title: "Spyder 2: Meet the Townsfolk", Description: "Speak with the enforcer and knight posted around Azure Plaza.", NextQuest: "quest_spyder_first_capture",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "TALK", TargetSlug: "npc_azure_enforcer", RequiredQty: 1, Description: "Speak with the Azure Enforcer"},
			{Stage: 2, Type: "TALK", TargetSlug: "npc_azure_knight", RequiredQty: 1, Description: "Speak with the Azure Knight"},
		},
	}
	m.defs["quest_spyder_first_capture"] = Def{
		Slug: "quest_spyder_first_capture", Title: "Spyder 3: First Capture", Description: "Capture a wild creature on Route 1, then report to the Guide.", NextQuest: "quest_spyder_cotton_arrive",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "CLAIM", TargetSlug: "capture_any", RequiredQty: 1, Description: "Capture any wild creature (tall grass on Route 1)"},
			{Stage: 2, Type: "TALK", TargetSlug: "npc_azure_guide", RequiredQty: 1, Description: "Report your capture to the Azure Guide"},
		},
	}
	m.defs["quest_spyder_cotton_arrive"] = Def{
		Slug: "quest_spyder_cotton_arrive", Title: "Spyder 4: Cotton Town", Description: "Follow Route 1 east to Cotton Town and greet the greeter.", NextQuest: "quest_spyder_cotton_locals",
		Objectives: []QuestObjective{{Stage: 1, Type: "TALK", TargetSlug: "npc_cotton_greeter", RequiredQty: 1, Description: "Speak with the Cotton Greeter"}},
	}
	m.defs["quest_spyder_cotton_locals"] = Def{
		Slug: "quest_spyder_cotton_locals", Title: "Spyder 5: Cotton Locals", Description: "Enter Scoop and the Café in Cotton Town and meet the locals inside.", NextQuest: "quest_spyder_cotton_tunnel",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "TALK", TargetSlug: "npc_cotton_scoop_clerk", RequiredQty: 1, Description: "Enter Scoop and speak with the clerk"},
			{Stage: 2, Type: "TALK", TargetSlug: "npc_cotton_cafe_host", RequiredQty: 1, Description: "Enter the Café and speak with the host"},
		},
	}
	m.defs["quest_spyder_cotton_tunnel"] = Def{
		Slug: "quest_spyder_cotton_tunnel", Title: "Spyder 6: Cotton Tunnel", Description: "Find Carlos in the Cotton Tunnel, then defeat his Dragarbor and Pairagrin in a trainer battle.", NextQuest: "quest_spyder_route2",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "TALK", TargetSlug: "npc_cotton_tunnel_carlos", RequiredQty: 1, Description: "Enter the Cotton Tunnel (east of town) and speak with Carlos"},
			{Stage: 2, Type: "BATTLE", TargetSlug: "npc_cotton_tunnel_carlos", RequiredQty: 1, Description: "Defeat Carlos's Dragarbor and Pairagrin"},
		},
	}
	m.defs["quest_spyder_route2"] = Def{
		Slug: "quest_spyder_route2", Title: "Spyder 7: Beyond the Tunnel", Description: "Pass east through the Cotton Tunnel onto Spyder Route 2 and meet the road scout.", NextQuest: "quest_spyder_leather_arrive",
		Objectives: []QuestObjective{{Stage: 1, Type: "TALK", TargetSlug: "npc_spyder_route2_scout", RequiredQty: 1, Description: "Exit the tunnel east onto Route 2 and speak with the scout"}},
	}
	m.defs["quest_spyder_leather_arrive"] = Def{
		Slug: "quest_spyder_leather_arrive", Title: "Spyder 8: Leather Town", Description: "Follow Route 2 east through Route 3 into Leather Town and greet the gatekeeper.", NextQuest: "quest_spyder_leather_scoop",
		Objectives: []QuestObjective{{Stage: 1, Type: "TALK", TargetSlug: "npc_leather_greeter", RequiredQty: 1, Description: "Reach Leather Town via Route 3 and speak with the greeter"}},
	}
	m.defs["quest_spyder_leather_scoop"] = Def{
		Slug: "quest_spyder_leather_scoop", Title: "Spyder 9: Leather Scoop", Description: "Visit Leather Scoop east of the Center and speak with the clerk — restock film for the road ahead.", NextQuest: "quest_spyder_leather_gym",
		Objectives: []QuestObjective{{Stage: 1, Type: "TALK", TargetSlug: "npc_leather_scoop_clerk", RequiredQty: 1, Description: "Enter Leather Scoop and speak with the clerk"}},
	}
	m.defs["quest_spyder_leather_gym"] = Def{
		Slug: "quest_spyder_leather_gym", Title: "Spyder 10: Leather Gym", Description: "Challenge Rook in the Leather Gym — defeat Rockitten and Aardorn, then the east shaft opens for exploration.", NextQuest: "quest_spyder_leather_shaft",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "TALK", TargetSlug: "npc_leather_gym_attendant", RequiredQty: 1, Description: "Enter the Leather Gym and speak with Rook"},
			{Stage: 2, Type: "BATTLE", TargetSlug: "npc_leather_gym_attendant", RequiredQty: 1, Description: "Defeat Rook's Rockitten and Aardorn"},
		},
	}
	m.defs["quest_spyder_leather_shaft"] = Def{
		Slug: "quest_spyder_leather_shaft", Title: "Spyder 11: Leather Shafts", Description: "Enter the east shaft from Leather Town, speak with the shaft scout, then press deeper into Shaft 2.", NextQuest: "quest_spyder_beyond_shaft",
		Objectives: []QuestObjective{
			{Stage: 1, Type: "TALK", TargetSlug: "npc_leather_shaft_scout", RequiredQty: 1, Description: "Enter Shaft 1 east of Leather Town and speak with the scout"},
			{Stage: 2, Type: "TALK", TargetSlug: "npc_leather_shaft2_miner", RequiredQty: 1, Description: "Press east into Shaft 2 and speak with the miner"},
		},
	}
	m.defs["quest_spyder_beyond_shaft"] = Def{
		Slug: "quest_spyder_beyond_shaft", Title: "Spyder 12: Beyond the Shafts", Description: "Talk to the pathfinder in Shaft 2 — stub hook for the next Spyder region (Studio-expandable).",
		Objectives: []QuestObjective{{Stage: 1, Type: "TALK", TargetSlug: "npc_leather_shaft2_pathfinder", RequiredQty: 1, Description: "Find the pathfinder deeper in Shaft 2"}},
	}
}

func (m *Manager) ensureLoaded(accountID string) {
	if _, ok := m.byAcc[accountID]; ok {
		return
	}
	bag := make(map[string]*Progress)
	if m.store != nil {
		for _, qp := range m.store.LoadQuests(accountID) {
			obj := qp.Objective
			if obj == nil {
				obj = map[string]int{}
			}
			bag[qp.Slug] = &Progress{Slug: qp.Slug, Status: qp.Status, Objective: obj}
		}
	}
	m.byAcc[accountID] = bag
}

func (m *Manager) flush(accountID string, p *Progress) {
	if m.store == nil || p == nil {
		return
	}
	m.store.SaveQuest(accountID, persist.QuestProg{
		Slug: p.Slug, Status: p.Status, Objective: p.Objective,
	})
}

func (m *Manager) Accept(accountID, slug string) *Progress {
	m.mu.Lock()
	defer m.mu.Unlock()
	def, ok := m.defs[slug]
	if !ok {
		return nil
	}
	m.ensureLoaded(accountID)
	bag := m.byAcc[accountID]
	if p, exists := bag[slug]; exists {
		return p
	}
	obj := make(map[string]int)
	for _, o := range def.Objectives {
		obj[o.TargetSlug] = 0
	}
	p := &Progress{Slug: slug, Status: "active", Objective: obj}
	bag[slug] = p
	m.flush(accountID, p)
	return p
}

func (m *Manager) Advance(accountID, targetSlug string, delta int) []ActiveQuest {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ensureLoaded(accountID)
	bag := m.byAcc[accountID]
	
	for _, p := range bag {
		if p.Status != "active" {
			continue
		}
		def, ok := m.defs[p.Slug]
		if !ok {
			continue
		}
		
		// Find current stage's objective
		var currentObj *QuestObjective
		for i := range def.Objectives {
			obj := &def.Objectives[i]
			if p.Objective[obj.TargetSlug] < obj.RequiredQty {
				currentObj = obj
				break
			}
		}
		
		if currentObj != nil && currentObj.TargetSlug == targetSlug {
			p.Objective[targetSlug] += delta
			
			// Re-check completion
			complete := true
			for _, obj := range def.Objectives {
				if p.Objective[obj.TargetSlug] < obj.RequiredQty {
					complete = false
					break
				}
			}
			if complete {
				p.Status = "complete"
				if def.NextQuest != "" {
					// Auto-accept next quest
					if _, exists := bag[def.NextQuest]; !exists {
						nDef := m.defs[def.NextQuest]
						nObj := make(map[string]int)
						for _, o := range nDef.Objectives {
							nObj[o.TargetSlug] = 0
						}
						nP := &Progress{Slug: def.NextQuest, Status: "active", Objective: nObj}
						bag[def.NextQuest] = nP
						m.flush(accountID, nP)
					}
				}
			}
			m.flush(accountID, p)
		}
	}
	return m.listUnlocked(accountID)
}

func (m *Manager) List(accountID string) []ActiveQuest {
	m.mu.Lock()
	m.ensureLoaded(accountID)
	m.mu.Unlock()
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.listUnlocked(accountID)
}

func (m *Manager) listUnlocked(accountID string) []ActiveQuest {
	out := make([]ActiveQuest, 0)
	for _, p := range m.byAcc[accountID] {
		if p.Status != "active" {
			continue
		}
		def, ok := m.defs[p.Slug]
		if !ok {
			continue
		}
		
		var currentObj *QuestObjective
		for i := range def.Objectives {
			obj := &def.Objectives[i]
			if p.Objective[obj.TargetSlug] < obj.RequiredQty {
				currentObj = obj
				break
			}
		}
		
		aq := ActiveQuest{
			ID:          p.Slug,
			Slug:        p.Slug,
			Title:       def.Title,
			Description: def.Description,
		}
		if currentObj != nil {
			aq.Stage = currentObj.Stage
			aq.Progress = p.Objective[currentObj.TargetSlug]
			aq.Objective = currentObj
		} else {
			aq.Stage = len(def.Objectives) + 1
		}
		
		out = append(out, aq)
	}
	return out
}

func (m *Manager) Def(slug string) (Def, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	d, ok := m.defs[slug]
	return d, ok
}
