import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export async function POST(_req: Request) {
  try {
    const session = await auth();
    const permissionLevel = (session?.user?.permissionLevel as number) || 0;
    
    if (permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findFirst({
      where: { permissionLevel: { gte: 300 } }
    });

    if (!adminUser) {
      return NextResponse.json({ message: "No admin user found" }, { status: 400 });
    }

const dummyArticles = [
  {
    title: "The Evolution of Esports: Major Tournaments and the Push for Sustainability",
    slug: "esports-world-cup",
    excerpt: "Competitive gaming has transformed from grassroots LAN parties into massive, globally televised stadium events. But after a turbulent few years of bursting bubbles and VC funding drying up, the industry is finally waking up to reality. The era of unlimited spending and astronomical, unsustainable prize pools is over. The focus has firmly shifted from \"infinite growth\" to simple survival and sustainability.",
    body: "# The Evolution of Esports: Major Tournaments and the Push for Sustainability\n\nCompetitive gaming has transformed from grassroots LAN parties into massive, globally televised stadium events. But after a turbulent few years of bursting bubbles and VC funding drying up, the industry is finally waking up to reality. The era of unlimited spending and astronomical, unsustainable prize pools is over. The focus has firmly shifted from \"infinite growth\" to simple survival and sustainability.\n\n## Counter-Strike 2: Refining Perfection\n\nFollowing a somewhat rocky transition period, the professional scene for **Counter-Strike 2 (CS2)** has officially hit its stride. But let's be honest: fundamentally, this is the exact same game we've been watching for two decades. \n\nBecause the macro-formula of tactical shooters peaked years ago, Valve's updates are hyper-focused on microscopic refinements\u2014sub-tick server rates, volumetric smoke physics, and minor economy tweaks. The resulting matches are incredibly dynamic, but it proves a point: the biggest \"innovations\" left in gaming are largely invisible under-the-hood adjustments rather than sweeping gameplay revolutions.\n\n## League of Legends: Pragmatic Format Shakeups\n\nRiot Games hasn't been resting on its laurels. To combat viewer fatigue and declining engagement metrics, the League of Legends World Championship has introduced a heavily modified Swiss stage format. \n\nThis eliminates dead rubber matches and guarantees high-stakes eliminations much earlier in the tournament. Fans have widely praised the change, but it's fundamentally a pragmatic business move. Organizers can no longer afford to broadcast games that viewers don't care about. Every match has to count if the scene wants to maintain its sponsorship revenue.\n\n## Fighting Games: Steady, Sustainable Growth\n\nWith the recent launch of *Tekken 8* and ongoing support for *Street Fighter 6*, the FGC (Fighting Game Community) is experiencing a golden age. EVO reported its highest registration numbers in history.\n\nUnlike the bloated, VC-backed franchised leagues of other genres, the FGC has largely stuck to its grassroots, open-bracket foundations. It's a stark reminder that as the larger esports industry tries to reign in its bloated budgets and reset expectations, the most sustainable model might just be the oldest one we have.",
    coverImage: "/images/articles/esports-world-cup.svg",
    isPublished: true,
    promoLinks: []
  },
  {
    title: "Breaking Down the Latest GTA VI Trailer: Secrets You Missed",
    slug: "gta-6-trailer",
    excerpt: "Rockstar Games has once again broken the internet. The latest trailer for **Grand Theft Auto VI** has dropped, giving us an even deeper look into the modern rendition of Vice City and the sprawling state of Leonida. While the cinematic shots were breathtaking, they also serve as a stark reminder of where the gaming industry currently sits: we are firmly in the era of diminishing returns.",
    body: "# Breaking Down the Latest GTA VI Trailer: Secrets You Missed\n\nRockstar Games has once again broken the internet. The latest trailer for **Grand Theft Auto VI** has dropped, giving us an even deeper look into the modern rendition of Vice City and the sprawling state of Leonida. While the cinematic shots were breathtaking, they also serve as a stark reminder of where the gaming industry currently sits: we are firmly in the era of diminishing returns.\n\n## Dynamic Social Media Integration\n\nThe trailer heavily featured an in-universe social media platform resembling TikTok and Instagram Reels. Look closely at the UI during these segments: you can spot dynamic follower counts, live comments reacting to in-game events, and even players seemingly using the app to track down dynamic bounty missions. \n\nIt's an impressive simulation, but it also highlights a sobering reality. With massive, paradigm-shifting gameplay leaps largely behind us, AAA studios are now forced to innovate laterally. Instead of fundamentally reinventing how we interact with open worlds, the focus has shifted to mirroring real-world banalities with microscopic accuracy. \n\n## Expanded Wildlife and Ecosystems\n\nWe knew Leonida would feature swamps, but the trailer showcased an unprecedented level of wildlife density. In one brief shot, an alligator is seen interacting with a wild boar, completely independent of the player. \n\nIt's a beautiful technical flex, building on the impressive animal AI systems previously seen in *Red Dead Redemption 2*. However, for the average player driving down the highway at 120mph, these granular background simulations often go entirely unnoticed. It begs the question: at what point does hyper-realism stop adding meaningful value to the core gameplay loop?\n\n## Seamless Interior Transitions\n\nPay attention to the scene where Jason and Lucia enter the pawnshop. There is zero camera cut, no fade to black, and the lighting shifts dynamically as they cross the threshold. This confirms rumors that a significantly higher percentage of buildings will be fully explorable without loading screens, making Vice City feel truly continuous.\n\n## Reigning in Expectations\n\nDespite fears of a delay, the trailer confidently reaffirmed the highly anticipated launch window. With the game looking this polished, players are already gearing up for what is poised to be the biggest entertainment launch in history. \n\nBut as consumers, it's time to reign in the astronomical hype. *GTA VI* is going to be an exceptionally polished, masterfully crafted sandbox\u2014but it is still just a video game. We are at the tail end of massive graphical and mechanical advancements. Expect an incredible, highly refined iteration of the Rockstar formula, not a title that magically rewrites the laws of game design.",
    coverImage: "/images/articles/gta-6-trailer.svg",
    isPublished: true,
    promoLinks: []
  },
  {
    title: "Xbox Game Pass Expanding: New Tiers and Massive Day-One Releases",
    slug: "microsoft-xbox-game-pass",
    excerpt: "Microsoft's flagship subscription service continues to be the bedrock of the Xbox ecosystem. In a recent press release, the gaming giant outlined an aggressive new strategy for Xbox Game Pass, introducing restructured subscription tiers and a slate of highly anticipated day-one releases.",
    body: "# Xbox Game Pass Expanding: New Tiers and Massive Day-One Releases\n\nMicrosoft's flagship subscription service continues to be the bedrock of the Xbox ecosystem. In a recent press release, the gaming giant outlined an aggressive new strategy for Xbox Game Pass, introducing restructured subscription tiers and a slate of highly anticipated day-one releases.\n\n## The New Tier System\n\nIn an effort to appeal to varying types of gamers, Game Pass is being split into new specialized tiers. The \"Standard\" tier will continue to offer a rotating library of hundreds of games but will no longer include blockbuster first-party titles on day one. \n\nTo get those day-one drops, users will need to subscribe to the \"Ultimate\" tier, which continues to bundle PC access, cloud streaming, and EA Play into one comprehensive package. While the price hike has drawn some criticism, Microsoft argues the value proposition remains unmatched.\n\n## Blockbuster Day-One Drops\n\nTo soften the blow of the tier changes, Microsoft announced a staggering lineup of massive games coming to the Ultimate service on launch day. Highlighted titles include:\n\n- **DOOM: The Dark Ages**: id Software is taking the legendary shooter to a brutal medieval setting. With a shield-saw in hand, players will rip and tear through demonic hordes on day one via Game Pass.\n- **Fable**: Playground Games' complete reboot of the beloved fantasy RPG series promises irreverent British humor, gorgeous next-gen vistas, and deep magical combat. \n- **Avowed**: The massive new first-person fantasy RPG from Obsidian Entertainment transports players to the Living Lands of Eora. It promises deep tactical combat and heavy narrative choices.\n- **Indiana Jones and the Great Circle**: MachineGames is letting players step into the shoes of the iconic archaeologist in a globe-trotting adventure that blends first-person puzzles with whip-cracking action.\n\n## Cloud Gaming Goes Mainstream\n\nAlongside the library updates, Microsoft confirmed they are pushing Xbox Cloud Gaming to more devices. Dedicated smart TV apps are being updated to support 4K streaming (for Ultimate members on strong connections), further blurring the line between needing a physical console and just needing a controller.\n\nAs the industry shifts further towards digital subscriptions, Microsoft's heavy bets on Game Pass seem to be setting the tempo for the entire market.",
    coverImage: "/images/articles/microsoft-xbox-game-pass.svg",
    isPublished: true,
    promoLinks: []
  },
  {
    title: "Nintendo's Next Move: Everything We Know About the 'Switch 2'",
    slug: "nintendo-switch-2",
    excerpt: "The Nintendo Switch has enjoyed a massive, record-breaking lifecycle, but the aging hardware is finally showing its limits. With competitors pushing high-end graphics and mobile tech advancing rapidly, all eyes are on Nintendo for the highly anticipated successor, colloquially dubbed the **\"Switch 2\"**.",
    body: "# Nintendo's Next Move: Everything We Know About the 'Switch 2'\n\nThe Nintendo Switch has enjoyed a massive, record-breaking lifecycle, but the aging hardware is finally showing its limits. With competitors pushing high-end graphics and mobile tech advancing rapidly, all eyes are on Nintendo for the highly anticipated successor, colloquially dubbed the **\"Switch 2\"**.\n\n## Hybrid Functionality Returns\n\nAccording to the latest industry murmurs, Nintendo has zero intention of abandoning the hybrid console concept. The Switch 2 will remain a device you can seamlessly transition from the living room television to handheld mode on the go.\n\nHowever, the screen is rumored to be receiving a massive upgrade. Expect an 8-inch LCD at launch (with an OLED model likely to follow later), offering brighter colors, thinner bezels, and potentially a 1080p native resolution in handheld mode.\n\n## Backwards Compatibility\n\nOne of the biggest concerns for current Switch owners is their massive library of digital and physical games. Fortunately, developers who have seen the hardware behind closed doors suggest that the new system is fully backwards compatible. Not only will your old games play on the new system, but many will receive automatic performance boosts thanks to the upgraded NVIDIA Tegra chip under the hood.\n\n## The Blockbuster Software Lineup\n\nNintendo rarely launches hardware without a stellar first-party lineup. Based on the latest developer whispers, here are the heavy hitters expected to anchor the system's first year:\n\n- **A Next-Gen 3D Mario**: Speculation strongly suggests the launch window will feature a massive new 3D Mario adventure. Unlike *Odyssey*, rumors point to a fully open-world structure built from the ground up to showcase the system's enhanced draw distances and processing power.\n- **Metroid Prime 4: Beyond**: Originally teased for the base Switch, *Beyond* is now widely expected to be a cross-generation title. The Switch 2 version will reportedly run at a locked 60 FPS with significantly higher resolution textures.\n- **Pok\u00e9mon Legends: Z-A**: Returning to the Kalos region, Game Freak's next ambitious project is timed perfectly to take advantage of the Switch 2's hardware, promising a much smoother open-city experience than previous entries.\n\nWe expect an official reveal Direct later this year, with a projected launch in early spring. Stay tuned to Saints Gaming for all the latest updates!",
    coverImage: "/images/articles/nintendo-switch-2.svg",
    isPublished: true,
    promoLinks: []
  },
  {
    title: "Sony Unveils the PlayStation 5 Pro: Specs, Pricing, and Release Date",
    slug: "sony-ps5-pro",
    excerpt: "After months of rumors and speculation, Sony has officially pulled the curtain back on the **PlayStation 5 Pro**. Designed to push fidelity and framerates even further, the mid-generation refresh promises to be the ultimate console for hardcore gamers.",
    body: "# Sony Unveils the PlayStation 5 Pro: Specs, Pricing, and Release Date\n\nAfter months of rumors and speculation, Sony has officially pulled the curtain back on the **PlayStation 5 Pro**. Designed to push fidelity and framerates even further, the mid-generation refresh promises to be the ultimate console for hardcore gamers.\n\n## Under the Hood\n\nThe PS5 Pro features a significantly beefed-up GPU, boasting up to 45% faster rendering times than the standard PS5. The new architecture brings substantially improved ray tracing capabilities, allowing light to cast and reflect at speeds up to three times faster than the base console.\n\nMost notably, Sony introduced **PlayStation Spectral Super Resolution (PSSR)**. This AI-driven upscaling technology analyzes images frame-by-frame, adding incredible detail while maintaining a buttery-smooth 60 FPS (or higher) in supported titles.\n\n## What it Means for Developers\n\nGames patched to take advantage of the new hardware will feature a \"PS5 Pro Enhanced\" label. Developers can now offer fidelity modes that don't compromise on framerate, effectively merging the traditional \"Performance\" and \"Fidelity\" graphics options into a single, uncompromised experience.\n\n## Upcoming Showcase Titles\n\nTo demonstrate the raw power of the PS5 Pro, Sony has highlighted several highly anticipated upcoming releases that will take full advantage of the new hardware:\n\n- **Ghost of Y\u014dtei**: The highly anticipated follow-up to Sucker Punch's samurai epic will feature exclusive 120 FPS modes and dense, ray-traced atmospheric fog that pushes the PS5 Pro to its limits.\n- **Death Stranding 2: On The Beach**: Hideo Kojima's surreal sequel is utilizing PSSR to render photorealistic landscapes and facial animations without sacrificing the targeted 60 FPS performance.\n- **Marvel's Wolverine**: Insomniac Games is taking advantage of the accelerated ray tracing to ensure seamless, brutal combat environments where every reflection in the claw slashes is rendered in real-time.\n\n## Release Date & Pricing\n\nThe PlayStation 5 Pro will hit shelves globally this November. Given the premium components, it launches with a premium price tag of **$699.99 USD**. Pre-orders begin next week, and if history is any indication, stock is expected to sell out rapidly.\n\n*Are you planning to upgrade to the PS5 Pro, or sticking with your current console? Let us know in the forums!*",
    coverImage: "/images/articles/sony-ps5-pro.svg",
    isPublished: true,
    promoLinks: []
  },
  {
    title: "The Steam Deck OLED Review: Valve's Masterpiece Refined",
    slug: "steam-deck-oled",
    excerpt: "When Valve released the original Steam Deck, it completely upended the portable PC gaming market. Now, with the release of the **Steam Deck OLED**, they haven't just updated the screen\u2014they've refined almost every single aspect of the device to create what is arguably the greatest handheld gaming PC ever made.",
    body: "# The Steam Deck OLED Review: Valve's Masterpiece Refined\n\nWhen Valve released the original Steam Deck, it completely upended the portable PC gaming market. Now, with the release of the **Steam Deck OLED**, they haven't just updated the screen\u2014they've refined almost every single aspect of the device to create what is arguably the greatest handheld gaming PC ever made.\n\n## A Screen to Die For\n\nThe star of the show is undeniably the new HDR OLED display. Colors absolutely pop off the screen, and the true blacks make atmospheric games like *Cyberpunk 2077* and *Dead Space* look mesmerizing. Furthermore, the refresh rate has been bumped to 90Hz, making navigation and lighter indie titles feel significantly smoother.\n\n## Perfect \"Deck Verified\" Showcases\n\nIf you're picking up a new OLED Deck, you'll want games that take full advantage of the vibrant screen and the 90Hz refresh rate. Here are the upcoming and recent titles that are absolute must-plays on the device:\n\n- **Hades II**: Supergiant Games' masterful rogue-lite is practically built for the Deck. The deep, rich neon colors pop gorgeously on the OLED, and the fast-paced combat easily locks to a buttery 90 FPS.\n- **Hollow Knight: Silksong**: Whenever Team Cherry finally releases it, *Silksong* will be the ultimate handheld experience. The inky black backgrounds of Pharloom contrasting against bright, vibrant attacks make it an OLED dream.\n- **Monster Hunter Wilds**: While heavier to run, Capcom has done incredible work optimizing the RE Engine. Hunting massive beasts in dense, dynamic biomes while lying in bed is a technical marvel on the handheld.\n\n## Silent But Deadly\n\nValve didn't just stop at the screen. The internal APU has been shrunk to a more efficient 6nm process. This translates to significantly better battery life\u2014often giving players an extra 1 to 2 hours of playtime depending on the game. \n\nAdditionally, the cooling fan has been completely redesigned. Gone is the noticeable \"whine\" of the LCD model; the OLED deck is whisper quiet even under heavy load.\n\n## The Verdict\n\nIf you already own an LCD Steam Deck, the upgrade might be tough to justify purely on a performance level, as framerates remain largely identical. But for newcomers, or enthusiasts who demand the absolute best display tech, the Steam Deck OLED is an absolute triumph. Valve has cemented their place as the king of portable PC gaming.",
    coverImage: "/images/articles/steam-deck-oled.svg",
    isPublished: true,
    promoLinks: []
  },
  {
    title: "The Future of VR Gaming: Pragmatism Over Promises",
    slug: "vr-gaming-future",
    excerpt: "Virtual Reality has steadily crawled out of its niche experimental phase and established itself as a permanent\u2014if secondary\u2014pillar of the gaming industry. However, the grandiose 2016 vision of everyone strapping into matrix-style rigs has decisively died. The VR industry has hit a wall of physical and technological limitations, and manufacturers are finally admitting it. We are no longer waiting for a massive paradigm shift; we are in the era of minor refinements.",
    body: "# The Future of VR Gaming: Pragmatism Over Promises\n\nVirtual Reality has steadily crawled out of its niche experimental phase and established itself as a permanent\u2014if secondary\u2014pillar of the gaming industry. However, the grandiose 2016 vision of everyone strapping into matrix-style rigs has decisively died. The VR industry has hit a wall of physical and technological limitations, and manufacturers are finally admitting it. We are no longer waiting for a massive paradigm shift; we are in the era of minor refinements.\n\n## The Standalone Reality Check\n\nThe massive success of the Meta Quest lineup proved one indisputable fact: gamers prioritize convenience over bleeding-edge fidelity. People hate wires, and they hate spending thousands of dollars on high-end PC rigs just to play tech demos. \n\nThe latest generation of standalone headsets packs an incredible amount of mobile processing power, capable of running complex titles like *Asgard's Wrath 2*. But let's be realistic\u2014mobile chips have a hard thermal limit. While future iterations like the rumored Quest 4 might introduce eye-tracking to squeeze out more performance via foveated rendering, we are nearing the absolute ceiling of what can be crammed into a two-pound box strapped to your face.\n\n## PCVR's Diminishing Returns\n\nWhile standalone dominates the mainstream, PCVR enthusiasts are still holding onto the dream. Following the massive success of *Half-Life: Alyx*, Valve is reportedly hard at work on a successor to the Valve Index, codenamed 'Deckard'.\n\nBut even if 'Deckard' seamlessly streams high-end games wirelessly, the problem remains: AAA studios simply cannot justify the budget required to build massive, exclusive PCVR games. The install base isn't there, and it likely never will be.\n\n## Mixed Reality: The Final Gimmick?\n\nManufacturers are currently pushing AR (Augmented Reality) and Mixed Reality as the \"next big thing,\" using high-resolution passthrough cameras to project digital elements into your living room. \n\nWhile playing a tabletop strategy game projected onto your coffee table is a neat party trick, it fundamentally isn't the immersive escapism that core gamers want. As we move forward, the most valuable advancements in VR won't be revolutionary new game formats, but pragmatic hardware adjustments: making headsets lighter, cheaper, and slightly more comfortable. The wild west of VR hardware is over; welcome to the long, slow grind of iterative refinement.",
    coverImage: "/images/articles/vr-gaming-future.svg",
    isPublished: true,
    promoLinks: []
  },
];


    let createdCount = 0;

    for (const article of dummyArticles) {
      const existing = await prisma.newsArticle.findUnique({
        where: { slug: article.slug }
      });

      if (!existing) {
        await prisma.newsArticle.create({
          data: {
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            body: article.body,
            coverImage: article.coverImage,
            isPublished: article.isPublished,
            publishedAt: new Date(),
            authorId: adminUser.id,
            promoLinks: undefined
          }
        });
        createdCount++;
      }
    }

    // --- Seed Dummy Forums ---
    const communityCat = await prisma.forumCategory.upsert({
      where: { slug: "community" },
      update: {},
      create: {
        name: "Community",
        slug: "community",
        description: "General discussions, rules, and announcements.",
        order: 1,
        icon: "Home"
      }
    });

    const announcementsSub = await prisma.subCategory.upsert({
      where: { slug: "announcements-rules" },
      update: {},
      create: {
        name: "Announcements & Rules",
        slug: "announcements-rules",
        description: "Important community updates and guidelines.",
        categoryId: communityCat.id,
        order: 1
      }
    });

    await prisma.subCategory.upsert({
      where: { slug: "general-discussion" },
      update: {},
      create: {
        name: "General Discussion",
        slug: "general-discussion",
        description: "Talk about anything related to gaming and the community.",
        categoryId: communityCat.id,
        order: 2
      }
    });

    const showcaseSub = await prisma.subCategory.upsert({
      where: { slug: "showcase" },
      update: {},
      create: {
        name: "Showcase",
        slug: "showcase",
        description: "Show off your gaming setups, art, and projects.",
        categoryId: communityCat.id,
        order: 3
      }
    });

    const threadsToCreate = [
      {
        title: "Welcome to Saints Gaming!",
        slug: "welcome-to-saints-gaming",
        body: "Welcome to the official Saints Gaming community! We're glad to have you here. This is a place to relax, discuss games, and meet new people. Please be respectful to one another and enjoy your stay!",
        subcategoryId: announcementsSub.id,
        isPinned: true,
        isLocked: false
      },
      {
        title: "Community Rules & Guidelines",
        slug: "community-rules-guidelines",
        body: "To keep this community a great place for everyone, please follow these rules:\n\n1. Treat everyone with respect.\n2. No spamming or excessive self-promotion.\n3. Keep conversations civil and welcoming.\n4. Do not share illicit or inappropriate content.\n\nFailure to follow these guidelines may result in a warning or ban. Thank you for helping keep Saints Gaming awesome!",
        subcategoryId: announcementsSub.id,
        isPinned: true,
        isLocked: true
      },
      {
        title: "Share your gaming setups!",
        slug: "share-your-gaming-setups",
        body: "Got a cool gaming rig, a massive game collection, or some awesome fan art? Share it here! We'd love to see what our community members are playing on.",
        subcategoryId: showcaseSub.id,
        isPinned: false,
        isLocked: false
      }
    ];

    let threadsCreated = 0;
    for (const t of threadsToCreate) {
      const existingThread = await prisma.thread.findUnique({ where: { slug: t.slug } });
      if (!existingThread) {
        await prisma.thread.create({
          data: {
            title: t.title,
            slug: t.slug,
            body: t.body,
            subcategoryId: t.subcategoryId,
            authorId: adminUser.id,
            isPinned: t.isPinned,
            isLocked: t.isLocked
          }
        });
        threadsCreated++;
      }
    }

    return NextResponse.json({ success: true, message: `Pushed ${createdCount} dummy articles and ${threadsCreated} forum threads.` });
  } catch (error) {
    console.error("Seed dummy content error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
