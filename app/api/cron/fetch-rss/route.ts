import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { PERMISSION_LEVELS } from "@/lib/permissions";

const parser = new Parser();

export async function GET(req: Request) {
  // Protect the route using a CRON_SECRET if we are in production
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (process.env.NODE_ENV === "production" && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Fetch active RSS feeds from the database
    const feeds = await prisma.rssFeed.findMany({
      where: { isActive: true }
    });

    if (feeds.length === 0) {
      return NextResponse.json({ message: "No active RSS feeds found." });
    }

    // 2. Find an Admin user to assign as the author (or the first user if no admin exists)
    let systemUser = await prisma.user.findFirst({
      where: { permissionLevel: { gte: PERMISSION_LEVELS.ADMIN } }
    });

    if (!systemUser) {
      systemUser = await prisma.user.findFirst();
      if (!systemUser) {
        return NextResponse.json({ message: "No users found in database to author articles." }, { status: 500 });
      }
    }

    let totalInserted = 0;

    // 3. Process each feed
    for (const feed of feeds) {
      try {
        const parsedFeed = await parser.parseURL(feed.url);
        
        for (const item of parsedFeed.items) {
          if (!item.title) continue;

          // Generate a base slug
          const baseSlug = item.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");

          // Check if article with this exact title already exists to prevent duplicates across runs
          const existingByTitle = await prisma.newsArticle.findFirst({
            where: { title: item.title }
          });

          if (existingByTitle) {
            continue; // Skip, we already fetched this article
          }

          // Ensure slug uniqueness
          let slug = baseSlug;
          let counter = 1;
          while (await prisma.newsArticle.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }

          const bodyContent = item.content || item.description || "Read more at the original source.";
          const excerptText = item.contentSnippet || item.description || "Read more at the original source.";

          // Extract a cover image if one exists in the enclosure or content
          let coverImage = null;
          if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith("image/")) {
            coverImage = item.enclosure.url;
          }

          // Fallback to SVG placeholder if no image
          if (!coverImage) {
            coverImage = "/images/gaming/placeholder.svg";
          }

          await prisma.newsArticle.create({
            data: {
              title: item.title,
              slug,
              excerpt: excerptText.substring(0, 200) + (excerptText.length > 200 ? "..." : ""),
              body: `> *Original Article published on [${feed.title}](${item.link})*\n\n` + bodyContent,
              coverImage,
              isPublished: true,
              publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
              authorId: systemUser.id,
            }
          });

          totalInserted++;
        }
      } catch (feedError) {
        console.error(`Error parsing feed ${feed.title} (${feed.url}):`, feedError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${feeds.length} feeds. Inserted ${totalInserted} new articles.` 
    });

  } catch (error) {
    console.error("RSS fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
