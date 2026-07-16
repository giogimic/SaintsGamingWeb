import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const { allowed } = rateLimit(`search:${getClientIp(req)}`, 10, 60_000); // 10 requests per minute
    if (!allowed) {
      return NextResponse.json({ message: "Too many search requests. Please slow down." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ threads: [], articles: [], modpacks: [], users: [] });
    }

    const searchTerm = query.trim();

    // Query all entities concurrently
    const [threads, articles, modpacks, users] = await Promise.all([
      prisma.thread.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm } },
            { body: { contains: searchTerm } },
          ],
        },
        select: { id: true, title: true, slug: true },
        take: 5,
      }),
      prisma.newsArticle.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: searchTerm } },
            { excerpt: { contains: searchTerm } },
          ],
        },
        select: { id: true, title: true, slug: true },
        take: 5,
      }),
      prisma.modpack.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm } },
            { description: { contains: searchTerm } },
          ],
        },
        select: { id: true, name: true, slug: true, game: true },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          username: { contains: searchTerm },
        },
        select: { id: true, username: true, image: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      threads,
      articles,
      modpacks,
      users,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
