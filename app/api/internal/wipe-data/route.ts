import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { wipeNonBundledRealmContent } from '@/server/wipeRealmService';

export async function POST(request: Request) {
  try {
    // Basic Security: Ensure the request comes from localhost or has an internal header.
    // Since this is called by docker exec wget locally, we can check headers.
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer INTERNAL_WIPE_TOKEN_SAINTS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const wipeSocial = body.social === true;
    const wipeGame = body.game === true;

    let failedWipes = 0;
    const messages: string[] = [];

    const safeDelete = async (model: string, promise: Promise<any>) => {
      try {
        await promise;
        messages.push(`[+] Wiped ${model}`);
      } catch (e: any) {
        failedWipes++;
        messages.push(`[!] FAILED to wipe ${model}: ${e.message}`);
      }
    };

    if (wipeSocial) {
      messages.push('[*] Wiping Feed/Forum/News (Social) Data...');
      
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
        return NextResponse.json({ 
          error: `Social data wipe completed with ${failedWipes} errors.`, 
          details: messages 
        }, { status: 500 });
      }

      messages.push('[+] Social Data wiped successfully.');
    }

    if (wipeGame) {
      messages.push('[*] Wiping Game Data...');
      try {
        await wipeNonBundledRealmContent(prisma);
        messages.push('[+] Game Data wiped successfully.');
      } catch (e: any) {
        return NextResponse.json({ 
          error: `Game data wipe failed: ${e.message}`, 
          details: messages 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
