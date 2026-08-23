package dialogue

import (
	"database/sql"
	"encoding/json"
	"strings"
	"sync"
)

// Node is one dialogue step.
type Node struct {
	ID      string   `json:"id"`
	Speaker string   `json:"speaker"`
	Text    string   `json:"text"`
	Choices []Choice `json:"choices,omitempty"`
}

// Choice advances or triggers a quest action.
type Choice struct {
	Label     string `json:"label"`
	Next      string `json:"next,omitempty"`
	Action    string `json:"action,omitempty"` // end | accept_quest | complete_quest | open_shop
	QuestSlug string `json:"questSlug,omitempty"`
}

// Tree is a named dialogue graph.
type Tree struct {
	ID    string
	Start string
	Nodes map[string]Node
}

// Session tracks where a player is in a tree.
type Session struct {
	AccountID string
	TreeID    string
	NodeID    string
	TargetID  string
}

// Manager holds dialogue trees (seeded demos + optional SQLite NpcDialogueTree rows).
type Manager struct {
	mu       sync.RWMutex
	trees    map[string]*Tree
	sessions map[string]*Session // account -> session
	db       *sql.DB
}

func NewManager(db *sql.DB) *Manager {
	m := &Manager{
		trees:    make(map[string]*Tree),
		sessions: make(map[string]*Session),
		db:       db,
	}
	m.seed()
	_ = m.LoadFromDB()
	return m
}

func (m *Manager) seed() {
	m.trees["demo_welcome"] = &Tree{
		ID: "demo_welcome", Start: "start",
		Nodes: map[string]Node{
			"start": {
				ID: "start", Speaker: "Trail Guide",
				Text: "Welcome to Aethervale. Ready to walk the Saints Trail?",
				Choices: []Choice{
					{Label: "Tell me more", Next: "more"},
					{Label: "Accept the trail", Next: "accept", Action: "accept_quest", QuestSlug: "saints_trail_intro"},
					{Label: "Maybe later", Action: "end"},
				},
			},
			"more": {
				ID: "more", Speaker: "Trail Guide",
				Text: "Gather scrap, craft a kit, and report back. Peers share your shard.",
				Choices: []Choice{
					{Label: "Accept", Next: "accept", Action: "accept_quest", QuestSlug: "saints_trail_intro"},
					{Label: "Bye", Action: "end"},
				},
			},
			"accept": {
				ID: "accept", Speaker: "Trail Guide",
				Text: "Trail accepted. Check your quest log.",
				Choices: []Choice{{Label: "Thanks", Action: "end"}},
			},
		},
	}
	m.trees["demo_shop"] = &Tree{
		ID: "demo_shop", Start: "start",
		Nodes: map[string]Node{
			"start": {
				ID: "start", Speaker: "Provisioner",
				Text: "Need supplies? Open the shop catalog.",
				Choices: []Choice{
					{Label: "Open shop", Action: "open_shop"},
					{Label: "Leave", Action: "end"},
				},
			},
		},
	}
	m.trees["npc_guide"] = m.trees["demo_welcome"]
	m.trees["npc_shop"] = m.trees["demo_shop"]
}

// LoadFromDB imports Prisma-compatible NpcDialogueTree rows (npcId + JSON data).
func (m *Manager) LoadFromDB() error {
	if m.db == nil {
		return nil
	}
	rows, err := m.db.Query(`SELECT npcId, name, data FROM NpcDialogueTree`)
	if err != nil {
		// Table may be empty / missing on fresh Go-only DBs
		return err
	}
	defer rows.Close()
	m.mu.Lock()
	defer m.mu.Unlock()
	for rows.Next() {
		var npcID, name, raw string
		if rows.Scan(&npcID, &name, &raw) != nil {
			continue
		}
		tree, ok := parsePrismaTree(npcID, name, raw)
		if !ok {
			continue
		}
		m.trees[npcID] = tree
	}
	return nil
}

func parsePrismaTree(npcID, name, raw string) (*Tree, bool) {
	var blob map[string]json.RawMessage
	if json.Unmarshal([]byte(raw), &blob) != nil || len(blob) == 0 {
		return nil, false
	}
	nodes := make(map[string]Node)
	start := "node_start"
	if _, ok := blob["node_start"]; !ok {
		start = "start"
	}
	for id, nodeRaw := range blob {
		var loose struct {
			Text     string `json:"text"`
			Speaker  string `json:"speaker"`
			Choices  []struct {
				Label     string `json:"label"`
				Next      string `json:"next"`
				NextNode  string `json:"nextNode"`
				Action    string `json:"action"`
				QuestSlug string `json:"questSlug"`
			} `json:"choices"`
			Options []struct {
				Label     string `json:"label"`
				Next      string `json:"next"`
				NextNode  string `json:"nextNode"`
				Action    string `json:"action"`
				QuestSlug string `json:"questSlug"`
			} `json:"options"`
		}
		if json.Unmarshal(nodeRaw, &loose) != nil {
			continue
		}
		speaker := loose.Speaker
		if speaker == "" {
			speaker = name
		}
		n := Node{ID: id, Speaker: speaker, Text: loose.Text}
		src := loose.Choices
		if len(src) == 0 {
			for _, o := range loose.Options {
				src = append(src, o)
			}
		}
		for _, c := range src {
			next := c.Next
			if next == "" {
				next = c.NextNode
			}
			action := normalizeAction(c.Action, next)
			if next == "exit" && action == "" {
				action = "end"
				next = ""
			}
			n.Choices = append(n.Choices, Choice{
				Label: c.Label, Next: next, Action: action, QuestSlug: c.QuestSlug,
			})
		}
		if len(n.Choices) == 0 {
			n.Choices = []Choice{{Label: "…", Action: "end"}}
		}
		nodes[id] = n
	}
	if len(nodes) == 0 {
		return nil, false
	}
	if _, ok := nodes[start]; !ok {
		for id := range nodes {
			start = id
			break
		}
	}
	return &Tree{ID: npcID, Start: start, Nodes: nodes}, true
}

func normalizeAction(action, next string) string {
	a := strings.ToLower(strings.TrimSpace(action))
	switch a {
	case "accept_quest", "acceptquest":
		return "accept_quest"
	case "complete_quest", "completequest":
		return "complete_quest"
	case "open_shop", "openshop":
		return "open_shop"
	case "grant_demo_tools", "grantdemotools":
		return "grant_demo_tools"
	case "grant_spyder_starter", "grantspyderstarter":
		return "grant_spyder_starter"
	case "heal_party", "healparty":
		return "heal_party"
	case "demo_quest_report", "demoquestreport":
		return "demo_quest_report"
	case "start_trainer_battle", "starttrainerbattle":
		return "start_trainer_battle"
	case "end", "exit", "close":
		return "end"
	case "":
		if next == "" || next == "exit" {
			return "end"
		}
		return ""
	default:
		return a
	}
}

// Start begins dialogue for target (npc id or tree id).
func (m *Manager) Start(accountID, targetID string) (Node, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	tree := m.trees[targetID]
	if tree == nil {
		tree = m.trees["demo_welcome"]
	}
	node := tree.Nodes[tree.Start]
	m.sessions[accountID] = &Session{AccountID: accountID, TreeID: tree.ID, NodeID: node.ID, TargetID: targetID}
	return node, true
}

// SelectResult is the outcome of a choice.
type SelectResult struct {
	Node      *Node
	Ended     bool
	Action    string
	QuestSlug string
	OpenShop  bool
}

func (m *Manager) Select(accountID string, nextNode string, choiceIdx int) SelectResult {
	m.mu.Lock()
	defer m.mu.Unlock()
	sess := m.sessions[accountID]
	if sess == nil {
		return SelectResult{Ended: true}
	}
	tree := m.trees[sess.TreeID]
	if tree == nil {
		delete(m.sessions, accountID)
		return SelectResult{Ended: true}
	}
	cur := tree.Nodes[sess.NodeID]
	var choice *Choice
	if nextNode != "" {
		for i := range cur.Choices {
			if cur.Choices[i].Next == nextNode || cur.Choices[i].Label == nextNode {
				choice = &cur.Choices[i]
				break
			}
		}
		if choice == nil {
			if n, ok := tree.Nodes[nextNode]; ok {
				sess.NodeID = n.ID
				cp := n
				return SelectResult{Node: &cp}
			}
		}
	} else if choiceIdx >= 0 && choiceIdx < len(cur.Choices) {
		choice = &cur.Choices[choiceIdx]
	}
	if choice == nil {
		delete(m.sessions, accountID)
		return SelectResult{Ended: true}
	}
	res := SelectResult{Action: choice.Action, QuestSlug: choice.QuestSlug}
	if choice.Action == "end" {
		delete(m.sessions, accountID)
		res.Ended = true
		return res
	}
	if choice.Action == "open_shop" {
		delete(m.sessions, accountID)
		res.Ended = true
		res.OpenShop = true
		return res
	}
	if choice.Next == "" {
		delete(m.sessions, accountID)
		res.Ended = true
		return res
	}
	n, ok := tree.Nodes[choice.Next]
	if !ok {
		delete(m.sessions, accountID)
		res.Ended = true
		return res
	}
	sess.NodeID = n.ID
	cp := n
	res.Node = &cp
	return res
}

func (m *Manager) End(accountID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, accountID)
}

func (m *Manager) TreeCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.trees)
}
