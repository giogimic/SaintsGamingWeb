/**
 * Headless Saints Trail playthrough: greeter → gather (Custom 1).
 * Drives QuestManager + DialogueManager on a bare GameEngine (no sockets).
 *
 * Usage:
 *   FORCE_TRAIL_SEED=1 npm run seed:saints-trail   # if DB empty
 *   npm run smoke:saints-trail:play
 */

import { PrismaClient } from "@prisma/client";
import { GameEngine } from "../src/server/GameEngine";
import { QuestManager } from "../src/server/QuestManager";
import { DialogueManager } from "../src/server/DialogueManager";

const prisma = new PrismaClient();
const fails: string[] = [];
const oks: string[] = [];

function ok(msg: string) {
  oks.push(msg);
  console.log(`  ✓ ${msg}`);
}
function fail(msg: string) {
  fails.push(msg);
  console.error(`  ✗ ${msg}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(
  label: string,
  predicate: () => Promise<boolean>,
  timeoutMs = 4000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) {
      ok(label);
      return true;
    }
    await sleep(40);
  }
  fail(`${label} (timeout ${timeoutMs}ms)`);
  return false;
}

async function questState(userId: string, slug: string) {
  return prisma.playerQuestState.findFirst({ where: { userId, questSlug: slug } });
}

async function activeSlug(userId: string): Promise<string | null> {
  const row = await prisma.playerQuestState.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { acceptedAt: "desc" },
  });
  return row?.questSlug ?? null;
}

async function hasItem(userId: string, slug: string) {
  const row = await prisma.playerInventoryItem.findFirst({
    where: { userId, itemSlug: slug },
  });
  return (row?.quantity ?? 0) > 0;
}

async function talk(engine: GameEngine, accountId: string, npcId: string) {
  engine.events.emit("npcInteractRequest", {
    accountId,
    socketId: "smoke-play",
    targetId: npcId,
    mapId: "DEMO_SANDBOX",
  });
}

async function main() {
  console.log("\n[smoke:saints-trail:play] greeter → gather\n");

  const wake = await prisma.questTemplate.findUnique({ where: { slug: "quest_trail_wake" } });
  if (!wake) {
    fail("quest_trail_wake missing — run FORCE_TRAIL_SEED=1 npm run seed:saints-trail");
    console.log(`\n${oks.length} ok, ${fails.length} fail\n`);
    process.exit(1);
  }
  ok("quest templates present");

  const stamp = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `trail_play_${stamp}@saints.test`,
      username: `tp_${String(stamp).slice(-8)}`,
      displayName: "Trail Smoke",
    },
  });
  const accountId = user.id;
  const userId = user.id;

  const engine = new GameEngine();
  const questManager = new QuestManager(engine);
  const dialogueManager = new DialogueManager(engine);
  await questManager.initialize();
  await dialogueManager.initialize();

  // ── Q1 accept via greeter dialogue action ──────────────────────────
  engine.events.emit("dialogueSelectAction", {
    accountId,
    socketId: "smoke-play",
    targetId: "npc_trail_greeter",
    nextNode: "accepted",
    action: "ACCEPT_QUEST",
    questSlug: "quest_trail_wake",
  });
  await waitFor("accepted quest_trail_wake", async () => {
    const s = await questState(userId, "quest_trail_wake");
    return s?.status === "ACTIVE";
  });

  // Completing TALK on greeter finishes Q1 → auto-accepts yard
  await talk(engine, accountId, "npc_trail_greeter");
  await waitFor("completed Q1 + active quest_trail_yard", async () => {
    const wakeDone = await questState(userId, "quest_trail_wake");
    const yard = await questState(userId, "quest_trail_yard");
    return wakeDone?.status === "COMPLETED" && yard?.status === "ACTIVE";
  });

  // ── Mid-chain tools: must NOT auto-start Q6 ────────────────────────
  engine.events.emit("dialogueSelectAction", {
    accountId,
    socketId: "smoke-play",
    targetId: "npc_warden_vance",
    nextNode: "tools_done",
    action: "GRANT_DEMO_TOOLS",
  });
  await waitFor("tools granted (axe + pick)", async () => {
    return (await hasItem(userId, "axe_bronze")) && (await hasItem(userId, "pickaxe_bronze"));
  });
  {
    const q6 = await questState(userId, "quest_tools_of_trade");
    if (q6) fail("GRANT_DEMO_TOOLS incorrectly started quest_tools_of_trade");
    else ok("tools grant did not accept Q6");
  }
  {
    const active = await activeSlug(userId);
    if (active === "quest_trail_yard") ok(`still on ${active} after tools`);
    else fail(`expected quest_trail_yard after tools, got ${active}`);
  }

  // ── Q2 yard talks ─────────────────────────────────────────────────
  await talk(engine, accountId, "npc_trail_local_a");
  await waitFor("yard stage 2 (after scout)", async () => {
    const s = await questState(userId, "quest_trail_yard");
    return s?.status === "ACTIVE" && s.currentStage === 2;
  });
  await talk(engine, accountId, "npc_trail_local_b");
  await waitFor("completed Q2 → quest_trail_services", async () => {
    const yard = await questState(userId, "quest_trail_yard");
    const svc = await questState(userId, "quest_trail_services");
    return yard?.status === "COMPLETED" && svc?.status === "ACTIVE";
  });

  // ── Q3 shop + nurse ───────────────────────────────────────────────
  await talk(engine, accountId, "npc_trail_clerk");
  await waitFor("services stage 2 (after clerk)", async () => {
    const s = await questState(userId, "quest_trail_services");
    return s?.status === "ACTIVE" && s.currentStage === 2;
  });
  await talk(engine, accountId, "npc_trail_nurse");
  await waitFor("completed Q3 → quest_first_bond", async () => {
    const svc = await questState(userId, "quest_trail_services");
    const bond = await questState(userId, "quest_first_bond");
    return svc?.status === "COMPLETED" && bond?.status === "ACTIVE";
  });

  // ── Q4 claim starter ──────────────────────────────────────────────
  engine.events.emit("starterClaimed", {
    accountId,
    socketId: "smoke-play",
    targetSlug: "starter",
    amount: 1,
  });
  await waitFor("completed Q4 → quest_trail_spar", async () => {
    const bond = await questState(userId, "quest_first_bond");
    const spar = await questState(userId, "quest_trail_spar");
    return bond?.status === "COMPLETED" && spar?.status === "ACTIVE";
  });

  // ── Q5 spar → auto-accept Q6 gather ───────────────────────────────
  engine.events.emit("trainerDefeated", {
    accountId,
    socketId: "smoke-play",
    targetSlug: "npc_trail_tutor",
    amount: 1,
  });
  await waitFor("completed Q5 → quest_tools_of_trade", async () => {
    const spar = await questState(userId, "quest_trail_spar");
    const tools = await questState(userId, "quest_tools_of_trade");
    return spar?.status === "COMPLETED" && tools?.status === "ACTIVE" && tools.currentStage === 1;
  });

  // ── Q6 gather wood ×3 → ore ×3 → talk Vance ───────────────────────
  // Emit one-at-a-time — QuestManager handlers are async and race if bursted.
  async function gatherOnce(targetSlug: string, expect: {
    stage?: number;
    progress?: number;
    completed?: boolean;
  }) {
    engine.events.emit("itemGathered", {
      accountId,
      socketId: "smoke-play",
      targetSlug,
      amount: 1,
    });
    await waitFor(`gather ${targetSlug} → ${JSON.stringify(expect)}`, async () => {
      const s = await questState(userId, "quest_tools_of_trade");
      if (!s) return false;
      if (expect.completed) return s.status === "COMPLETED";
      if (s.status !== "ACTIVE") return false;
      if (expect.stage !== undefined && s.currentStage !== expect.stage) return false;
      if (expect.progress !== undefined && s.progress !== expect.progress) return false;
      return true;
    });
  }

  await gatherOnce("wood_log", { stage: 1, progress: 1 });
  await gatherOnce("wood_log", { stage: 1, progress: 2 });
  await gatherOnce("wood_log", { stage: 2, progress: 0 });
  ok("wood×3 advanced to ore stage");

  await gatherOnce("ore_copper", { stage: 2, progress: 1 });
  await gatherOnce("ore_copper", { stage: 2, progress: 2 });
  await gatherOnce("ore_copper", { stage: 3, progress: 0 });
  ok("ore×3 advanced to report stage");

  await talk(engine, accountId, "npc_warden_vance");
  await waitFor("completed Q6 → quest_forging_vessel", async () => {
    const tools = await questState(userId, "quest_tools_of_trade");
    const forge = await questState(userId, "quest_forging_vessel");
    return tools?.status === "COMPLETED" && forge?.status === "ACTIVE";
  });

  console.log(`\n${oks.length} ok, ${fails.length} fail\n`);
  await prisma.$disconnect();
  process.exit(fails.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
