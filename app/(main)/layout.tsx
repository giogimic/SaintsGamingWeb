import { Navbar } from "@/shared/components/navbar";
import { GlobalBottomBar } from "@/shared/components/global-bottom-bar";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { MessengerProvider } from "@/web/components/messenger/messenger-provider";
import { MessengerPopup } from "@/web/components/messenger/messenger-popup";
import { AmbientBackground } from "@/shared/components/ambient-background";
import { Toaster } from "sonner";
import { AuthProvider } from "@/web/components/auth-provider";
import { RealtimeProvider } from "@/web/components/realtime/RealtimeProvider";
import { GlobalCommandPalette } from "@/web/components/command-palette/global-command-palette";
import { TooltipProvider } from "@/shared/ui/tooltip";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let dbPermissionLevel = undefined;
  let dbIsWriter = false;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true, isWriter: true }
    });
    if (dbUser) {
      dbPermissionLevel = dbUser.permissionLevel;
      dbIsWriter = Boolean(dbUser.isWriter);
    }
  }

  const discordSetting = await prisma.siteSetting.findUnique({
    where: { key: "DISCORD_INVITE_URL" }
  });
  const discordLink = discordSetting?.value || "https://discord.saintsgaming.net";

  let siteVersion = "";
  let showUcpInNav = false;
  try {
    const versionSetting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    siteVersion = versionSetting?.value || process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.536";

    const ucpNavSetting = await prisma.siteSetting.findUnique({ where: { key: "show_ucp_in_nav" } });
    if (ucpNavSetting?.value === "true") showUcpInNav = true;
  } catch {
    // defaults
  }

  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden selection:bg-primary/30 pb-10">
      <AmbientBackground />
      <AuthProvider session={session}>
        <TooltipProvider delay={200}>
          <RealtimeProvider>
            <MessengerProvider>
              <Navbar session={session} dbPermissionLevel={dbPermissionLevel} discordLink={discordLink} showUcpLink={showUcpInNav} siteVersion={siteVersion} />
              <main className="flex-1 sg-page-enter z-10 pt-14 sm:pt-16 pb-12">{children}</main>
              <GlobalCommandPalette permissionLevel={dbPermissionLevel ?? ((session?.user?.permissionLevel as number) || 0)} isWriter={dbIsWriter} />
              <MessengerPopup />
              <GlobalBottomBar dbPermissionLevel={dbPermissionLevel} siteVersion={siteVersion} />
              <Toaster position="bottom-right" theme="dark" />
            </MessengerProvider>
          </RealtimeProvider>
        </TooltipProvider>
      </AuthProvider>
    </div>
  );
}






