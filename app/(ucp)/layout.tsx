import { Navbar, Footer } from "@/components/shared/navbar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Car, Landmark, LayoutDashboard } from "lucide-react";

export default async function UcpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  let dbPermissionLevel = undefined;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });
    if (dbUser) {
      dbPermissionLevel = dbUser.permissionLevel;
    }
  }

  const discordSetting = await prisma.siteSetting.findUnique({
    where: { key: "DISCORD_INVITE_URL" }
  });
  const discordLink = discordSetting?.value || "https://discord.saintsgaming.net";

  let siteVersion = "v1.1.4";
  let showUcpInNav = false;
  try {
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    if (versionSetting) siteVersion = versionSetting.value;

    const ucpNavSetting = await prisma.siteSetting.findUnique({ where: { key: "show_ucp_in_nav" } });
    if (ucpNavSetting?.value === "true") showUcpInNav = true;
  } catch {
    // defaults
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar session={session} dbPermissionLevel={dbPermissionLevel} discordLink={discordLink} showUcpLink={showUcpInNav} />
      
      {/* UCP Secondary Navigation */}
      <div className="pt-24 border-b bg-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex gap-6 overflow-x-auto">
          <Link href="/ucp" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link href="/ucp/garage" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <Car className="h-4 w-4" />
            My Garage
          </Link>
          <Link href="/ucp/banking" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <Landmark className="h-4 w-4" />
            Banking
          </Link>
        </div>
      </div>

      <main className="flex-1 sg-page-enter bg-background/50">{children}</main>
      <Footer discordLink={discordLink} siteVersion={siteVersion} showUcpLink={showUcpInNav} />
    </div>
  );
}
