package skill_test

import (
	"path/filepath"
	"testing"

	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/db"
	"github.com/giogimic/SaintsGamingWeb/go-mmo/internal/skill"
)

func TestCombatLevelCurve(t *testing.T) {
	if skill.CombatLevelFromXP(0) != 1 {
		t.Fatal(skill.CombatLevelFromXP(0))
	}
	if skill.CombatLevelFromXP(50) != 2 {
		t.Fatal(skill.CombatLevelFromXP(50))
	}
	if skill.LevelFor("attack", 50) != 2 {
		t.Fatal(skill.LevelFor("attack", 50))
	}
}

func TestSkillPersist(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sk.db")
	sqlDB, err := db.OpenSQLite("file:" + path)
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	m := skill.NewManager(sqlDB)
	m.Add("a1", "combat", 25) // alias → attack
	m2 := skill.NewManager(sqlDB)
	snap := m2.Snapshot("a1")
	if snap["attack"] != 25 {
		t.Fatalf("%v", snap)
	}
	if m2.Levels("a1")["attack"] < 1 {
		t.Fatal(m2.Levels("a1"))
	}
}

func TestCombatGrants(t *testing.T) {
	playerGrants := skill.CombatGrants("player")
	if len(playerGrants) != 4 {
		t.Errorf("expected 4 grants for player win, got %d", len(playerGrants))
	}
	expectedPlayer := map[string]int{"attack": 25, "strength": 15, "hitpoints": 10, "defence": 8}
	for _, g := range playerGrants {
		if expectedPlayer[g.Skill] != g.XP {
			t.Errorf("expected %d xp for %s, got %d", expectedPlayer[g.Skill], g.Skill, g.XP)
		}
	}

	fleeGrants := skill.CombatGrants("flee")
	if len(fleeGrants) != 1 || fleeGrants[0].Skill != "agility" || fleeGrants[0].XP != 5 {
		t.Errorf("expected agility grant for fleeing, got %v", fleeGrants)
	}

	loseGrants := skill.CombatGrants("lose")
	if len(loseGrants) != 2 {
		t.Errorf("expected 2 grants for lose, got %d", len(loseGrants))
	}
}
