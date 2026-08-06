package dialogue

import "sync"

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
	Action    string `json:"action,omitempty"` // end | accept_quest | complete_quest
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

// Manager holds demo dialogue trees (Saints Trail welcome + shop).
type Manager struct {
	mu       sync.RWMutex
	trees    map[string]*Tree
	sessions map[string]*Session // account -> session
}

func NewManager() *Manager {
	m := &Manager{
		trees:    make(map[string]*Tree),
		sessions: make(map[string]*Session),
	}
	m.seed()
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

// Select advances by choice index or next node id.
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
	n := tree.Nodes[choice.Next]
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
