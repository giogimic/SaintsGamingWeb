import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { permissionLevel: { gte: 300 } }
  });

  if (!adminUser) {
    console.error("Missing admin user");
    return;
  }

  // Generate 18 news articles to make it crowded (2 full pages of 9)
  const newsTitles = [
    "The Evolution of Cloud Gaming in 2026",
    "Top 10 Indie Games You Missed This Year",
    "Hardware Review: The New RTX 6080 Ti",
    "Esports Update: The Underdogs Take the Championship",
    "Interview with the Developers of 'Neon Nights'",
    "The Resurgence of Couch Co-Op Games",
    "Why VR is Finally Going Mainstream",
    "A Look Back at the Best RPGs of the Decade",
    "How AI is Changing Game Development",
    "The Most Anticipated MMOs of Next Year",
    "Speedrunning World Record Broken After 5 Years",
    "The Art of Level Design in Modern Platformers",
    "Understanding the New Battle Pass Mechanics",
    "Retro Gaming: Why the Classics Never Die",
    "The Impact of Streaming on Competitive Gaming",
    "Upcoming Balance Changes in the Next Patch",
    "The Rise of Mobile Esports Tournaments",
    "Deep Dive into the Lore of the New Expansion"
  ];

  const newsBody = `This is a detailed analysis of the topic. The gaming industry continues to evolve at a rapid pace, bringing new challenges and innovations. Players and developers alike are finding new ways to push the boundaries of what is possible. 

## The Core Features
From enhanced graphics to deeper narrative structures, the focus remains on delivering an unforgettable experience. The community's feedback has been instrumental in shaping these changes.

## What's Next?
As we look to the future, it's clear that the landscape will continue to shift. We'll be keeping a close eye on these developments and providing updates as they happen. Stay tuned for more deep dives and reviews!`;

  console.log("Seeding News Articles...");
  for (let i = 0; i < newsTitles.length; i++) {
    const title = newsTitles[i];
    const slug = generateSlug(title);
    
    // Spread them out over the past few weeks
    const date = new Date();
    date.setDate(date.getDate() - i);

    const existing = await prisma.newsArticle.findUnique({ where: { slug } });
    if (!existing) {
      await prisma.newsArticle.create({
        data: {
          title,
          slug,
          excerpt: `A quick look into ${title.toLowerCase()} and what it means for the community.`,
          body: `# ${title}\n\n${newsBody}`,
          isPublished: true,
          publishedAt: date,
          authorId: adminUser.id,
        }
      });
    }
  }

  // Generate 6 forum threads to make it full but not crowded
  const genDiscSub = await prisma.subCategory.findFirst({
    where: { slug: "general-discussion" }
  });

  if (genDiscSub) {
    console.log("Seeding Forum Threads...");
    const threadTitles = [
      "What are you currently playing?",
      "Looking for a group for the new raid",
      "Hardware advice: Upgrading my CPU",
      "Thoughts on the recent game awards?",
      "Favorite game soundtracks of all time?",
      "Weekend community event suggestions"
    ];

    for (const title of threadTitles) {
      const slug = generateSlug(title);
      const existing = await prisma.thread.findUnique({ where: { slug } });
      if (!existing) {
        await prisma.thread.create({
          data: {
            title,
            slug,
            body: `I wanted to start a discussion about ${title.toLowerCase()}. What does everyone think? Let me know your thoughts and recommendations!`,
            subcategoryId: genDiscSub.id,
            authorId: adminUser.id,
          }
        });
      }
    }
  }

  console.log("Seeding complete!");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
