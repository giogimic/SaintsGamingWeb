import { Navbar, Footer } from "@/components/shared/navbar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MessengerProvider } from "@/components/messenger/messenger-provider";
import { MessengerPopup } from "@/components/messenger/messenger-popup";
import { AmbientBackground } from "@/components/shared/ambient-background";
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

  let siteVersion = "v1.1.8";
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
    <div className="flex flex-col min-h-screen relative overflow-x-hidden selection:bg-primary/30">
      <AmbientBackground />
      <MessengerProvider>
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
            <Link href="/ucp/social" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              The Feed
            </Link>
          </div>
        </div>

        <main className="flex-1 sg-page-enter bg-background/50">{children}</main>
        <Footer discordLink={discordLink} siteVersion={siteVersion} showUcpLink={showUcpInNav} />
        <MessengerPopup />
      </MessengerProvider>
    </div>
  );
}
