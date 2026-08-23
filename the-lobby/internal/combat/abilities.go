package combat

type AbilityCategory string

const (
	Physical AbilityCategory = "physical"
	Special  AbilityCategory = "special"
	Utility  AbilityCategory = "utility"
	Heal     AbilityCategory = "heal"
	Buff     AbilityCategory = "buff"
)

type ElementType string

const (
	Solar ElementType = "Solar"
	Hydro ElementType = "Hydro"
	Bio   ElementType = "Bio"
	Volt  ElementType = "Volt"
	Geo   ElementType = "Geo"
	Cryo  ElementType = "Cryo"
	Aero  ElementType = "Aero"
	Cyber ElementType = "Cyber"
	None  ElementType = "None"
)

type CombatAbility struct {
	ID         string
	Name       string
	Power      int
	Category   AbilityCategory
	CooldownMs int
	RangeTiles int
	Element    ElementType
}

var abilities = map[string]CombatAbility{
	"strike":    {ID: "strike", Name: "Strike", Power: 40, Category: Physical, CooldownMs: 1500, RangeTiles: 1, Element: None},
	"cleave":    {ID: "cleave", Name: "Cleave", Power: 55, Category: Physical, CooldownMs: 4000, RangeTiles: 1, Element: None},
	"dash":      {ID: "dash", Name: "Dash", Power: 0, Category: Utility, CooldownMs: 8000, RangeTiles: 3, Element: None},
	"shout":     {ID: "shout", Name: "War Cry", Power: 0, Category: Buff, CooldownMs: 12000, RangeTiles: 0, Element: None},
	"fireball":  {ID: "fireball", Name: "Fireball", Power: 50, Category: Special, CooldownMs: 2000, RangeTiles: 6, Element: Solar},
	"frost":     {ID: "frost", Name: "Frost Nova", Power: 45, Category: Special, CooldownMs: 6000, RangeTiles: 3, Element: Cryo},
	"blink":     {ID: "blink", Name: "Blink", Power: 0, Category: Utility, CooldownMs: 8000, RangeTiles: 0, Element: Cyber},
	"shield":    {ID: "shield", Name: "Mana Shield", Power: 0, Category: Buff, CooldownMs: 15000, RangeTiles: 0, Element: Volt},
	"shoot":     {ID: "shoot", Name: "Shoot", Power: 35, Category: Physical, CooldownMs: 1200, RangeTiles: 7, Element: None},
	"multishot": {ID: "multishot", Name: "Volley", Power: 30, Category: Physical, CooldownMs: 5000, RangeTiles: 7, Element: None},
	"trap":      {ID: "trap", Name: "Snare", Power: 10, Category: Utility, CooldownMs: 10000, RangeTiles: 5, Element: Geo},
	"heal":      {ID: "heal", Name: "Bandage", Power: 0, Category: Heal, CooldownMs: 20000, RangeTiles: 0, Element: Bio},
}

func GetCombatAbility(id string) *CombatAbility {
	if id == "" {
		id = "strike"
	}
	if a, ok := abilities[id]; ok {
		return &a
	}
	return nil
}

type Matchup struct {
	StrongAgainst []ElementType
	WeakAgainst   []ElementType
}

var matchups = map[ElementType]Matchup{
	Solar: {StrongAgainst: []ElementType{Bio, Cryo}, WeakAgainst: []ElementType{Hydro, Cyber}},
	Hydro: {StrongAgainst: []ElementType{Solar, Geo}, WeakAgainst: []ElementType{Volt, Bio}},
	Bio:   {StrongAgainst: []ElementType{Geo, Volt}, WeakAgainst: []ElementType{Solar, Cryo}},
	Volt:  {StrongAgainst: []ElementType{Hydro, Aero}, WeakAgainst: []ElementType{Geo, Cyber}},
	Geo:   {StrongAgainst: []ElementType{Volt, Cryo}, WeakAgainst: []ElementType{Hydro, Bio}},
	Cryo:  {StrongAgainst: []ElementType{Bio, Aero}, WeakAgainst: []ElementType{Solar, Geo}},
	Aero:  {StrongAgainst: []ElementType{Bio, Solar}, WeakAgainst: []ElementType{Volt, Cryo}},
	Cyber: {StrongAgainst: []ElementType{Solar, Hydro, Volt}, WeakAgainst: []ElementType{Bio, Geo}},
	None:  {StrongAgainst: []ElementType{}, WeakAgainst: []ElementType{}},
}

func contains(slice []ElementType, item ElementType) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func GetCombatMultiplier(attacker ElementType, defender ElementType) float64 {
	if attacker == None || defender == None {
		return 1.0
	}
	if attacker == defender {
		return 1.0
	}

	matchup, ok := matchups[attacker]
	if !ok {
		return 1.0
	}

	if contains(matchup.StrongAgainst, defender) {
		return 1.5
	}
	if contains(matchup.WeakAgainst, defender) {
		return 0.5
	}
	return 1.0
}
