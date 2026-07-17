import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with dummy data...");

  // 1. Get an existing admin user, or fallback to any user for authorship
  let author = await prisma.user.findFirst({
    where: { permissionLevel: { gte: 100 } },
    orderBy: { createdAt: 'asc' }
  });

  if (!author) {
    author = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });
  }

  if (!author) {
    console.warn("No users found. Will skip seeding content that requires an author (News, Threads).");
  }

  // 2. Seed News Articles
  const newsArticles = [
    { title: "Welcome to Saints Gaming 2.0!", excerpt: "Announcing the launch of the new website...", body: "# Welcome!\nWe are live." },
    { title: "Palworld Server Wipes & Fresh Start", excerpt: "Detailing the schedule for the upcoming wipes...", body: "Wipe incoming this weekend!" },
    { title: "Community Event: Pal Catching Contest", excerpt: "A weekend event where players compete...", body: "Win custom prizes!" },
    { title: "Hardware Upgrades Completed", excerpt: "News about migrating our backend...", body: "NVMe drives installed." },
    { title: "New Mod Pack Released (v1.4)", excerpt: "Highlighting the QoL mods added...", body: "Download it now." },
    { title: "Admin Team Expansion - Now Hiring", excerpt: "Opening applications for new mods...", body: "Apply inside." },
    { title: "Palworld Patch 0.2.0: What You Need to Know", excerpt: "A breakdown of the latest patch...", body: "Lots of balance changes." },
    { title: "Discord Integration is Live", excerpt: "Explaining how users can link Discord...", body: "Link your accounts today." },
    { title: "Rule Changes: Base Building Limits", excerpt: "Addressing server lag...", body: "New limits on foundations." },
    { title: "Player Spotlight of the Month", excerpt: "Highlighting a community member...", body: "Great castle build!" },
  ];

  if (author) {
    for (let i = 0; i < newsArticles.length; i++) {
      const a = newsArticles[i];
      await prisma.newsArticle.upsert({
        where: { slug: `news-article-${i}` },
        update: {},
        create: {
          title: a.title,
          slug: `news-article-${i}`,
          excerpt: a.excerpt,
          body: a.body,
          isPublished: true,
          authorId: author.id,
        },
      });
    }
    console.log(`Seeded ${newsArticles.length} news articles.`);
  } else {
    console.log("Skipped seeding news articles (no author found).");
  }

  // 3. Seed Modpack
  await prisma.modpack.upsert({
    where: { slug: "saints-gaming-qol" },
    update: {},
    create: {
      name: "Saints Gaming - QoL Enhancer",
      slug: "saints-gaming-qol",
      game: "Palworld",
      description: "The official mod pack required to play on our servers. Includes essential client-side mods for UI improvements and performance.",
      version: "1.4.2",
      installNotes: "Extract the ModPack.zip into your \\Palworld\\Pal\\Content\\Paks directory!",
    },
  });

  await prisma.modpack.upsert({
    where: { slug: "dimensional-pixelmon" },
    update: {},
    create: {
      name: "Dimensional Pixelmon",
      slug: "dimensional-pixelmon",
      game: "Minecraft",
      description: "The official Dimensional Pixelmon modpack.",
      version: "1.0",
      downloadUrl: "http://www.technicpack.net/modpack/dimensional-pixelmon.136119",
    },
  });
  console.log("Seeded Modpacks.");

  // 4. Seed Forum Categories & Threads
  const categories = [
    { 
      name: "Community", 
      slug: "community",
      subcategories: [
        { name: "Rules & Guidelines", slug: "rules", description: "Official rules for Saints Gaming" },
        { name: "Announcements", slug: "announcements", description: "Official announcements and updates" },
        { name: "General Discussion", slug: "general-discussion", description: "Discuss anything gaming related" }
      ]
    },
    { 
      name: "Palworld Servers", 
      slug: "palworld",
      subcategories: [
        { name: "Palworld General", slug: "palworld-general", description: "General discussion for Palworld" },
        { name: "Tribes & Recruitment", slug: "palworld-tribes", description: "Find players for your tribe" }
      ]
    },
    { 
      name: "Support", 
      slug: "support",
      subcategories: [
        { name: "Bug Reports", slug: "bug-reports", description: "Report bugs in the game or website" },
        { name: "Help & Questions", slug: "help", description: "Ask for help from the community" }
      ]
    },
  ];

  for (const cat of categories) {
    const category = await prisma.forumCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        order: categories.indexOf(cat),
      }
    });

    for (const sub of cat.subcategories) {
      const subcategory = await prisma.subCategory.upsert({
        where: { slug: sub.slug },
        update: {},
        create: {
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          categoryId: category.id,
          order: cat.subcategories.indexOf(sub)
        }
      });

      // Add a dummy thread for each subcategory
      if (author) {
        if (sub.slug === "rules") {
          await prisma.thread.upsert({
            where: { slug: "official-community-rules" },
            update: {},
            create: {
              title: "Official Community Rules",
              slug: "official-community-rules",
              body: "# Saints Gaming Community Rules\n\nWelcome to Saints Gaming! To ensure a fun and safe environment for everyone, please adhere to the following rules:\n\n### 1. Be Respectful\nNo racism, sexism, homophobia, or hate speech of any kind. Treat others how you want to be treated.\n\n### 2. No Cheating or Exploiting\nUsing third-party software to gain an unfair advantage will result in a permanent ban. Report any exploits you find to the staff immediately.\n\n### 3. No Spam or Advertising\nDo not spam the chat or forums. Advertising other servers or communities is strictly prohibited.\n\n### 4. Keep it SFW\nNo NSFW content, including text, images, or links. This is a family-friendly community.\n\n### 5. Listen to Staff\nThe decisions of the staff team are final. If you have an issue with a staff member, please open a support ticket.\n\nFailure to follow these rules may result in a warning, kick, or ban. Thank you for being a part of Saints Gaming!",
              isPinned: true,
              isLocked: true,
              authorId: author.id,
              subcategoryId: subcategory.id,
            }
          });
        } else if (sub.slug === "announcements") {
          await prisma.thread.upsert({
            where: { slug: "welcome-to-the-forums" },
            update: {},
            create: {
              title: "Welcome to the new Forums!",
              slug: "welcome-to-the-forums",
              body: "Welcome to the newly revamped Saints Gaming forums! We are excited to launch this new platform. Feel free to explore, introduce yourself, and start engaging with the community.",
              isPinned: true,
              authorId: author.id,
              subcategoryId: subcategory.id,
            }
          });
        } else {
          await prisma.thread.upsert({
            where: { slug: `welcome-${sub.slug}` },
            update: {},
            create: {
              title: `Welcome to ${sub.name}`,
              slug: `welcome-${sub.slug}`,
              body: `This is the official discussion board for ${sub.name}. Please follow the community rules when posting.`,
              authorId: author.id,
              subcategoryId: subcategory.id,
            }
          });
        }
      }
    }
  }
  console.log("Seeded Forum Categories and Threads.");

  // 5. Seed Game Servers
  const servers = [
    { name: "Saints Gaming - Palworld #1", game: "Palworld", ip: "192.168.1.100", port: 8211 },
    { name: "Saints Gaming - Palworld #2", game: "Palworld", ip: "192.168.1.100", port: 8214 },
    { name: "Saints Gaming - Palworld #3", game: "Palworld", ip: "192.168.1.100", port: 8215 },
  ];

  for (const s of servers) {
    const count = await prisma.gameServer.count({ where: { port: s.port } });
    if (count === 0) {
      await prisma.gameServer.create({
        data: s
      });
    }
  }
  console.log("Seeded Game Servers.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
