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
      
      // Helper for safe deletion
      let failedWipes = 0;
      const safeDelete = async (model: string, promise: Promise<any>) => {
        try {
          await promise;
          console.log(`  [+] Wiped ${model}`);
        } catch (e: any) {
          failedWipes++;
          console.log(`  [!] FAILED to wipe ${model}: ${e.message}`);
        }
      };
      
      // 1. Deepest Dependencies (Moderation, Media, Interactions)
      await safeDelete('Report', prisma.report.deleteMany({}));
      await safeDelete('Image', prisma.image.deleteMany({}));
      
      // 2. Forum (Child -> Parent)
      await safeDelete('PollVote', prisma.pollVote.deleteMany({}));
      await safeDelete('PollOption', prisma.pollOption.deleteMany({}));
      await safeDelete('Poll', prisma.poll.deleteMany({}));
      await safeDelete('ReplyLike', prisma.replyLike.deleteMany({}));
      await safeDelete('Reaction', prisma.reaction.deleteMany({}));
      await safeDelete('Reply', prisma.reply.deleteMany({}));
      await safeDelete('ThreadSubscription', prisma.threadSubscription.deleteMany({}));
      await safeDelete('ThreadHashtag', prisma.threadHashtag.deleteMany({}));
      await safeDelete('Thread', prisma.thread.deleteMany({}));

      // 3. Social (Child -> Parent)
      await safeDelete('SocialWatchHistory', prisma.socialWatchHistory.deleteMany({}));
      await safeDelete('SocialReaction', prisma.socialReaction.deleteMany({}));
      await safeDelete('SocialPostHashtag', prisma.socialPostHashtag.deleteMany({}));
      await safeDelete('SocialPost', prisma.socialPost.deleteMany({}));
      await safeDelete('SocialHashtag', prisma.socialHashtag.deleteMany({}));
      await safeDelete('SocialBookmark', prisma.socialBookmark.deleteMany({}));
      await safeDelete('SocialBookmarkFolder', prisma.socialBookmarkFolder.deleteMany({}));
      await safeDelete('SocialMutedKeyword', prisma.socialMutedKeyword.deleteMany({}));
      await safeDelete('SocialTip', prisma.socialTip.deleteMany({}));
      await safeDelete('SocialSubscription', prisma.socialSubscription.deleteMany({}));
      await safeDelete('SocialUserPreference', prisma.socialUserPreference.deleteMany({}));

      // 4. News (Child -> Parent)
      await safeDelete('PromoLink', prisma.promoLink.deleteMany({}));
      await safeDelete('MediaAsset', prisma.mediaAsset.deleteMany({}));
      await safeDelete('NewsHashtag', prisma.newsHashtag.deleteMany({}));
      await safeDelete('NewsArticle', prisma.newsArticle.deleteMany({}));
      
      if (failedWipes > 0) {
        throw new Error(`Social data wipe completed with ${failedWipes} errors.`);
      }

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
