package skill_test

import (
	"path/filepath"
	"testing"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/db"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/skill"
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
	playerGrants := skill.CombatGrants("player", 3)
	if len(playerGrants) != 4 {
		t.Errorf("expected 4 grants for player win, got %d", len(playerGrants))
	}
	expectedPlayer := map[string]int{"attack": 30, "strength": 19, "hitpoints": 11, "defence": 11}
	for _, g := range playerGrants {
		if expectedPlayer[g.Skill] != g.XP {
			t.Errorf("expected %d xp for %s, got %d", expectedPlayer[g.Skill], g.Skill, g.XP)
		}
	}

	fleeGrants := skill.CombatGrants("flee", 3)
	if len(fleeGrants) != 1 || fleeGrants[0].Skill != "agility" || fleeGrants[0].XP != 5 {
		t.Errorf("expected agility grant for fleeing, got %v", fleeGrants)
	}

	loseGrants := skill.CombatGrants("lose", 3)
	if len(loseGrants) != 2 {
		t.Errorf("expected 2 grants for lose, got %d", len(loseGrants))
	}
}

func TestSkillValidation(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sk.db")
	sqlDB, err := db.OpenSQLite("file:" + path)
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	m := skill.NewManager(sqlDB)
	
	// Valid skill should add XP
	m.Add("a1", "mining", 50)
	snap := m.Snapshot("a1")
	if snap["mining"] != 50 {
		t.Fatalf("expected 50 mining xp, got %d", snap["mining"])
	}
	
	// Invalid arbitrary slug should be rejected and NOT saved
	m.Add("a1", "hacker", 99999)
	snap2 := m.Snapshot("a1")
	if _, exists := snap2["hacker"]; exists {
		t.Fatal("expected invalid skill 'hacker' to be rejected")
	}
}
