import { PrismaClient } from '@prisma/client';

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
      // Social Feed
      await prisma.socialReaction.deleteMany({});
      await prisma.socialPostHashtag.deleteMany({});
      await prisma.socialPost.deleteMany({});
      await prisma.socialHashtag.deleteMany({});
      await prisma.socialBookmark.deleteMany({});
      await prisma.socialWatchHistory.deleteMany({});
      await prisma.socialBookmarkFolder.deleteMany({});
      await prisma.socialMutedKeyword.deleteMany({});
      await prisma.socialTip.deleteMany({});
      await prisma.socialSubscription.deleteMany({});
      await prisma.socialUserPreference.deleteMany({});

      // Forum
      await prisma.replyLike.deleteMany({});
      await prisma.reaction.deleteMany({});
      await prisma.pollVote.deleteMany({});
      await prisma.pollOption.deleteMany({});
      await prisma.poll.deleteMany({});
      await prisma.reply.deleteMany({});
      await prisma.threadSubscription.deleteMany({});
      await prisma.threadHashtag.deleteMany({});
      await prisma.thread.deleteMany({});
      // Note: we usually keep Categories and Subcategories, as they are config, not user data!

      // News
      await prisma.newsHashtag.deleteMany({});
      await prisma.newsArticle.deleteMany({});
      
      console.log('[+] Social Data wiped successfully.');
    }

    if (wipeGame) {
      console.log('[*] Wiping Game Data...');
      // MMO/Game state
      await prisma.playerCreature.deleteMany({});
      await prisma.playerInventoryItem.deleteMany({});
      await prisma.inventoryLog.deleteMany({});
      await prisma.playerStats.deleteMany({});
      await prisma.playerSkill.deleteMany({});
      await prisma.playerQuestState.deleteMany({});
      await prisma.playerStructure.deleteMany({});
      
      await prisma.guildMember.deleteMany({});
      await prisma.guild.deleteMany({});
      
      await prisma.gameCharacter.deleteMany({});
      await prisma.character.deleteMany({});
      
      // RP state
      await prisma.bankTransaction.deleteMany({});
      await prisma.property.deleteMany({});
      await prisma.vehicle.deleteMany({});
      await prisma.businessEmployee.deleteMany({});
      await prisma.business.deleteMany({});
      await prisma.faction.deleteMany({});
      await prisma.gang.deleteMany({});
      await prisma.inventoryItem.deleteMany({});
      
      console.log('[+] Game Data wiped successfully.');
    }
  } catch (error) {
    console.error('[!] Error wiping data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
