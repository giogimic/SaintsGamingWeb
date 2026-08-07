import { gameEvents } from "@/shared/events/gameEventBus";
import { checkAndAwardAchievements } from "@/web/lib/achievements";

export function registerAchievementListeners() {
  gameEvents.subscribe("creature.captured", async ({ userId }) => {
    await checkAndAwardAchievements(userId);
  });

  gameEvents.subscribe("item.crafted", async ({ userId }) => {
    await checkAndAwardAchievements(userId);
  });

  gameEvents.subscribe("quest.completed", async ({ userId }) => {
    await checkAndAwardAchievements(userId);
  });

  gameEvents.subscribe("trade.completed", async ({ userId }) => {
    await checkAndAwardAchievements(userId);
  });

  gameEvents.subscribe("bramble.cleared", async ({ userId }) => {
    await checkAndAwardAchievements(userId);
  });

  gameEvents.subscribe("party.formed", async ({ userId }) => {
    await checkAndAwardAchievements(userId);
  });

  console.log("[AchievementListener] Registered GameEventBus subscribers.");
}
