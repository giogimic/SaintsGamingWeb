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
