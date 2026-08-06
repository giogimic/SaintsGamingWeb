package world_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/world"
)

func TestToBaseMapID(t *testing.T) {
	cases := map[string]string{
		"DEMO_SANDBOX_ch1": "DEMO_SANDBOX",
		"DEMO_SANDBOX_ch12": "DEMO_SANDBOX",
		"DEMO_SANDBOX":     "DEMO_SANDBOX",
		"studio_pie_abc":   "studio_pie_abc",
		"DEMO_SANDBOX_user1": "DEMO_SANDBOX_user1",
		"":                 protocol.DemoMapID,
	}
	for in, want := range cases {
		if got := world.ToBaseMapID(in); got != want {
			t.Fatalf("ToBaseMapID(%q)=%q want %q", in, got, want)
		}
	}
}

func TestPickPublicShard(t *testing.T) {
	pick := world.PickPublicShardAssignment("DEMO_SANDBOX", nil, 50)
	if pick.Action != "create" || pick.InstanceID != "DEMO_SANDBOX_ch1" {
		t.Fatalf("empty pick: %+v", pick)
	}

	cands := []world.PublicShardCandidate{
		{InstanceID: "DEMO_SANDBOX_ch1", MapID: "DEMO_SANDBOX", PlayerCount: 50},
		{InstanceID: "DEMO_SANDBOX_ch2", MapID: "DEMO_SANDBOX", PlayerCount: 3},
	}
	pick = world.PickPublicShardAssignment("DEMO_SANDBOX", cands, 50)
	if pick.Action != "join" || pick.InstanceID != "DEMO_SANDBOX_ch2" {
		t.Fatalf("join pick: %+v", pick)
	}

	full := []world.PublicShardCandidate{
		{InstanceID: "DEMO_SANDBOX_ch1", MapID: "DEMO_SANDBOX", PlayerCount: 50},
		{InstanceID: "DEMO_SANDBOX_ch2", MapID: "DEMO_SANDBOX", PlayerCount: 50},
	}
	pick = world.PickPublicShardAssignment("DEMO_SANDBOX", full, 50)
	if pick.Action != "create" || pick.InstanceID != "DEMO_SANDBOX_ch3" {
		t.Fatalf("create pick: %+v", pick)
	}
}

func TestJoinMapLobbyShards(t *testing.T) {
	m := world.NewManager(2)
	m.EnsureDemoDef()
	a, err := m.JoinMap(protocol.DemoMapID, "acc1", false, false)
	if err != nil {
		t.Fatal(err)
	}
	if a.InstanceID != "DEMO_SANDBOX_ch1" {
		t.Fatalf("first shard %s", a.InstanceID)
	}
	b, _ := m.JoinMap(protocol.DemoMapID, "acc2", false, false)
	if b.InstanceID != "DEMO_SANDBOX_ch1" {
		t.Fatalf("second should share shard, got %s", b.InstanceID)
	}
	c, _ := m.JoinMap(protocol.DemoMapID, "acc3", false, false)
	if c.InstanceID != "DEMO_SANDBOX_ch2" {
		t.Fatalf("third should spill to ch2, got %s", c.InstanceID)
	}
}

func TestWalkability(t *testing.T) {
	m := world.NewManager(50)
	def := m.EnsureDemoDef()
	if !m.IsWalkable(def.ID, protocol.DefaultSpawnX, protocol.DefaultSpawnY) {
		t.Fatal("spawn should be walkable")
	}
	if m.IsWalkable(def.ID, 0, 0) {
		t.Fatal("border wall should block")
	}
}

func TestResolvePlayableBase(t *testing.T) {
	if got := world.ResolvePlayableBase("ANY", true, false); got != protocol.DemoMapID {
		t.Fatal(got)
	}
	if got := world.ResolvePlayableBase(protocol.RetiredVillage, false, false); got != protocol.DemoMapID {
		t.Fatal(got)
	}
	if got := world.ResolvePlayableBase("CUSTOM_MAP", false, false); got != "CUSTOM_MAP" {
		t.Fatal(got)
	}
}
