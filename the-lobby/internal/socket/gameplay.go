package socket

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/creature"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/protocol"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/shop"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/skill"
	"github.com/giogimic/SaintsGamingWeb/the-lobby/internal/world"
	"github.com/zishang520/socket.io/v2/socket"
)

func (h *Hub) registerGameplay(client *socket.Socket, accountID, sid string) {
	client.On(protocol.EvBattleSubmit, func(datas ...any) {
		h.handleBattleSubmit(accountID, datas)
	})
	client.On(protocol.EvAdminSaveMap, func(datas ...any) {
		h.handleAdminSaveMap(accountID, datas)
	})
	client.On(protocol.EvAdminReloadMap, func(datas ...any) {
		h.handleAdminReloadMap(accountID, datas)
	})
	client.On(protocol.EvAdminReloadContent, func(datas ...any) {
		h.handleAdminReloadContent(accountID, datas)
	})
	client.On(protocol.EvStudioSpawnNPC, func(datas ...any) {
		h.handleStudioSpawnNPC(accountID, datas)
	})
	client.On(protocol.EvStudioDespawnNPC, func(datas ...any) {
		h.handleStudioDespawnNPC(accountID, datas)
	})
	client.On(protocol.EvStudioLock, func(datas ...any) {
		if len(datas) > 0 {
			h.broadcastAll(protocol.EvStudioLock, datas[0])
		}
	})
	client.On(protocol.EvStudioUnlock, func(datas ...any) {
		if len(datas) > 0 {
			h.broadcastAll(protocol.EvStudioUnlock, datas[0])
		}
	})
	client.On(protocol.EvStudioPresence, func(datas ...any) {
		if len(datas) > 0 {
			h.broadcastAll(protocol.EvStudioPresence, datas[0])
		}
	})
	client.On(protocol.EvGatherInteract, func(datas ...any) {
		h.handleGather(accountID, datas)
	})
	client.On(protocol.EvPickupLoot, func(datas ...any) {
		h.handlePickupLoot(accountID, datas)
	})
	client.On(protocol.EvCraftItem, func(datas ...any) {
		h.handleCraft(accountID, datas)
	})
	client.On(protocol.EvGTCCreateListing, func(datas ...any) {
		h.handleGTCCreate(accountID, datas)
	})
	client.On(protocol.EvGTCPurchaseListing, func(datas ...any) {
		h.handleGTCPurchase(accountID, datas)
	})
	client.On(protocol.EvPartyChat, func(datas ...any) {
		msg := asString(datas, 0)
		if p := h.deps.Parties.Get(accountID); p != nil {
			for _, mid := range p.Members {
				if st := h.eng.Players().GetByAccount(mid); st != nil {
					h.EmitToSocket(st.SocketID, protocol.EvPlayerChat, map[string]any{
						"accountId": accountID, "message": msg, "channel": "party",
					})
				}
			}
		}
	})
	client.On(protocol.EvStaffAnnounce, func(datas ...any) {
		h.broadcastAll(protocol.EvShowToast, map[string]string{"message": asString(datas, 0), "kind": "announce"})
	})
	client.On(protocol.EvStaffKick, func(datas ...any) {
		target := asString(datas, 0)
		if s := h.getSocket(target); s != nil {
			h.EmitToSocket(target, protocol.EvShowToast, map[string]string{"message": "kicked by staff"})
			s.Disconnect(true)
		}
	})
	client.On(protocol.EvCombatCast, func(datas ...any) {
		targetID := ""
		abilityID := "strike"
		if len(datas) > 0 {
			b, _ := json.Marshal(datas[0])
			var m map[string]any
			if json.Unmarshal(b, &m) == nil {
				if t, ok := m["targetId"].(string); ok {
					targetID = t
				}
				if a, ok := m["abilityId"].(string); ok {
					abilityID = a
				}
			}
		}
		h.handleAttack(accountID, targetID, abilityID)
	})
}

func (h *Hub) handleBattleSubmit(accountID string, datas []any) {
	action := "attack"
	moveId := "strike"
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if a, ok := m["action"].(string); ok {
				action = a
			}
			if a, ok := m["type"].(string); ok {
				action = a
			}
			if a, ok := m["moveId"].(string); ok {
				moveId = a
			}
		}
	}
	p := h.eng.Players().GetByAccount(accountID)
	if p == nil {
		return
	}
	sess := h.deps.Combat.GetByPlayer(accountID)
	if sess == nil {
		// Start TB vs a fresh spawn
		cre := h.eng.Creatures().Spawn(p.MapID, creature.Entity{
			Species: "brushpup", Name: "Brushpup", X: p.X + 1, Y: p.Y,
			Sprite: "brushpup", Hostile: true, Level: 3, MaxHP: 45,
		})
		sess = h.deps.Combat.StartTB(accountID, "warrior", cre.ID, cre.Species, p.MapID, p.HP, cre.HP, 5, cre.Level)
		h.EmitToSocket(p.SocketID, protocol.EvBattleStarted, map[string]any{
			"combatId": sess.ID, "mode": "tb", "creatureId": cre.ID, "hp": cre.HP, "maxHp": cre.MaxHP,
		})
	}
	sess = h.deps.Combat.SubmitTB(accountID, strings.ToLower(action), strings.ToLower(moveId))
	h.EmitToSocket(p.SocketID, protocol.EvBattleUpdate, map[string]any{
		"combatId": sess.ID, "playerHp": sess.PlayerHP, "creatureHp": sess.CreatureHP,
		"turn": sess.Turn, "ended": sess.Ended, "winner": sess.Winner, "mode": "tb",
		"damage": sess.LastDamage, "crit": sess.LastCrit,
	})
	if sess.Ended {
		h.finishCombat(accountID, p.SocketID, p.MapID, sess.CreatureID, sess.Winner)
	}
}

func (h *Hub) finishCombat(accountID, sid, instanceID, creatureID, winner string) {
	h.EmitToSocket(sid, protocol.EvBattleEnded, map[string]any{"winner": winner})
	if winner == "player" {
		h.eng.Creatures().Despawn(instanceID, creatureID)
		h.EmitToRoom(instanceID, protocol.EvCreatureDespawned, map[string]string{"id": creatureID})
		items := h.deps.Inventory.AddItem(accountID, "loot_scrap", "Scrap", 1)
		h.deps.Inventory.AddCredits(accountID, 15)
		h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": items})
		h.EmitToSocket(sid, protocol.EvSyncCredits, map[string]any{"credits": h.deps.Inventory.Credits(accountID)})
		h.deps.Quests.Advance(accountID, "gather_scrap", 0) // no-op if missing
		creatureLvl := 3
		if sess := h.deps.Combat.GetByPlayer(accountID); sess != nil {
			creatureLvl = sess.CreatureStats.Level
		}
		for _, g := range skill.CombatGrants(winner, creatureLvl) {
			xp := h.deps.Skills.Add(accountID, g.Skill, g.XP)
			h.EmitToSocket(sid, protocol.EvSkillXP, map[string]any{
				"skills": xp,
				"levels": h.deps.Skills.Levels(accountID),
				"grant":  g,
			})
		}
		if p := h.eng.Players().GetByAccount(accountID); p != nil && h.deps.Loot != nil {
			drop := h.deps.Loot.Drop(instanceID, "loot_scrap", "Scrap", 1, p.X, p.Y)
			h.EmitToRoom(instanceID, protocol.EvLootSpawned, drop)
		}
	} else if winner != "flee" {
		p := h.eng.Players().GetByAccount(accountID)
		spawnX, spawnY := 10.0, 10.0
		mapID := protocol.DemoMapID
		instID := instanceID
		if p != nil {
			mapID = p.BaseMapID
			instID = p.MapID
		}
		h.EmitToSocket(sid, protocol.EvPlayerDefeated, map[string]any{
			"reason":     "combat",
			"mapId":      mapID,
			"instanceId": instID,
			"x":          spawnX,
			"y":          spawnY,
		})
		creatureLvl := 3
		if sess := h.deps.Combat.GetByPlayer(accountID); sess != nil {
			creatureLvl = sess.CreatureStats.Level
		}
		for _, g := range skill.CombatGrants(winner, creatureLvl) {
			xp := h.deps.Skills.Add(accountID, g.Skill, g.XP)
			h.EmitToSocket(sid, protocol.EvSkillXP, map[string]any{
				"skills": xp,
				"levels": h.deps.Skills.Levels(accountID),
				"grant":  g,
			})
		}
	}
}

func (h *Hub) handleAdminSaveMap(accountID string, datas []any) {
	if len(datas) == 0 {
		return
	}
	b, _ := json.Marshal(datas[0])
	var payload struct {
		MapID          string          `json:"mapId"`
		Name           string          `json:"name"`
		GridData       json.RawMessage `json:"gridData"`
		NpcsData       json.RawMessage `json:"npcsData"`
		TileLayersData json.RawMessage `json:"tileLayersData"`
		TilesetsData   json.RawMessage `json:"tilesetsData"`
	}
	if json.Unmarshal(b, &payload) != nil || payload.MapID == "" {
		return
	}
	base := world.ToBaseMapID(payload.MapID)
	grid := string(payload.GridData)
	if grid == "" {
		grid = "[]"
	}
	if err := h.eng.World().ApplyGrid(base, payload.Name, grid); err != nil {
		if p := h.eng.Players().GetByAccount(accountID); p != nil {
			h.EmitToSocket(p.SocketID, protocol.EvShowToast, map[string]string{"message": "save failed: " + err.Error()})
		}
		return
	}
	if h.deps.SaveMap != nil {
		_ = h.deps.SaveMap(base, payload.Name, grid, string(payload.NpcsData), string(payload.TileLayersData), string(payload.TilesetsData))
	}
	h.broadcastAll(protocol.EvContentReload, map[string]any{
		"type":    "map",
		"mapId":   base,
		"version": 0,
		"at":      time.Now().Format(time.RFC3339),
	})
}

func (h *Hub) handleAdminReloadMap(accountID string, datas []any) {
	mapID := protocol.DemoMapID
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["mapId"].(string); ok && v != "" {
				mapID = world.ToBaseMapID(v)
			}
		}
	}
	h.eng.World().EnsureDemoDef()
	h.broadcastAll(protocol.EvContentReload, map[string]any{
		"type":    "map",
		"mapId":   mapID,
		"version": 0,
		"at":      time.Now().Format(time.RFC3339),
	})
}

func (h *Hub) handleAdminReloadContent(accountID string, datas []any) {
	if h.deps.Registry == nil {
		return
	}
	// For Phase B: re-init the registry from the DB.
	// In production, we'd only do this for Admins, but any staff auth is enough right now.
	h.deps.Registry.ReloadAll()
	if p := h.eng.Players().GetByAccount(accountID); p != nil {
		h.EmitToSocket(p.SocketID, protocol.EvShowToast, map[string]string{"message": "Registry reloaded from DB"})
	}
	h.broadcastAll(protocol.EvContentReload, map[string]any{
		"type":    "all",
		"version": 0,
		"at":      time.Now().Format(time.RFC3339),
	})
}

func (h *Hub) handleStudioSpawnNPC(accountID string, datas []any) {
	if len(datas) == 0 {
		return
	}
	b, _ := json.Marshal(datas[0])
	var payload struct {
		MapID string `json:"mapId"`
		NPC   struct {
			ID     string  `json:"id"`
			Name   string  `json:"name"`
			X      float64 `json:"x"`
			Y      float64 `json:"y"`
			Sprite string  `json:"sprite"`
		} `json:"npc"`
	}
	if json.Unmarshal(b, &payload) != nil || payload.NPC.ID == "" {
		return
	}
	base := world.ToBaseMapID(payload.MapID)
	npc := world.LiveNPC{
		ID: payload.NPC.ID, Name: payload.NPC.Name, X: payload.NPC.X, Y: payload.NPC.Y,
		SpriteID: payload.NPC.Sprite, Dialogue: payload.NPC.ID,
	}
	h.eng.World().SpawnNPC(base, npc)
	h.broadcastAll(protocol.EvNPCSpawned, map[string]any{"mapId": base, "npc": npc})
}

func (h *Hub) handleStudioDespawnNPC(accountID string, datas []any) {
	if len(datas) == 0 {
		return
	}
	b, _ := json.Marshal(datas[0])
	var payload struct {
		MapID string `json:"mapId"`
		NpcID string `json:"npcId"`
	}
	if json.Unmarshal(b, &payload) != nil {
		return
	}
	base := world.ToBaseMapID(payload.MapID)
	h.eng.World().DespawnNPC(base, payload.NpcID)
	h.broadcastAll(protocol.EvNPCDespawned, map[string]any{"mapId": base, "npcId": payload.NpcID})
}

func (h *Hub) handleGather(accountID string, datas []any) {
	p := h.eng.Players().GetByAccount(accountID)
	if p == nil {
		return
	}
	x, y := p.X, p.Y
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["targetX"].(float64); ok {
				x = v
			}
			if v, ok := m["targetY"].(float64); ok {
				y = v
			}
		}
	}
	tile := protocol.TileGrass
	if def, ok := h.eng.World().GetDef(p.BaseMapID); ok {
		ix, iy := int(x), int(y)
		if iy >= 0 && iy < len(def.Grid) && ix >= 0 && ix < len(def.Grid[iy]) {
			tile = def.Grid[iy][ix]
		}
	}
	itemID, name, qty := "loot_scrap", "Scrap", 1
	switch tile {
	case protocol.TileTree:
		itemID, name = "wood", "Wood"
	case protocol.TileOre:
		itemID, name = "ore", "Ore"
	case protocol.TileFish:
		itemID, name = "fish", "Fish"
	}
	items := h.deps.Inventory.AddItem(accountID, itemID, name, qty)
	h.deps.Skills.Add(accountID, "gathering", 8)
	h.deps.Quests.Advance(accountID, "gather_scrap", 1)
	h.EmitToSocket(p.SocketID, protocol.EvInventorySync, map[string]any{"items": items})
	h.EmitToSocket(p.SocketID, protocol.EvShowToast, map[string]string{"message": "Gathered " + name})
	h.EmitToSocket(p.SocketID, protocol.EvQuestUpdate, map[string]any{"quests": h.deps.Quests.List(accountID)})
	_ = y
}

func (h *Hub) handlePickupLoot(accountID string, datas []any) {
	p := h.eng.Players().GetByAccount(accountID)
	if p == nil || h.deps.Loot == nil {
		return
	}
	lootID := ""
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["lootId"].(string); ok {
				lootID = v
			}
			if v, ok := m["id"].(string); ok {
				lootID = v
			}
		}
	}
	d, ok := h.deps.Loot.Pickup(p.MapID, lootID)
	if !ok {
		h.EmitToSocket(p.SocketID, protocol.EvShowToast, map[string]string{"message": "loot gone"})
		return
	}
	items := h.deps.Inventory.AddItem(accountID, d.ItemID, d.Name, d.Qty)
	h.EmitToSocket(p.SocketID, protocol.EvInventorySync, map[string]any{"items": items})
	h.EmitToRoom(p.MapID, protocol.EvLootRemoved, map[string]string{"id": d.ID})
}

func (h *Hub) handleCraft(accountID string, datas []any) {
	slug := asString(datas, 0)
	if slug == "" && len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["recipeSlug"].(string); ok {
				slug = v
			}
			if v, ok := m["slug"].(string); ok {
				slug = v
			}
		}
	}
	rec, ok := h.deps.Craft.Get(slug)
	p := h.eng.Players().GetByAccount(accountID)
	sid := ""
	if p != nil {
		sid = p.SocketID
	}
	if !ok {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "unknown recipe"})
		return
	}
	for id, qty := range rec.Inputs {
		if !h.deps.Inventory.Consume(accountID, id, qty) {
			h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "missing materials"})
			return
		}
	}
	items := h.deps.Inventory.AddItem(accountID, rec.Output, rec.OutName, rec.OutQty)
	h.deps.Skills.Add(accountID, "crafting", 15)
	h.deps.Quests.Advance(accountID, "craft_field_kit", 1)
	h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": items})
	h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Crafted " + rec.OutName})
	h.EmitToSocket(sid, protocol.EvQuestUpdate, map[string]any{"quests": h.deps.Quests.List(accountID)})
}

func (h *Hub) handleGTCCreate(accountID string, datas []any) {
	itemID, name, qty, price := "loot_scrap", "Scrap", 1, 10
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["itemId"].(string); ok {
				itemID = v
			}
			if v, ok := m["itemName"].(string); ok {
				name = v
			}
			if v, ok := m["qty"].(float64); ok {
				qty = int(v)
			}
			if v, ok := m["price"].(float64); ok {
				price = int(v)
			}
		}
	}
	sid := h.socketFor(accountID)
	if !h.deps.Inventory.Consume(accountID, itemID, qty) {
		h.EmitToSocket(sid, protocol.EvGTCError, map[string]string{"message": "not enough items"})
		return
	}
	listing, err := h.deps.GTC.Create(accountID, itemID, name, qty, price)
	if err != nil {
		h.deps.Inventory.AddItem(accountID, itemID, name, qty)
		h.EmitToSocket(sid, protocol.EvGTCError, map[string]string{"message": err.Error()})
		return
	}
	h.EmitToSocket(sid, protocol.EvGTCSuccess, map[string]any{"type": "LIST_CREATED", "listing": listing})
	h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": h.deps.Inventory.List(accountID)})
}

func (h *Hub) handleGTCPurchase(accountID string, datas []any) {
	listingID := ""
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["listingId"].(string); ok {
				listingID = v
			}
			if v, ok := m["id"].(string); ok {
				listingID = v
			}
		}
	}
	sid := h.socketFor(accountID)
	listing, err := h.deps.GTC.Purchase(listingID, accountID)
	if err != nil {
		h.EmitToSocket(sid, protocol.EvGTCError, map[string]string{"message": err.Error()})
		return
	}
	cost := listing.Price
	if h.deps.Inventory.Credits(accountID) < cost {
		_, _ = h.deps.GTC.Create(listing.SellerID, listing.ItemID, listing.ItemName, listing.Qty, listing.Price)
		h.EmitToSocket(sid, protocol.EvGTCError, map[string]string{"message": "not enough credits"})
		return
	}
	h.deps.Inventory.AddCredits(accountID, -cost)
	h.deps.Inventory.AddCredits(listing.SellerID, cost)
	items := h.deps.Inventory.AddItem(accountID, listing.ItemID, listing.ItemName, listing.Qty)
	h.EmitToSocket(sid, protocol.EvGTCSuccess, map[string]any{"type": "PURCHASE_COMPLETE", "listing": listing})
	h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": items})
	h.EmitToSocket(sid, protocol.EvSyncCredits, map[string]any{"credits": h.deps.Inventory.Credits(accountID)})
}

func (h *Hub) socketFor(accountID string) string {
	if p := h.eng.Players().GetByAccount(accountID); p != nil {
		return p.SocketID
	}
	return h.eng.Players().SocketIDForAccount(accountID)
}

func (h *Hub) handleNPCInteractFull(accountID string, datas []any) {
	target := "demo_welcome"
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["targetId"].(string); ok {
				target = v
			}
		}
	}
	node, ok := h.deps.Dialogue.Start(accountID, target)
	sid := h.socketFor(accountID)
	if !ok {
		return
	}
	h.EmitToSocket(sid, protocol.EvDialogueStart, map[string]any{
		"id": node.ID, "speaker": node.Speaker, "text": node.Text, "choices": node.Choices, "tree": target,
	})
}

func (h *Hub) handleDialogueSelectFull(accountID string, datas []any) {
	next := ""
	choiceIdx := -1
	action := ""
	questSlug := ""
	if len(datas) > 0 {
		b, _ := json.Marshal(datas[0])
		var m map[string]any
		if json.Unmarshal(b, &m) == nil {
			if v, ok := m["nextNode"].(string); ok {
				next = v
			}
			if v, ok := m["action"].(string); ok {
				action = v
			}
			if v, ok := m["questSlug"].(string); ok {
				questSlug = v
			}
			if v, ok := m["choice"].(float64); ok {
				choiceIdx = int(v)
			}
		}
	}
	sid := h.socketFor(accountID)
	res := h.deps.Dialogue.Select(accountID, next, choiceIdx)
	if action == "accept_quest" && questSlug != "" {
		res.Action = "accept_quest"
		res.QuestSlug = questSlug
	}
	if res.Action == "accept_quest" && res.QuestSlug != "" {
		p := h.deps.Quests.Accept(accountID, res.QuestSlug)
		h.EmitToSocket(sid, protocol.EvQuestUpdate, map[string]any{"quests": h.deps.Quests.List(accountID), "accepted": p})
	}
	if res.OpenShop {
		h.EmitToSocket(sid, "shop_catalog", map[string]any{"items": shop.GenerateCatalog(h.deps.Registry)})
	}
	if res.Action == "grant_demo_tools" {
		h.deps.Inventory.AddItem(accountID, "axe_bronze", "Rook Hatchet", 1)
		items := h.deps.Inventory.AddItem(accountID, "pickaxe_bronze", "Crude Pickaxe", 1)
		h.EmitToSocket(sid, protocol.EvInventorySync, map[string]any{"items": items})
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Received Rook Hatchet & Crude Pickaxe. Finish the Trail chain!"})
	}
	if res.Action == "heal_party" {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Your party was fully healed."})
		if p := h.eng.Players().GetByAccount(accountID); p != nil {
			p.HP = p.MaxHP
		}
	}
	if res.Action == "grant_spyder_starter" {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Budaye joined your party!"})
	}
	if res.Action == "demo_quest_report" {
		h.EmitToSocket(sid, protocol.EvShowToast, map[string]string{"message": "Check your quest tracker for the next step."})
	}
	if res.Action == "start_trainer_battle" {
		if p := h.eng.Players().GetByAccount(accountID); p != nil {
			cre := h.eng.Creatures().Spawn(p.MapID, creature.Entity{
				Species: "rockitten", Name: "Rockitten", X: p.X + 1, Y: p.Y,
				Sprite: "rockitten", Hostile: true, Level: 6, MaxHP: 60,
			})
			sess := h.deps.Combat.StartTB(accountID, "warrior", cre.ID, cre.Species, p.MapID, p.HP, cre.HP, 5, cre.Level)
			h.EmitToSocket(p.SocketID, protocol.EvBattleStarted, map[string]any{
				"combatId": sess.ID, "mode": "tb", "creatureId": cre.ID, "hp": cre.HP, "maxHp": cre.MaxHP,
			})
		}
	}
	if res.Ended {
		h.EmitToSocket(sid, protocol.EvDialogueEnd, map[string]any{})
		h.deps.Quests.Advance(accountID, "talk_guide", 1)
		h.EmitToSocket(sid, protocol.EvQuestUpdate, map[string]any{"quests": h.deps.Quests.List(accountID)})
		return
	}
	if res.Node != nil {
		h.EmitToSocket(sid, protocol.EvDialogueStart, map[string]any{
			"id": res.Node.ID, "speaker": res.Node.Speaker, "text": res.Node.Text, "choices": res.Node.Choices,
		})
	}
}
