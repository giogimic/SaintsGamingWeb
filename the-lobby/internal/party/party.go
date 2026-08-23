package party

import "sync"

// Party is a simple in-memory party group.
type Party struct {
	LeaderID string
	Members  []string
}

// Manager tracks parties by leader account.
type Manager struct {
	mu      sync.RWMutex
	byLead  map[string]*Party
	byMember map[string]string // member -> leader
	invites map[string]string  // invitee -> leader
}

func NewManager() *Manager {
	return &Manager{
		byLead:   make(map[string]*Party),
		byMember: make(map[string]string),
		invites:  make(map[string]string),
	}
}

func (m *Manager) Invite(leader, target string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.invites[target] = leader
}

func (m *Manager) Accept(target string) *Party {
	m.mu.Lock()
	defer m.mu.Unlock()
	leader, ok := m.invites[target]
	if !ok {
		return nil
	}
	delete(m.invites, target)
	p, ok := m.byLead[leader]
	if !ok {
		p = &Party{LeaderID: leader, Members: []string{leader}}
		m.byLead[leader] = p
		m.byMember[leader] = leader
	}
	p.Members = append(p.Members, target)
	m.byMember[target] = leader
	return p
}

func (m *Manager) Decline(target string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.invites, target)
}

func (m *Manager) Leave(accountID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	leader, ok := m.byMember[accountID]
	if !ok {
		return
	}
	delete(m.byMember, accountID)
	p := m.byLead[leader]
	if p == nil {
		return
	}
	filtered := p.Members[:0]
	for _, id := range p.Members {
		if id != accountID {
			filtered = append(filtered, id)
		}
	}
	p.Members = filtered
	if accountID == leader || len(p.Members) == 0 {
		for _, id := range p.Members {
			delete(m.byMember, id)
		}
		delete(m.byLead, leader)
	}
}

func (m *Manager) Get(accountID string) *Party {
	m.mu.RLock()
	defer m.mu.RUnlock()
	leader := m.byMember[accountID]
	if leader == "" {
		return nil
	}
	return m.byLead[leader]
}
