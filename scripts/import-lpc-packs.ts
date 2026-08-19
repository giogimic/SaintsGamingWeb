/**
 * LPC External Pack Bulk Importer (CLI)
 *
 * Imports every APPROVED character pack from the external `.assets-gen`
 * staging workspace into this project's asset library.
 *
 * Usage:
 *   npx tsx scripts/import-lpc-packs.ts --userId=<your-user-id> [--dir=<path>] [--gameId=<id>]
 *
 * By default `--dir` points at the sibling `.assets-gen/review/approved`
 * folder next to this project (see AGENTS.md). Only packs that have been
 * manually moved to "approved" in the review tool are imported — pending and
 * rejected packs are never touched.
 *
 * You must supply a real --userId (a User.id from this project's database)
 * so imported assets are attributed to an actual account, not a guessed
 * "system" user.
 */

import path from "node:path";
import { prisma } from "../src/web/lib/prisma";
import { importApprovedLpcPacks } from "../src/server/lpcPackImporter";

const DEFAULT_APPROVED_DIR = path.resolve(__dirname, "..", "..", ".assets-gen", "review", "approved");

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const userId = args.userId;
  if (!userId) {
    console.error("Missing required --userId=<User.id>. Find it via: npx prisma studio, or query the User table.");
    process.exit(1);
  }

  const approvedDir = args.dir ? path.resolve(args.dir) : DEFAULT_APPROVED_DIR;
  const gameId = args.gameId || "tuxemon";

  console.log(`[LpcPackImporter] Reading approved packs from: ${approvedDir}`);
  console.log(`[LpcPackImporter] Attributing to userId: ${userId} · gameId: ${gameId}`);

  const result = await importApprovedLpcPacks({ approvedDir, userId, gameId });

  console.log("----------------------------------------------------");
  console.log(`✅ Imported: ${result.imported.length}`);
  for (const item of result.imported) {
    console.log(`   • ${item.packId} → asset ${item.assetId}`);
  }
  if (result.skipped.length > 0) {
    console.log(`⚠️  Skipped: ${result.skipped.length}`);
    for (const item of result.skipped) {
      console.log(`   • ${item.packId}: ${item.reason}`);
    }
  }
  console.log("----------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("[LpcPackImporter] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
