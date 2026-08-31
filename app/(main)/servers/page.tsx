import type { Metadata } from "next";
import { prisma } from "@/web/lib/prisma";
import { UnifiedHubView } from "@/web/components/hub/UnifiedHubView";

import { constructPageMetadata } from "@/web/lib/seo";

export const metadata: Metadata = constructPageMetadata({
  title: "Official Game Servers",
  description: "Join our massive 24/7 dedicated servers. Real-time stats and server status.",
  path: "/servers",
});


export default async function ServersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const initialTab = (params.tab === "news" || params.tab === "modpacks") ? params.tab : "servers";

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
