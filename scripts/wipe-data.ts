import { prisma } from "../src/web/lib/prisma";
import { wipeNonBundledRealmContent } from "../src/server/wipeRealmService";

async function main() {
  const args = process.argv.slice(2);
  const wipeGame = args.includes("--game");
  const wipeSocial = args.includes("--social");

  console.log("=== SAINTS GAMING DATA WIPE UTILITY ===");

  if (!wipeGame && !wipeSocial) {
    console.log("No wipe flags provided. Use --game or --social.");
    process.exit(0);
  }

  if (wipeGame) {
    console.log("[*] Executing game/realm data wipe...");
    try {
      const result = await wipeNonBundledRealmContent(prisma);
      console.log(`[✓] Game wipe successful.`);
      console.log(`    - Wiped Maps: ${result.wipedMapsCount}`);
      console.log(`    - Wiped Characters: ${result.wipedCharactersCount}`);
      console.log(`    - Details: ${result.message}`);
    } catch (e: any) {
      console.error("[!] Game wipe failed:", e.message);
      process.exit(1);
    }
  }

  if (wipeSocial) {
    console.log("[*] Executing social data wipe (Feed, Forum, News)...");
    try {
      // Feed
      await prisma.feedPostLike.deleteMany({});
      await prisma.feedPostComment.deleteMany({});
      const deletedPosts = await prisma.feedPost.deleteMany({});
      
      // Forum
      await prisma.forumPostLike.deleteMany({});
      await prisma.forumPost.deleteMany({});
      const deletedTopics = await prisma.forumTopic.deleteMany({});
      
      // News
      await prisma.newsArticle.deleteMany({});
      
      console.log(`[✓] Social wipe successful.`);
      console.log(`    - Wiped Feed Posts: ${deletedPosts.count}`);
      console.log(`    - Wiped Forum Topics: ${deletedTopics.count}`);
    } catch (e: any) {
      console.error("[!] Social wipe failed:", e.message);
      process.exit(1);
    }
  }

  console.log("=== WIPE PROCESS COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch((e) => {
  console.error("Unhandled error during wipe:", e);
  process.exit(1);
});
