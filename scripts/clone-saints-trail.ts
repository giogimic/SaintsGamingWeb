/**
 * CLI: clone Saints Trail into a profile.
 * Usage: npm run clone:saints-trail -- custom_2
 *        FORCE_TRAIL_CLONE=1 npm run clone:saints-trail -- custom_2
 */

import { PrismaClient } from "@prisma/client";
import { cloneSaintsTrailToProfile } from "../src/server/cloneSaintsTrail";

const prisma = new PrismaClient();

async function main() {
  const slug = (process.argv[2] || "custom_2").trim();
  const name = process.argv[3];
  const force = process.env.FORCE_TRAIL_CLONE === "1";
  console.log(`Cloning Saints Trail → ${slug} (force=${force})…`);
  const result = await cloneSaintsTrailToProfile(prisma, {
    targetSlug: slug,
    name,
    force,
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
