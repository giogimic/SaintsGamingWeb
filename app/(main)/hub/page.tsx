import type { Metadata } from "next";
import { prisma } from "@/web/lib/prisma";
import { UnifiedHubView } from "@/web/components/hub/UnifiedHubView";

export const metadata: Metadata = {
  title: "The Nexus | Saints Hub",
  description: "Your central operations center for community announcements, official game modpacks, and dedicated 24/7 multiplayer servers.",
  openGraph: {
    title: "The Nexus | Saints Gaming Hub",
    description: "Your central operations center for community announcements, official game modpacks, and dedicated 24/7 multiplayer servers.",
    type: "website",
    url: "https://saintsgaming.net/hub",
    siteName: "Saints Gaming",
  },
};

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = (params.tab === "modpacks" || params.tab === "servers" || params.tab === "news")
    ? params.tab
    : "news";

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
