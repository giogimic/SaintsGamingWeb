/**
 * Prune NPCs sitting on wall tiles (grid === 1) and ensure every remaining
 * Spyder/Cotton NPC has a usable NpcDialogueTree (node_start stub for ambient
 * TMX imports; curated quest trees are left alone).
 *
 * Usage: npx tsx scripts/seed-ambient-dialogue.ts
 * Also invoked at the end of seed-campaign-npcs.
 */
import { PrismaClient } from "@prisma/client";
import { CAMPAIGN_NPC_SEEDS } from "../src/server/spyderQuests";

const prisma = new PrismaClient();

const MAP_IDS = [
  "AZURE_TOWN",
  "SPYDER_ROUTE1",
  "ROUTE_1",
  "COTTON_TOWN",
  "COTTON_SCOOP",
  "COTTON_CAFE",
  "SPYDER_COTTON_TUNNEL",
] as const;

const CURATED = new Set(
  Object.values(CAMPAIGN_NPC_SEEDS).flatMap((list) => list.map((n) => n.id))
);

const AMBIENT_LINES = [
  "Nice day for a walk, isn't it?",
  "Have you tried the Scoop yet? Best ice cream in Cotton.",
  "Watch the tall grass — wild monsters love it.",
  "I heard the tunnel east of town is open again.",
  "Budaye is such a friendly little partner.",
  "Stay hydrated out there, traveler.",
  "The café makes a mean latte.",
  "Don't forget to talk to the Guide if you're stuck.",
  "Route 1 used to spook me. Not anymore!",
  "Cotton Town's quieter than it looks.",
  "Trainers pass through here all the time.",
  "I'm just enjoying the plaza breeze.",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function stubTree(name: string, npcId: string) {
  const line = AMBIENT_LINES[Math.abs(hash(npcId)) % AMBIENT_LINES.length]!;
  return {
    node_start: {
      text: `${name}: ${line}`,
      options: [{ label: "See you around.", nextNode: "exit" }],
    },
  };
}

function hasUsableTree(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const t = JSON.parse(raw);
    return Boolean(t?.node_start?.text);
  } catch {
    return false;
  }
}

/** Hand-placed Azure plaza folk (upstream azure_town.tmx has no create_npc). */
const AZURE_PLAZA_AMBIENT: Array<{
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
}> = [
  { id: "npc_azure_florist", name: "Plaza Florist", x: 23, y: 22, sprite: "florist" },
  { id: "npc_azure_scout", name: "Route Scout", x: 27, y: 23, sprite: "ninja" },
  { id: "npc_azure_child", name: "Curious Child", x: 26, y: 27, sprite: "childactor" },
];

async function densifyAzurePlaza(): Promise<number> {
  const map = await prisma.worldMap.findUnique({ where: { id: "AZURE_TOWN" } });
  if (!map) return 0;
  let grid: number[][] = [];
  let npcs: any[] = [];
  try {
    grid = JSON.parse(map.gridData || "[]");
    npcs = JSON.parse(map.npcsData || "[]");
  } catch {
    return 0;
  }
  const byId = new Map(npcs.map((n: any) => [n.id, n]));
  let added = 0;
  for (const seed of AZURE_PLAZA_AMBIENT) {
    const tile = grid[seed.y]?.[seed.x];
    if (tile === undefined || tile === 1) {
      console.warn(
        `[ambient] skip Azure ${seed.id} — tile ${tile} at (${seed.x},${seed.y})`
      );
      continue;
    }
    if (!byId.has(seed.id)) added++;
    byId.set(seed.id, {
      ...(byId.get(seed.id) || {}),
      id: seed.id,
      name: seed.name,
      x: seed.x,
      y: seed.y,
      sprite: seed.sprite,
      direction: "down",
    });
  }
  const next = Array.from(byId.values());
  await prisma.worldMap.update({
    where: { id: "AZURE_TOWN" },
    data: { npcsData: JSON.stringify(next), version: { increment: 1 } },
  });
  await prisma.gameMap
    .update({ where: { id: "AZURE_TOWN" }, data: { npcs: JSON.stringify(next) } })
    .catch(() => undefined);
  if (added) console.log(`[ambient] Azure plaza densify +${added}`);
  return added;
}

export async function seedAmbientDialogue(): Promise<{
  pruned: number;
  stubbed: number;
  kept: number;
}> {
  let pruned = 0;
  let stubbed = 0;
  let kept = 0;

  await densifyAzurePlaza();

  for (const mapId of MAP_IDS) {
    const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!map) continue;

    let grid: number[][] = [];
    try {
      grid = JSON.parse(map.gridData || "[]");
    } catch {
      grid = [];
    }

    let npcs: Array<{
      id: string;
      name?: string;
      x: number;
      y: number;
      [k: string]: unknown;
    }> = [];
    try {
      npcs = JSON.parse(map.npcsData || "[]");
    } catch {
      npcs = [];
    }

    const keptNpcs: typeof npcs = [];
    for (const npc of npcs) {
      const tile = grid[npc.y]?.[npc.x];
      if (tile === 1) {
        if (CURATED.has(npc.id)) {
          console.warn(
            `[ambient] curated ${npc.id} on wall (${npc.x},${npc.y}) @ ${mapId} — leaving`
          );
          keptNpcs.push(npc);
          kept += 1;
          continue;
        }
        await prisma.npcDialogueTree
          .delete({ where: { npcId: npc.id } })
          .catch(() => undefined);
        pruned += 1;
        console.log(
          `[ambient] pruned wall NPC ${npc.id} @ ${mapId} (${npc.x},${npc.y})`
        );
        continue;
      }

      keptNpcs.push(npc);

      if (CURATED.has(npc.id)) {
        kept += 1;
        continue;
      }

      const existing = await prisma.npcDialogueTree.findUnique({
        where: { npcId: npc.id },
      });
      if (hasUsableTree(existing?.data)) {
        kept += 1;
        continue;
      }

      const name = npc.name || npc.id.replace(/^npc_/, "");
      const data = JSON.stringify(stubTree(String(name), npc.id));
      await prisma.npcDialogueTree.upsert({
        where: { npcId: npc.id },
        create: { npcId: npc.id, name: String(name), data },
        update: { name: String(name), data },
      });
      stubbed += 1;
    }

    if (keptNpcs.length !== npcs.length) {
      await prisma.worldMap.update({
        where: { id: mapId },
        data: {
          npcsData: JSON.stringify(keptNpcs),
          version: { increment: 1 },
        },
      });
      await prisma.gameMap
        .update({
          where: { id: mapId },
          data: { npcs: JSON.stringify(keptNpcs) },
        })
        .catch(() => undefined);
    }
  }

  console.log(`[ambient] pruned=${pruned} stubbed=${stubbed} kept=${kept}`);
  return { pruned, stubbed, kept };
}

async function main() {
  await seedAmbientDialogue();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
