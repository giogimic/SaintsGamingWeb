import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { rateLimit, getClientIp } from "@/web/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const { allowed } = rateLimit(`search:${getClientIp(req)}`, 60, 60_000); // 60 requests per minute
    if (!allowed) {
      return NextResponse.json({ message: "Too many search requests. Please slow down." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const category = searchParams.get("type"); // optional category filter

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        threads: [],
        articles: [],
        posts: [],
        maps: [],
        modpacks: [],
        users: [],
        totalCount: 0,
      });
    }

    const searchTerm = query.trim();

    // Query all entities concurrently
    const [threads, articles, posts, maps, modpacks, users] = await Promise.all([
      // 1. Forum Threads
      (!category || category === "all" || category === "threads")
        ? prisma.thread.findMany({
            where: {
              OR: [
                { title: { contains: searchTerm } },
                { body: { contains: searchTerm } },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              body: true,
              isPinned: true,
              createdAt: true,
              viewCount: true,
              author: {
                select: {
                  username: true,
                  displayName: true,
                  image: true,
                },
              },
              subcategory: {
                select: {
                  name: true,
                  slug: true,
                },
              },
              _count: {
                select: {
                  replies: true,
                },
              },
            },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            take: 6,
          })
        : Promise.resolve([]),

      // 2. News & Announcements
      (!category || category === "all" || category === "news")
        ? prisma.newsArticle.findMany({
            where: {
              isPublished: true,
              OR: [
                { title: { contains: searchTerm } },
                { excerpt: { contains: searchTerm } },
                { content: { contains: searchTerm } },
              ],
            },
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              coverImage: true,
              publishedAt: true,
              category: true,
            },
            orderBy: { publishedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),

      // 3. Social Feed Posts & Clips
      (!category || category === "all" || category === "feed")
        ? prisma.socialPost.findMany({
            where: {
              visibility: "PUBLIC",
              parentId: null,
              body: { contains: searchTerm },
            },
            select: {
              id: true,
              body: true,
              mediaUrl: true,
              thumbnailUrl: true,
              createdAt: true,
              viewCount: true,
              author: {
                select: {
                  username: true,
                  displayName: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  reactions: true,
                  replies: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),

      // 4. World Maps & MMO Regions
      (!category || category === "all" || category === "maps")
        ? prisma.worldMap.findMany({
            where: {
              OR: [
                { id: { contains: searchTerm } },
                { name: { contains: searchTerm } },
                { description: { contains: searchTerm } },
                { biome: { contains: searchTerm } },
              ],
            },
            select: {
              id: true,
              name: true,
              description: true,
              biome: true,
              recommendedLevel: true,
            },
            take: 5,
          })
        : Promise.resolve([]),

      // 5. Modpacks & Game Servers
      (!category || category === "all" || category === "modpacks")
        ? prisma.modpack.findMany({
            where: {
              OR: [
                { name: { contains: searchTerm } },
                { description: { contains: searchTerm } },
                { game: { contains: searchTerm } },
              ],
            },
            select: {
              id: true,
              name: true,
              slug: true,
              game: true,
              bannerImage: true,
              version: true,
            },
            take: 5,
          })
        : Promise.resolve([]),

      // 6. Community Users
      (!category || category === "all" || category === "users")
        ? prisma.user.findMany({
            where: {
              OR: [
                { username: { contains: searchTerm } },
                { displayName: { contains: searchTerm } },
              ],
            },
            select: {
              id: true,
              username: true,
              displayName: true,
              image: true,
              role: {
                select: {
                  name: true,
                  color: true,
                },
              },
            },
            take: 6,
          })
        : Promise.resolve([]),
    ]);

    // Format snippet highlights for thread bodies
    const formattedThreads = threads.map((t) => {
      let snippet = "";
      if (t.body) {
        const cleanBody = t.body.replace(/[#*`_~[\]()]/g, " ").replace(/\s+/g, " ").trim();
        const matchIdx = cleanBody.toLowerCase().indexOf(searchTerm.toLowerCase());
        if (matchIdx >= 0) {
          const start = Math.max(0, matchIdx - 40);
          const end = Math.min(cleanBody.length, matchIdx + searchTerm.length + 60);
          snippet = (start > 0 ? "…" : "") + cleanBody.substring(start, end) + (end < cleanBody.length ? "…" : "");
        } else {
          snippet = cleanBody.substring(0, 90) + (cleanBody.length > 90 ? "…" : "");
        }
      }
      return {
        id: t.id,
        title: t.title,
        slug: t.slug,
        snippet,
        isPinned: t.isPinned,
        createdAt: t.createdAt,
        viewCount: t.viewCount,
        author: t.author,
        subcategory: t.subcategory,
        replyCount: t._count.replies,
      };
    });

    const totalCount =
      formattedThreads.length +
      articles.length +
      posts.length +
      maps.length +
      modpacks.length +
      users.length;

    return NextResponse.json({
      query: searchTerm,
      totalCount,
      threads: formattedThreads,
      articles,
      posts,
      maps,
      modpacks,
      users,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
