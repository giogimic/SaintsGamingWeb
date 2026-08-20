package player

import (
	"database/sql"
	"fmt"
	"sync"
	"time"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/persist"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
)

const (
	MoveCooldownMS = 150
	InputQueueMax  = 2
	IdleClearMS    = 300
)

// State is hot player simulation state.
type State struct {
	EntityID    string
	AccountID   string
	CharacterID string
	SocketID    string
	Name        string
	SpriteID    string
	MapID       string // live instance id
	BaseMapID   string
	X, Y        float64
	ZoneX, ZoneY int
	Direction   string
	IsMoving    bool
	LastMoveAt  time.Time
	HP, MaxHP   int
	IsLocked    bool
	Credits     int
	InputQueue  []protocol.PlayerInput
	Dirty       bool
	LastSeq     int64
}

// Manager tracks connected players keyed by account + socket.
type Manager struct {
	mu          sync.RWMutex
	byAccount   map[string]*State
	bySocket    map[string]*State
	byCharacter map[string]*State
	occupied    map[string]map[string]string // instanceID -> "x,y" -> accountID
	aoiZoneSize int
	store       *persist.Store
}

func NewManager(aoiZoneSize int, db *sql.DB) *Manager {
	if aoiZoneSize <= 0 {
		aoiZoneSize = 16
	}
	var store *persist.Store
	if db != nil {
		store = &persist.Store{DB: db}
	}
	return &Manager{
		byAccount:   make(map[string]*State),
		bySocket:    make(map[string]*State),
		byCharacter: make(map[string]*State),
		occupied:    make(map[string]map[string]string),
		aoiZoneSize: aoiZoneSize,
		store:       store,
	}
}

// LoadHot returns last saved overworld seat for an account (if any).
func (m *Manager) LoadHot(accountID string) persist.PlayerHot {
	if m.store == nil {
		return persist.PlayerHot{}
	}
	return m.store.LoadPlayer(accountID)
}

func (m *Manager) persistLocked(p *State) {
	if m.store == nil || p == nil {
		return
	}
	m.store.SavePlayer(p.AccountID, p.BaseMapID, p.X, p.Y, p.Credits)
}

func (m *Manager) ZoneSize() int { return m.aoiZoneSize }

func (m *Manager) GetByAccount(accountID string) *State {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.byAccount[accountID]
}

func (m *Manager) GetBySocket(socketID string) *State {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.bySocket[socketID]
}

func (m *Manager) GetByCharacter(characterID string) *State {
	if characterID == "" {
		return nil
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.byCharacter[characterID]
}

func (m *Manager) SocketIDForAccount(accountID string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p := m.byAccount[accountID]; p != nil {
		return p.SocketID
	}
	return ""
}

func (m *Manager) ForEach(fn func(*State)) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, p := range m.byAccount {
		if p != nil {
			fn(p)
		}
	}
}

// Create registers a new seat. Caller handles session_replaced for prior socket.
func (m *Manager) Create(accountID, socketID, name, spriteID, instanceID, baseMapID string, x, y float64) *State {
	return m.CreateWithCharacter(accountID, "", socketID, name, spriteID, instanceID, baseMapID, x, y)
}

// CreateWithCharacter registers a new seat with explicit character ownership.
func (m *Manager) CreateWithCharacter(accountID, characterID, socketID, name, spriteID, instanceID, baseMapID string, x, y float64) *State {
	m.mu.Lock()
	defer m.mu.Unlock()

	if name == "" {
		name = "Traveler"
	}
	if spriteID == "" {
		spriteID = "player_default"
	}
	p := &State{
		EntityID:    fmt.Sprintf("player_%s_%d", accountID, time.Now().UnixMilli()),
		AccountID:   accountID,
		CharacterID: characterID,
		SocketID:    socketID,
		Name:        name,
		SpriteID:    spriteID,
		MapID:       instanceID,
		BaseMapID:   baseMapID,
		X:           x,
		Y:           y,
		Direction:   "down",
		HP:          100,
		MaxHP:       100,
		Credits:     100,
	}
	p.ZoneX, p.ZoneY = ZoneOf(x, y, m.aoiZoneSize)
	m.byAccount[accountID] = p
	m.bySocket[socketID] = p
	if characterID != "" {
		m.byCharacter[characterID] = p
	}
	m.setOccupiedLocked(instanceID, int(x), int(y), accountID)
	return p
}

// UpdateSocket smoothly switches the socket association without tearing down the player state.
func (m *Manager) UpdateSocket(accountID, newSocketID string) *State {
	m.mu.Lock()
	defer m.mu.Unlock()
	p := m.byAccount[accountID]
	if p == nil {
		return nil
	}
	oldSocket := p.SocketID
	if oldSocket != "" && oldSocket != newSocketID {
		delete(m.bySocket, oldSocket)
	}
	p.SocketID = newSocketID
	m.bySocket[newSocketID] = p
	return p
}

func (m *Manager) Remove(socketID string) *State {
	m.mu.Lock()
	defer m.mu.Unlock()
	p := m.bySocket[socketID]
	if p == nil {
		return nil
	}
	m.persistLocked(p)
	delete(m.bySocket, socketID)
	if cur := m.byAccount[p.AccountID]; cur != nil && cur.SocketID == socketID {
		delete(m.byAccount, p.AccountID)
	}
	if p.CharacterID != "" {
		if cur := m.byCharacter[p.CharacterID]; cur != nil && cur.SocketID == socketID {
			delete(m.byCharacter, p.CharacterID)
		}
	}
	m.clearOccupiedLocked(p.MapID, int(p.X), int(p.Y), p.AccountID)
	return p
}

func (m *Manager) EnqueueInput(accountID string, in protocol.PlayerInput) {
	m.mu.Lock()
	defer m.mu.Unlock()
	p := m.byAccount[accountID]
	if p == nil || p.IsLocked {
		return
	}
	if len(p.InputQueue) >= InputQueueMax {
		p.InputQueue = p.InputQueue[1:]
	}
	p.InputQueue = append(p.InputQueue, in)
}

func (m *Manager) SnapshotPeers(instanceID, excludeAccount string) map[string]protocol.PeerSnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make(map[string]protocol.PeerSnapshot)
	for _, p := range m.byAccount {
		if p.MapID != instanceID || p.AccountID == excludeAccount {
			continue
		}
		out[p.SocketID] = protocol.PeerSnapshot{
			SocketID:  p.SocketID,
			EntityID:  p.EntityID,
			X:         p.X,
			Y:         p.Y,
			Direction: p.Direction,
			Name:      p.Name,
			SpriteID:  p.SpriteID,
			IsMoving:  p.IsMoving,
		}
	}
	return out
}

func (m *Manager) ListOnInstance(instanceID string) []*State {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*State, 0)
	for _, p := range m.byAccount {
		if p.MapID == instanceID {
			cp := *p
			out = append(out, &cp)
		}
	}
	return out
}

func (m *Manager) IsOccupied(instanceID string, x, y int, exceptAccount string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	cells, ok := m.occupied[instanceID]
	if !ok {
		return false
	}
	owner, ok := cells[cellKey(x, y)]
	if !ok {
		return false
	}
	return owner != exceptAccount
}

func (m *Manager) setOccupiedLocked(instanceID string, x, y int, accountID string) {
	cells, ok := m.occupied[instanceID]
	if !ok {
		cells = make(map[string]string)
		m.occupied[instanceID] = cells
	}
	cells[cellKey(x, y)] = accountID
}

func (m *Manager) clearOccupiedLocked(instanceID string, x, y int, accountID string) {
	cells, ok := m.occupied[instanceID]
	if !ok {
		return
	}
	k := cellKey(x, y)
	if cells[k] == accountID {
		delete(cells, k)
	}
}

func cellKey(x, y int) string {
	return fmt.Sprintf("%d,%d", x, y)
}

func ZoneOf(x, y float64, zoneSize int) (zx, zy int) {
	if zoneSize <= 0 {
		zoneSize = 16
	}
	return int(x) / zoneSize, int(y) / zoneSize
}

// ApplyMove updates position under lock. Returns false if blocked by occupancy.
func (m *Manager) ApplyMove(accountID string, nx, ny float64, dir string, seq int64) (*State, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	p := m.byAccount[accountID]
	if p == nil {
		return nil, false
	}
	ix, iy := int(nx), int(ny)
	if m.isOccupiedLocked(p.MapID, ix, iy, accountID) {
		return p, false
	}
	m.clearOccupiedLocked(p.MapID, int(p.X), int(p.Y), accountID)
	p.X, p.Y = nx, ny
	p.Direction = dir
	p.IsMoving = true
	p.LastMoveAt = time.Now()
	p.LastSeq = seq
	p.Dirty = true
	p.ZoneX, p.ZoneY = ZoneOf(nx, ny, m.aoiZoneSize)
	m.setOccupiedLocked(p.MapID, ix, iy, accountID)
	return p, true
}

func (m *Manager) isOccupiedLocked(instanceID string, x, y int, exceptAccount string) bool {
	cells, ok := m.occupied[instanceID]
	if !ok {
		return false
	}
	owner, ok := cells[cellKey(x, y)]
	if !ok {
		return false
	}
	return owner != exceptAccount
}

// DrainDirty returns and clears dirty players for net broadcast.
func (m *Manager) DrainDirty() []*State {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*State, 0)
	now := time.Now()
	for _, p := range m.byAccount {
		if p.IsMoving && now.Sub(p.LastMoveAt) > IdleClearMS*time.Millisecond {
			p.IsMoving = false
			p.Dirty = true
		}
		if p.Dirty {
			cp := *p
			out = append(out, &cp)
			p.Dirty = false
		}
	}
	return out
}

// TakeInputs drains one input per player for the sim tick.
func (m *Manager) TakeInputs() map[string]protocol.PlayerInput {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make(map[string]protocol.PlayerInput)
	for id, p := range m.byAccount {
		if len(p.InputQueue) == 0 {
			continue
		}
		in := p.InputQueue[0]
		p.InputQueue = p.InputQueue[1:]
		out[id] = in
	}
	return out
}

func (p *State) Peer() protocol.PeerSnapshot {
	return protocol.PeerSnapshot{
		SocketID:  p.SocketID,
		EntityID:  p.EntityID,
		AccountID: p.AccountID,
		X:         p.X,
		Y:         p.Y,
		Direction: p.Direction,
		Name:      p.Name,
		SpriteID:  p.SpriteID,
		IsMoving:  p.IsMoving,
	}
}
