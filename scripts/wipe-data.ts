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
      
      // Setup / Core Game Definition Data
      console.log('   -> Wiping Maps & Configurations...');
      await prisma.mapChunk.deleteMany({});
      await prisma.mapSyncEntry.deleteMany({});
      await prisma.worldMapVersion.deleteMany({});
      await prisma.worldMap.deleteMany({});
      await prisma.saintsMap.deleteMany({});
      
      await prisma.gameConfig.deleteMany({});
      await prisma.creatureTemplate.deleteMany({});
      await prisma.characterClass.deleteMany({});
      
      // Force Setup Wizard to run again by deleting initialization flags
      console.log('   -> Resetting Setup Flags...');
      await prisma.siteSetting.deleteMany({
        where: {
          key: {
            in: [
              'GAME_INITIALIZED',
              'GAME_INITIALIZED_AT',
              'GAME_INITIALIZED_VERSION',
              'SETUP_COMPLETED',
              'SETUP_COMPLETED_AT',
              'GAME_NAME',
              'GAME_DESCRIPTION',
              'GAME_GENRE',
              'GAME_STYLE',
              'GAME_CAMERA',
              'DEFAULT_MAP_ID',
              'DEFAULT_GROUND_GID'
            ]
          }
        }
      });
      
      console.log('[+] Game Data wiped successfully. Studio Setup will run on next boot.');
    }
  } catch (error) {
    console.error('[!] Error wiping data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
