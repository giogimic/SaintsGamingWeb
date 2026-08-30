import type { Metadata } from "next";
import { prisma } from "@/web/lib/prisma";
import { UnifiedHubView } from "@/web/components/hub/UnifiedHubView";

export const metadata: Metadata = {
  title: "Modpacks | Saints Gaming",
  description: "Download and install official Saints Gaming modpacks and graphical enhancements.",
};

export default async function ModpacksPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const initialTab = (params.tab === "news" || params.tab === "servers") ? params.tab : "modpacks";

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
