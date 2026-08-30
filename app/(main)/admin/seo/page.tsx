import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { redirect } from "next/navigation";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { SeoManagerClient } from "./seo-manager-client";
import { getSitemapStats } from "./actions";

export const metadata = {
  title: "SEO Management & Search Engine Tools | Saints Gaming Admin",
  description: "Visual Google SERP simulator, meta tag customizer, robots.txt editor, and search engine verification hub.",
};

export default async function AdminSeoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!user || (user.permissionLevel < PERMISSION_LEVELS.ADMIN && !user.isWriter)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You do not have permission to access the SEO Management Suite.
      </div>
    );
  }

  const [settings, sitemapStats] = await Promise.all([
    prisma.siteSetting.findMany(),
    getSitemapStats(),
  ]);

  const configMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);

  const baseUrl =
    configMap["SEO_CANONICAL_URL"] ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.saintsgaming.net";

  return (
    <SeoManagerClient
      initialConfig={configMap}
      sitemapStats={sitemapStats}
      baseUrl={baseUrl}
    />
  );
}
