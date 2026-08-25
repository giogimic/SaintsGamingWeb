'use server';

import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { PERMISSION_LEVELS } from '@/web/lib/permissions';
import { revalidatePath } from 'next/cache';

async function verifyDevAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return false;
  return user.permissionLevel >= PERMISSION_LEVELS.DEVELOPER;
}

// ─── QUEST ACTIONS ──────────────────────────────────────────────

export async function createGameQuest(data: {
  name: string;
  npcId: string;
  description: string;
  dialogStart: string;
  dialogProgress: string;
  dialogComplete: string;
  reqItemId?: string;
  reqAmount?: number;
  reqSkillId?: string;
  reqLevel?: number;
  rewardXp?: number;
  rewardCredits?: number;
  rewardItemId?: string;
  rewardAmount?: number;
}) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    const quest = await prisma.gameQuest.create({
      data: {
        name: data.name,
        npcId: data.npcId,
        description: data.description,
        dialogStart: data.dialogStart,
        dialogProgress: data.dialogProgress,
        dialogComplete: data.dialogComplete,
        reqItemId: data.reqItemId || null,
        reqAmount: data.reqAmount || 0,
        reqSkillId: data.reqSkillId || null,
        reqLevel: data.reqLevel || 0,
        rewardXp: data.rewardXp || 0,
        rewardCredits: data.rewardCredits || 0,
        rewardItemId: data.rewardItemId || null,
        rewardAmount: data.rewardAmount || 0,
      }
    });

    revalidatePath('/admin/game-dev/quests');
    return { success: true, quest };
  } catch (err) {
    console.error('Failed to create quest:', err);
    return { success: false, error: 'Failed to create quest' };
  }
}

export async function deleteGameQuest(id: string) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    await prisma.gameQuest.delete({ where: { id } });
    revalidatePath('/admin/game-dev/quests');
    return { success: true };
  } catch (err) {
    console.error('Failed to delete quest:', err);
    return { success: false, error: 'Failed to delete quest' };
  }
}

export async function fetchAllGameQuests() {
  try {
    const quests = await prisma.gameQuest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: quests };
  } catch (err) {
    console.error('Failed to fetch quests:', err);
    return { success: false, error: 'Failed to fetch quests', data: [] };
  }
}

// ─── ASSET ACTIONS ──────────────────────────────────────────────

export async function createGameAsset(data: {
  name?: string;
  category?: string;
  subCategory?: string;
  filePath?: string;
  width?: number;
  height?: number;
  type?: string;
  source?: string;
  tags?: string[];
  categories?: string[];
  metadata?: any;
}) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    const type = data.type || (data.category?.toUpperCase() === 'TERRAIN' ? 'TILESET' : 'SPRITE');
    const source = data.source || data.filePath || '';
    const tags = data.tags || (data.category ? [data.category.toLowerCase()] : []);
    const categories = data.categories || (data.category ? [data.category.toLowerCase()] : []);
    const metadata = data.metadata || { width: data.width || 16, height: data.height || 16, name: data.name };

    const asset = await prisma.gameAsset.create({
      data: {
        type,
        source,
        tags: JSON.stringify(tags),
        categories: JSON.stringify(categories),
        metadata: JSON.stringify(metadata),
      }
    });

    revalidatePath('/admin/game-dev/assets');
    return { success: true, asset };
  } catch (err) {
    console.error('Failed to create asset:', err);
    return { success: false, error: 'Failed to create asset' };
  }
}

export async function deleteGameAsset(id: string) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    await prisma.gameAsset.delete({ where: { id } });
    revalidatePath('/admin/game-dev/assets');
    return { success: true };
  } catch (err) {
    console.error('Failed to delete asset:', err);
    return { success: false, error: 'Failed to delete asset' };
  }
}

export async function fetchAllGameAssets() {
  try {
    const rawAssets = await prisma.gameAsset.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const assets = rawAssets.map((asset) => {
      let parsedMetadata: any = {};
      let parsedTags: string[] = [];
      let parsedCategories: string[] = [];

      try {
        parsedMetadata = asset.metadata ? JSON.parse(asset.metadata) : {};
      } catch {
        parsedMetadata = {};
      }

      try {
        parsedTags = asset.tags ? JSON.parse(asset.tags) : [];
      } catch {
        parsedTags = [];
      }

      try {
        parsedCategories = asset.categories ? JSON.parse(asset.categories) : [];
      } catch {
        parsedCategories = [];
      }

      const sourceUrl = asset.cdnUrl || asset.source || '';
      const filename = sourceUrl ? sourceUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') : '';
      const name = parsedMetadata.name || parsedMetadata.displayName || filename || `Asset ${asset.id.slice(-6)}`;

      let category = 'Environment';
      const catLower = [
        ...parsedCategories.map((c) => String(c).toLowerCase()),
        ...parsedTags.map((t) => String(t).toLowerCase()),
        (asset.type || '').toLowerCase(),
      ];

      if (catLower.some((c) => c.includes('terrain') || c.includes('tile') || c.includes('ground') || c.includes('floor') || c.includes('wall'))) {
        category = 'Terrain';
      } else if (catLower.some((c) => c.includes('monster') || c.includes('beast') || c.includes('creature'))) {
        category = 'Monsters/Beasts';
      } else if (catLower.some((c) => c.includes('npc') || c.includes('char') || c.includes('hero') || c.includes('player') || c.includes('sprite'))) {
        category = 'NPCs';
      } else if (catLower.some((c) => c.includes('item') || c.includes('icon') || c.includes('equipment') || c.includes('weapon') || c.includes('potion'))) {
        category = 'Items';
      } else if (catLower.some((c) => c.includes('env') || c.includes('prop') || c.includes('decor') || c.includes('building') || c.includes('tree'))) {
        category = 'Environment';
      } else if (asset.type === 'TILESET') {
        category = 'Terrain';
      } else if (asset.type === 'SPRITE') {
        category = 'NPCs';
      } else if (asset.type === 'ITEM_ICON') {
        category = 'Items';
      }

      const filePath = asset.cdnUrl || asset.source || '';

      return {
        id: asset.id,
        name,
        category,
        filePath,
        source: asset.source,
        cdnUrl: asset.cdnUrl,
        type: asset.type,
        tags: parsedTags,
        categories: parsedCategories,
        metadata: parsedMetadata,
        createdAt: asset.createdAt,
      };
    });

    return { success: true, data: assets };
  } catch (err) {
    console.error('Failed to fetch assets:', err);
    return { success: false, error: 'Failed to fetch assets', data: [] };
  }
}

// ─── DUMMY CONTENT SEED ACTION ───────────────────────────────────

export async function seedDummyContentAction() {
  try {
    const session = await auth();
    const permissionLevel = (session?.user?.permissionLevel as number) || 0;

    // Staff authorization check
    if (permissionLevel < PERMISSION_LEVELS.ADMIN && permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
      // Check if session user has staff permission in DB directly
      if (session?.user?.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!dbUser || dbUser.permissionLevel < PERMISSION_LEVELS.ADMIN) {
          return { success: false, error: 'Unauthorized: Admin permissions required.' };
        }
      } else {
        return { success: false, error: 'Unauthorized: Admin permissions required.' };
      }
    }

    // 1. Author Resolution (guaranteed non-null)
    let author = null;
    if (session?.user?.id) {
      author = await prisma.user.findUnique({ where: { id: session.user.id } });
    }
    if (!author) {
      author = await prisma.user.findFirst({
        where: { permissionLevel: { gte: 100 } },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!author) {
      author = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    }
    if (!author) {
      author = await prisma.user.create({
        data: {
          username: 'SaintsAdmin',
          email: 'admin@saintsgaming.net',
          permissionLevel: PERMISSION_LEVELS.DEVELOPER,
          isVIP: true,
          isFounder: true,
        },
      });
    }

    // 2. Dummy News Articles
    const dummyArticles = [
      {
        title: "The Evolution of Esports: Major Tournaments and the Push for Sustainability",
        slug: "esports-world-cup",
        excerpt: "Competitive gaming has transformed from grassroots LAN parties into massive, globally televised stadium events. The era of unsustainable spending has shifted toward survival and long-term sustainability.",
        body: "# The Evolution of Esports: Major Tournaments and the Push for Sustainability\n\nCompetitive gaming has transformed from grassroots LAN parties into massive, globally televised stadium events. But after a turbulent few years of bursting bubbles and VC funding drying up, the industry is finally waking up to reality.\n\n## Counter-Strike 2: Refining Perfection\n\nFollowing a transition period, the professional scene for **Counter-Strike 2 (CS2)** has officially hit its stride. Valve's updates are hyper-focused on microscopic refinements—sub-tick server rates, volumetric smoke physics, and minor economy tweaks.\n\n## Fighting Games: Steady, Sustainable Growth\n\nWith the launch of *Tekken 8* and ongoing support for *Street Fighter 6*, the FGC is experiencing a golden age.",
        coverImage: "/images/articles/esports-world-cup.svg",
      },
      {
        title: "Breaking Down the Latest GTA VI Trailer: Secrets You Missed",
        slug: "gta-6-trailer",
        excerpt: "Rockstar Games has dropped a deep look into the modern rendition of Vice City and the state of Leonida. Here is what we spotted in the footage.",
        body: "# Breaking Down the Latest GTA VI Trailer: Secrets You Missed\n\nRockstar Games has once again delivered an unprecedented look at open-world fidelity in Vice City.\n\n## Dynamic Social Media Integration\n\nThe trailer heavily featured in-universe social media platforms mirroring dynamic comments, follower counts, and real-time world events.\n\n## Seamless Interior Transitions\n\nNo camera cuts or loading screens when transitioning into buildings.",
        coverImage: "/images/articles/gta-6-trailer.svg",
      },
      {
        title: "Xbox Game Pass Expanding: New Tiers and Massive Day-One Releases",
        slug: "microsoft-xbox-game-pass",
        excerpt: "Microsoft outlines new tiers and blockbuster day-one releases arriving on Xbox Game Pass this season.",
        body: "# Xbox Game Pass Expanding: New Tiers and Massive Day-One Releases\n\nMicrosoft's subscription service continues to expand with day-one first-party titles, cloud streaming enhancements, and multi-device access.",
        coverImage: "/images/articles/microsoft-xbox-game-pass.svg",
      },
      {
        title: "Nintendo's Next Move: Everything We Know About the 'Switch 2'",
        slug: "nintendo-switch-2",
        excerpt: "From hybrid console continuity to backwards compatibility and next-gen 3D titles, here is what is expected from the upcoming hardware.",
        body: "# Nintendo's Next Move: Everything We Know About the 'Switch 2'\n\nNintendo continues to build on the hybrid form factor with enhanced resolution, backwards compatibility, and custom NVIDIA silicon.",
        coverImage: "/images/articles/nintendo-switch-2.svg",
      },
      {
        title: "Sony Unveils the PlayStation 5 Pro: Specs, Pricing, and Release Date",
        slug: "sony-ps5-pro",
        excerpt: "Sony officially details the PlayStation 5 Pro with upgraded GPU power, advanced ray tracing, and PSSR upscaling.",
        body: "# Sony Unveils the PlayStation 5 Pro: Specs, Pricing, and Release Date\n\nFaster rendering, AI upscaling with PlayStation Spectral Super Resolution (PSSR), and enhanced fidelity modes.",
        coverImage: "/images/articles/sony-ps5-pro.svg",
      },
      {
        title: "The Steam Deck OLED Review: Valve's Masterpiece Refined",
        slug: "steam-deck-oled",
        excerpt: "Valve refines portable PC gaming with a 90Hz HDR OLED display, improved battery efficiency, and silent cooling.",
        body: "# The Steam Deck OLED Review: Valve's Masterpiece Refined\n\nVibrant HDR OLED panel, 6nm APU efficiency, and a redesigned whisper-quiet cooling fan.",
        coverImage: "/images/articles/steam-deck-oled.svg",
      },
      {
        title: "The Future of VR Gaming: Pragmatism Over Promises",
        slug: "vr-gaming-future",
        excerpt: "Standalone headsets, lighter form factors, and realistic expectations define the next phase of virtual reality.",
        body: "# The Future of VR Gaming: Pragmatism Over Promises\n\nConvenience and standalone comfort take priority as manufacturers optimize display optics and battery performance.",
        coverImage: "/images/articles/vr-gaming-future.svg",
      },
    ];

    let createdArticles = 0;
    for (let i = 0; i < dummyArticles.length; i++) {
      const a = dummyArticles[i];
      const publishedAt = new Date(Date.now() - (dummyArticles.length - i) * 86400000);
      await prisma.newsArticle.upsert({
        where: { slug: a.slug },
        update: {
          title: a.title,
          excerpt: a.excerpt,
          body: a.body,
          coverImage: a.coverImage,
          isPublished: true,
          publishedAt,
        },
        create: {
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt,
          body: a.body,
          coverImage: a.coverImage,
          isPublished: true,
          publishedAt,
          authorId: author.id,
        },
      });
      createdArticles++;
    }

    // 3. Modpacks
    await prisma.modpack.upsert({
      where: { slug: 'saints-gaming-qol' },
      update: {},
      create: {
        name: 'Saints Gaming - QoL Enhancer',
        slug: 'saints-gaming-qol',
        game: 'Palworld',
        description: 'Official client mod pack required for Saints Gaming servers.',
        version: '1.5.1',
        installNotes: 'Extract into your game Content directory.',
      },
    });

    // 4. Forum Categories & Subcategories
    const communityCat = await prisma.forumCategory.upsert({
      where: { slug: 'community' },
      update: {
        name: 'Community & Discussions',
        description: 'General discussions, community showcase, and announcements.',
      },
      create: {
        name: 'Community & Discussions',
        slug: 'community',
        description: 'General discussions, community showcase, and announcements.',
        order: 1,
        icon: 'Home',
      },
    });

    const announcementsSub = await prisma.subCategory.upsert({
      where: { slug: 'announcements-rules' },
      update: {
        name: 'Announcements & Rules',
        description: 'Important community updates and guidelines.',
        categoryId: communityCat.id,
      },
      create: {
        name: 'Announcements & Rules',
        slug: 'announcements-rules',
        description: 'Important community updates and guidelines.',
        categoryId: communityCat.id,
        order: 1,
      },
    });

    const generalSub = await prisma.subCategory.upsert({
      where: { slug: 'general-discussion' },
      update: {
        name: 'General Discussion',
        description: 'Talk about anything related to gaming and the community.',
        categoryId: communityCat.id,
      },
      create: {
        name: 'General Discussion',
        slug: 'general-discussion',
        description: 'Talk about anything related to gaming and the community.',
        categoryId: communityCat.id,
        order: 2,
      },
    });

    const showcaseSub = await prisma.subCategory.upsert({
      where: { slug: 'showcase' },
      update: {
        name: 'Showcase & Setups',
        description: 'Show off your gaming setups, art, and creations.',
        categoryId: communityCat.id,
      },
      create: {
        name: 'Showcase & Setups',
        slug: 'showcase',
        description: 'Show off your gaming setups, art, and creations.',
        categoryId: communityCat.id,
        order: 3,
      },
    });

    // 5. Threads
    const threadsToCreate = [
      {
        title: 'Welcome to Saints Gaming!',
        slug: 'welcome-to-saints-gaming',
        body: 'Welcome to the official Saints Gaming community! Explore the MMO lobby, customize your Saint operative, build in World Studio, and enjoy your stay.',
        subcategoryId: announcementsSub.id,
        isPinned: true,
        isLocked: false,
      },
      {
        title: 'Community Rules & Guidelines',
        slug: 'community-rules-guidelines',
        body: 'Treat everyone with respect, keep discussions welcoming, and report any bugs in the support section.',
        subcategoryId: announcementsSub.id,
        isPinned: true,
        isLocked: true,
      },
      {
        title: 'Share your gaming setups & Studio maps!',
        slug: 'share-your-gaming-setups',
        body: 'Got a cool gaming rig, screenshots, or custom maps made in World Studio? Post them here!',
        subcategoryId: showcaseSub.id,
        isPinned: false,
        isLocked: false,
      },
      {
        title: 'General Discussion — What are you playing this week?',
        slug: 'general-gaming-discussion',
        body: 'Drop your favorite games, current MMO character builds, and recommendations below!',
        subcategoryId: generalSub.id,
        isPinned: false,
        isLocked: false,
      },
    ];

    let createdThreads = 0;
    for (const t of threadsToCreate) {
      await prisma.thread.upsert({
        where: { slug: t.slug },
        update: {
          title: t.title,
          body: t.body,
          isPinned: t.isPinned,
          isLocked: t.isLocked,
        },
        create: {
          title: t.title,
          slug: t.slug,
          body: t.body,
          subcategoryId: t.subcategoryId,
          authorId: author.id,
          isPinned: t.isPinned,
          isLocked: t.isLocked,
        },
      });
      createdThreads++;
    }

    revalidatePath('/news');
    revalidatePath('/forum');
    revalidatePath('/admin/dev');

    return {
      success: true,
      message: `Pushed ${createdArticles} news articles and ${createdThreads} forum threads successfully!`,
    };
  } catch (err: any) {
    console.error('[seedDummyContentAction] Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to seed dummy content.',
    };
  }
}
