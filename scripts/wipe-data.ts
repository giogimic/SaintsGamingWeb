import { PrismaClient } from '@prisma/client';
import { wipeNonBundledRealmContent } from '../src/server/wipeRealmService';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const wipeGame = args.includes('--game');
  const wipeSocial = args.includes('--social');

  if (!wipeGame && !wipeSocial) {
    console.log('No wipe flags provided. Use --game or --social.');
    return;
  }

  try {
    if (wipeSocial) {
      console.log('[*] Wiping Feed/Forum/News (Social) Data...');
      
      // 1. Deepest Dependencies (Moderation, Media, Interactions)
      await prisma.report.deleteMany({});
      await prisma.image.deleteMany({});
      
      // 2. Forum (Child -> Parent)
      await prisma.pollVote.deleteMany({});
      await prisma.pollOption.deleteMany({});
      await prisma.poll.deleteMany({});
      await prisma.replyLike.deleteMany({});
      await prisma.reaction.deleteMany({});
      await prisma.reply.deleteMany({});
      await prisma.threadSubscription.deleteMany({});
      await prisma.threadHashtag.deleteMany({});
      await prisma.thread.deleteMany({});

      // 3. Social (Child -> Parent)
      await prisma.socialWatchHistory.deleteMany({});
      await prisma.socialReaction.deleteMany({});
      await prisma.socialPostHashtag.deleteMany({});
      await prisma.socialPost.deleteMany({});
      await prisma.socialHashtag.deleteMany({});
      await prisma.socialBookmark.deleteMany({});
      await prisma.socialBookmarkFolder.deleteMany({});
      await prisma.socialMutedKeyword.deleteMany({});
      await prisma.socialTip.deleteMany({});
      await prisma.socialSubscription.deleteMany({});
      await prisma.socialUserPreference.deleteMany({});

      // 4. News (Child -> Parent)
      await prisma.promoLink.deleteMany({});
      await prisma.mediaAsset.deleteMany({});
      await prisma.newsHashtag.deleteMany({});
      await prisma.newsArticle.deleteMany({});
      
      console.log('[+] Social Data wiped successfully.');
    }

    if (wipeGame) {
      console.log('[*] Wiping Game Data...');
      try {
        await wipeNonBundledRealmContent(prisma);
        console.log('[+] Game Data wiped successfully. Studio Setup will run on next boot.');
      } catch (err) {
        console.log('[!] Failed to wipe game data:', err);
        throw err;
      }
    }
  } catch (error) {
    console.log('[!] Error wiping data (FULL TRACE):');
    console.log(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
