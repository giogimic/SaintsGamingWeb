import type { Metadata } from "next";
import { prisma } from "@/web/lib/prisma";
import { UnifiedHubView } from "@/web/components/hub/UnifiedHubView";
import { constructPageMetadata } from "@/web/lib/seo";

export const metadata: Metadata = constructPageMetadata({
  title: "News & Announcements",
  description: "Stay up to date with the latest Saints Gaming community news, updates, and events.",
  path: "/news",
});



export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = (params.tab === "modpacks" || params.tab === "servers") ? params.tab : "news";

  const [articles, modpacks] = await Promise.all([
    prisma.newsArticle.findMany({
      where: {
        isPublished: true,
        publishedAt: { lte: new Date() },
      },
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { username: true } } },
      take: 12,
    }),
    prisma.modpack.findMany({
      where: { status: "Active" },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <UnifiedHubView
      initialTab={initialTab}
      articles={articles as any}
      modpacks={modpacks as any}
    />
  );
}
