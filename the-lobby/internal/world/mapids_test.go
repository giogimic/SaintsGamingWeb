package world_test

import (
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
)

func TestToBaseMapID(t *testing.T) {
	cases := map[string]string{
		"STARTING_MEADOW_ch1": "STARTING_MEADOW",
		"STARTING_MEADOW_ch12": "STARTING_MEADOW",
		"STARTING_MEADOW":     "STARTING_MEADOW",
		"studio_pie_abc":   "studio_pie_abc",
		"STARTING_MEADOW_user1": "STARTING_MEADOW_user1",
		"":                 "",
	}
	for in, want := range cases {
		if got := world.ToBaseMapID(in); got != want {
			t.Fatalf("ToBaseMapID(%q)=%q want %q", in, got, want)
		}
	}
}

func TestPickPublicShard(t *testing.T) {
	pick := world.PickPublicShardAssignment("STARTING_MEADOW", nil, 50)
	if pick.Action != "create" || pick.InstanceID != "STARTING_MEADOW_ch1" {
		t.Fatalf("empty pick: %+v", pick)
	}

	cands := []world.PublicShardCandidate{
		{InstanceID: "STARTING_MEADOW_ch1", MapID: "STARTING_MEADOW", PlayerCount: 50},
		{InstanceID: "STARTING_MEADOW_ch2", MapID: "STARTING_MEADOW", PlayerCount: 3},
	}
	pick = world.PickPublicShardAssignment("STARTING_MEADOW", cands, 50)
	if pick.Action != "join" || pick.InstanceID != "STARTING_MEADOW_ch2" {
		t.Fatalf("join pick: %+v", pick)
	}

	full := []world.PublicShardCandidate{
		{InstanceID: "STARTING_MEADOW_ch1", MapID: "STARTING_MEADOW", PlayerCount: 50},
		{InstanceID: "STARTING_MEADOW_ch2", MapID: "STARTING_MEADOW", PlayerCount: 50},
	}
	pick = world.PickPublicShardAssignment("STARTING_MEADOW", full, 50)
	if pick.Action != "create" || pick.InstanceID != "STARTING_MEADOW_ch3" {
		t.Fatalf("create pick: %+v", pick)
	}
}

func TestJoinMapLobbyShards(t *testing.T) {
	m := world.NewManager(2)
	m.ApplyReleaseMaps(&world.ReleaseManifest{
		World: struct {
			Name     string  `json:"name"`
			SpawnMap string  `json:"spawnMap"`
			SpawnX   float64 `json:"spawnX"`
			SpawnY   float64 `json:"spawnY"`
			SpawnZ   float64 `json:"spawnZ"`
		}{
			SpawnMap: "STARTING_MEADOW",
		},
		Maps: []world.ReleaseMap{
			{ID: "STARTING_MEADOW"},
		},
	})
	m.EnsureDemoDef()
	a, err := m.JoinMap("STARTING_MEADOW", "acc1", false, false)
	if err != nil {
		t.Fatal(err)
	}
	if a.InstanceID != "STARTING_MEADOW_ch1" {
		t.Fatalf("first shard %s", a.InstanceID)
	}
	b, _ := m.JoinMap("STARTING_MEADOW", "acc2", false, false)
	if b.InstanceID != "STARTING_MEADOW_ch1" {
		t.Fatalf("second should share shard, got %s", b.InstanceID)
	}
	c, _ := m.JoinMap("STARTING_MEADOW", "acc3", false, false)
	if c.InstanceID != "STARTING_MEADOW_ch2" {
		t.Fatalf("third should spill to ch2, got %s", c.InstanceID)
	}
}
