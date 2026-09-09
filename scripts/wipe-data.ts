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
      
      // 1. Wipe all maps
      await prisma.gameMap.deleteMany({}).catch(() => {});
      await prisma.worldMap.deleteMany({}).catch(() => {});
      await prisma.worldAtlas.deleteMany({}).catch(() => {});
      
      // 2. Wipe map versions and sync entries
      await prisma.worldMapVersion.deleteMany({}).catch(() => {});
      await prisma.mapSyncEntry.deleteMany({}).catch(() => {});
      await prisma.worldPublishSnapshot.deleteMany({}).catch(() => {});
      await prisma.mapChunk.deleteMany({}).catch(() => {});
      await prisma.saintsMap.deleteMany({}).catch(() => {});

      // 3. Wipe custom map prefabs and quests
      await prisma.mapPrefab.deleteMany({}).catch(() => {});
      await prisma.gameQuest.deleteMany({}).catch(() => {});

      // 4. Wipe player gameplay state and characters tied to previous maps
      await prisma.playerCreature.deleteMany({}).catch(() => {});
      await prisma.playerInventoryItem.deleteMany({}).catch(() => {});
      await prisma.playerSkill.deleteMany({}).catch(() => {});
      await prisma.playerQuestState.deleteMany({}).catch(() => {});
      await prisma.gtcListing.deleteMany({}).catch(() => {});
      await prisma.playerStats.deleteMany({}).catch(() => {});
      await prisma.playerStructure.deleteMany({}).catch(() => {});
      await prisma.inventoryLog.deleteMany({}).catch(() => {});
      
      await prisma.guildMember.deleteMany({}).catch(() => {});
      await prisma.guild.deleteMany({}).catch(() => {});
      
      await prisma.gameCharacter.deleteMany({}).catch(() => {});
      await prisma.character.deleteMany({}).catch(() => {});
      
      // RP state
      await prisma.bankTransaction.deleteMany({}).catch(() => {});
      await prisma.property.deleteMany({}).catch(() => {});
      await prisma.vehicle.deleteMany({}).catch(() => {});
      await prisma.businessEmployee.deleteMany({}).catch(() => {});
      await prisma.business.deleteMany({}).catch(() => {});
      await prisma.faction.deleteMany({}).catch(() => {});
      await prisma.gang.deleteMany({}).catch(() => {});
      await prisma.inventoryItem.deleteMany({}).catch(() => {});

      // 4.5 Wipe all authored RPG Definitions (Classes, Abilities, Items, etc)
      await prisma.starterHero.deleteMany({}).catch(() => {});
      await prisma.characterClass.deleteMany({}).catch(() => {});
      await prisma.abilityDictionary.deleteMany({}).catch(() => {});
      await prisma.creatureDef.deleteMany({}).catch(() => {});
      await prisma.itemTemplate.deleteMany({}).catch(() => {});
      await prisma.mountTemplate.deleteMany({}).catch(() => {});
      await prisma.dungeonTemplate.deleteMany({}).catch(() => {});
      await prisma.shopTemplate.deleteMany({}).catch(() => {});
      await prisma.professionTemplate.deleteMany({}).catch(() => {});
      await prisma.craftingRecipe.deleteMany({}).catch(() => {});
      await prisma.worldEventTemplate.deleteMany({}).catch(() => {});
      await prisma.questTemplate.deleteMany({}).catch(() => {});
      await prisma.creatureElement.deleteMany({}).catch(() => {});
      await prisma.elementEffectiveness.deleteMany({}).catch(() => {});
      
      await prisma.gameConfig.deleteMany({}).catch(() => {});
      await prisma.creatureTemplate.deleteMany({}).catch(() => {});
      
      // 5. Wipe non-bundled game assets
      await prisma.gameAsset.deleteMany({
        where: {
          NOT: {
            tags: { contains: 'bundled' },
          },
        },
      }).catch(() => {});

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
              'DEFAULT_GROUND_GID',
              'REALM_NAME',
              'REALM_DESCRIPTION',
              'STARTER_PACK_IMPORTED',
              'SPAWN_MAP_ID'
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
