/**
 * Economy Handlers — sync_credits, sync_hp, inventory_sync, skill_xp_gained,
 * quest_update, loot_dropped, loot_despawned.
 */
import type {
  SyncCreditsPayload,
  SyncHpPayload,
  InventorySyncPayload,
  SkillXpPayload,
  QuestUpdatePayload,
  LootDroppedPayload,
  LootDespawnedPayload,
} from '../protocol.d';
import { usePlayerStore } from '../../state/usePlayerStore';
import { useToastStore } from '../../state/useToastStore';

/**
 * Server syncs our credits.
 */
export function onSyncCredits(data: SyncCreditsPayload): void {
  usePlayerStore.setState((s) => {
    s.player.credits = data.credits;
  });
}

/**
 * Server syncs our HP.
 */
export function onSyncHp(data: SyncHpPayload): void {
  usePlayerStore.setState((s) => {
    s.player.hp = data.hp;
    if (data.maxHp !== undefined) s.player.maxHp = data.maxHp;
  });
}

/**
 * Full inventory sync from server.
 */
export function onInventorySync(data: InventorySyncPayload): void {
  usePlayerStore.setState((s) => {
    const newInv: Record<string, number> = {};
    for (const item of data.items || []) {
      if (item.id && item.qty > 0) newInv[item.id] = item.qty;
    }
    s.player.inventory = newInv;
  });
}

/**
 * Skill XP gained from server.
 */
export function onSkillXpGained(data: SkillXpPayload): void {
  usePlayerStore.setState((s) => {
    if (!s.player.skills[data.skillSlug]) {
      s.player.skills[data.skillSlug] = { level: 1, xp: 0 };
    }
    s.player.skills[data.skillSlug].xp = data.totalXp;
    s.player.skills[data.skillSlug].level = data.level;
  });
}

/**
 * Quest progress or completion.
 */
export function onQuestUpdate(data: QuestUpdatePayload): void {
  if (!data.quests?.length) return;

  usePlayerStore.setState((s) => {
    for (const quest of data.quests) {
      if (quest.slug) {
        s.player.activeQuests[quest.slug] = quest;
      }
    }
  });

  usePlayerStore.getState().triggerQuestRefresh();
}

/**
 * Loot dropped on the ground.
 */
export function onLootDropped(data: LootDroppedPayload): void {
  // TODO: Add to world store loot collection in Phase 3
  // For now just toast
  if (data && typeof data === 'object') {
    useToastStore.getState().showToast('Loot appeared nearby!');
  }
}

/**
 * Loot despawned (picked up or expired).
 */
export function onLootDespawned(data: LootDespawnedPayload): void {
  // TODO: Remove from world store loot collection in Phase 3
}
