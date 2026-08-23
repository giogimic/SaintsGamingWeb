package world

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
)

var (
	rePublicChannel = regexp.MustCompile(`^(.*)_ch(\d+)$`)
)

// ToBaseMapID strips _chN public shard suffixes only.
func ToBaseMapID(mapOrInstanceID string) string {
	if mapOrInstanceID == "" {
		return protocol.DemoMapID
	}
	if m := rePublicChannel.FindStringSubmatch(mapOrInstanceID); len(m) == 3 {
		return m[1]
	}
	return mapOrInstanceID
}

func IsPublicChannel(instanceID string) bool {
	return rePublicChannel.MatchString(instanceID)
}

func IsStudioPIE(instanceID string) bool {
	return strings.HasPrefix(instanceID, "studio_pie_")
}

func ResolvePlayableBase(mapID string, lobby, forceDemo bool) string {
	base := ToBaseMapID(mapID)
	if lobby || forceDemo || base == "" || base == protocol.RetiredVillage {
		return protocol.DemoMapID
	}
	return base
}

// PublicShardCandidate is one live public shard for assignment.
type PublicShardCandidate struct {
	InstanceID  string
	MapID       string
	PlayerCount int
}

type PublicShardPick struct {
	Action     string // "join" | "create"
	InstanceID string
	ShardNum   int
}

// PickPublicShardAssignment mirrors TS pickPublicShardAssignment.
func PickPublicShardAssignment(baseMapID string, instances []PublicShardCandidate, maxPlayers int) PublicShardPick {
	maxShard := 0
	var available *PublicShardCandidate
	for i := range instances {
		inst := &instances[i]
		if inst.MapID != baseMapID || !IsPublicChannel(inst.InstanceID) {
			continue
		}
		if m := rePublicChannel.FindStringSubmatch(inst.InstanceID); len(m) == 3 {
			if n, err := strconv.Atoi(m[2]); err == nil && n > maxShard {
				maxShard = n
			}
		}
		if available == nil && inst.PlayerCount < maxPlayers {
			available = inst
		}
	}
	if available != nil {
		return PublicShardPick{Action: "join", InstanceID: available.InstanceID}
	}
	next := maxShard + 1
	if next < 1 {
		next = 1
	}
	return PublicShardPick{
		Action:     "create",
		InstanceID: fmt.Sprintf("%s_ch%d", baseMapID, next),
		ShardNum:   next,
	}
}

// PrivateInstanceID for author/studio private room.
func PrivateInstanceID(baseMapID, accountID string) string {
	safe := sanitizeID(accountID)
	return fmt.Sprintf("%s_%s", baseMapID, safe)
}

// PIEInstanceID for Studio Play-In-Editor.
func PIEInstanceID(accountID string) string {
	return "studio_pie_" + sanitizeID(accountID)
}

func sanitizeID(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_':
			b.WriteRune(r)
		default:
			b.WriteByte('_')
		}
	}
	out := b.String()
	if out == "" {
		return "anon"
	}
	return out
}
